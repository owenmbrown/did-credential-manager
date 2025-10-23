/**
 * Message Queue Manager
 * 
 * Handles message queuing, retry logic, and delivery
 * 
 * @module messaging/message-queue
 */

import { v4 as uuidv4 } from 'uuid';
import { MessageStorage } from './message-storage.js';
import {
  QueuedMessage,
  MessageStatus,
  MessageDirection,
  MessageQueueConfig,
  SendMessageOptions,
  MessageQuery,
} from './types.js';
import logger from '../utils/logger.js';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<MessageQueueConfig> = {
  maxQueueSize: 10000,
  messageTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxRetries: 3,
  initialRetryDelay: 1000, // 1 second
  maxRetryDelay: 60000, // 1 minute
  retryBackoffMultiplier: 2,
  autoProcessInterval: 5000, // 5 seconds
  autoCleanup: true,
  cleanupInterval: 60000, // 1 minute
};

/**
 * Message Queue Manager
 */
export class MessageQueue {
  private storage: MessageStorage;
  private config: Required<MessageQueueConfig>;
  private processInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private processing = false;

  constructor(
    storage: MessageStorage,
    config: MessageQueueConfig = {}
  ) {
    this.storage = storage;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start auto-processing
   */
  start(): void {
    if (this.processInterval) {
      return; // Already started
    }

    // Start retry processing
    this.processInterval = setInterval(() => {
      this.processRetries().catch(error => {
        logger.error('Error processing retries:', error);
      });
    }, this.config.autoProcessInterval);

    // Start cleanup
    if (this.config.autoCleanup) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup().catch(error => {
          logger.error('Error during cleanup:', error);
        });
      }, this.config.cleanupInterval);
    }

    logger.info('Message queue started');
  }

  /**
   * Stop auto-processing
   */
  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    logger.info('Message queue stopped');
  }

  /**
   * Enqueue an outbound message
   */
  async enqueueOutbound(
    message: string,
    to: string,
    options: SendMessageOptions = {}
  ): Promise<string> {
    const id = uuidv4();
    const now = Date.now();

    // Check queue size
    const queueSize = this.storage.getCount(MessageStatus.PENDING);
    if (queueSize >= this.config.maxQueueSize) {
      throw new Error('Message queue is full');
    }

    const queuedMessage: QueuedMessage = {
      id,
      direction: MessageDirection.OUTBOUND,
      status: MessageStatus.PENDING,
      message,
      to,
      createdAt: now,
      updatedAt: now,
      expiresAt: options.expiresIn ? now + options.expiresIn : now + this.config.messageTTL,
      retryCount: 0,
      maxRetries: options.maxRetries ?? this.config.maxRetries,
      nextRetryAt: now, // Ready for immediate processing
      metadata: options.metadata,
    };

    this.storage.store(queuedMessage);

    logger.info('Message enqueued', { id, to });

    // Process immediately if requested
    if (options.immediate) {
      // Note: Actual sending would be handled by the caller
      this.storage.updateStatus(id, MessageStatus.PROCESSING);
    }

    return id;
  }

  /**
   * Enqueue an inbound message
   */
  async enqueueInbound(
    message: string,
    from?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const id = uuidv4();
    const now = Date.now();

    const queuedMessage: QueuedMessage = {
      id,
      direction: MessageDirection.INBOUND,
      status: MessageStatus.PENDING,
      message,
      from,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: 0, // Inbound messages don't retry
      metadata,
    };

    this.storage.store(queuedMessage);

    logger.info('Inbound message enqueued', { id, from });

    return id;
  }

  /**
   * Mark message as sent
   */
  markAsSent(id: string): void {
    this.storage.updateStatus(id, MessageStatus.SENT);
    logger.info('Message marked as sent', { id });
  }

  /**
   * Mark message as delivered
   */
  markAsDelivered(id: string): void {
    this.storage.updateStatus(id, MessageStatus.DELIVERED);
    logger.info('Message marked as delivered', { id });
  }

  /**
   * Mark message as failed and schedule retry
   */
  async markAsFailed(id: string, error: string): Promise<void> {
    const message = this.storage.get(id);
    if (!message) {
      logger.warn('Message not found for failure', { id });
      return;
    }

    if (message.retryCount >= message.maxRetries) {
      // Max retries exceeded
      this.storage.updateStatus(id, MessageStatus.FAILED, error);
      logger.error('Message failed after max retries', { id, error });
      return;
    }

    // Calculate next retry time with exponential backoff
    const delay = Math.min(
      this.config.initialRetryDelay * Math.pow(
        this.config.retryBackoffMultiplier,
        message.retryCount
      ),
      this.config.maxRetryDelay
    );

    const nextRetryAt = Date.now() + delay;

    this.storage.incrementRetry(id, nextRetryAt, error);
    logger.warn('Message scheduled for retry', {
      id,
      retryCount: message.retryCount + 1,
      nextRetryAt: new Date(nextRetryAt).toISOString(),
    });
  }

  /**
   * Process retry queue
   */
  private async processRetries(): Promise<void> {
    if (this.processing) {
      return; // Already processing
    }

    this.processing = true;

    try {
      const messages = this.storage.getMessagesForRetry();

      if (messages.length > 0) {
        logger.info('Processing retry queue', { count: messages.length });

        for (const message of messages) {
          // Mark as processing
          this.storage.updateStatus(message.id, MessageStatus.PROCESSING);
          
          // Note: Actual retry logic would be handled by the agent
          // The agent should poll for PROCESSING messages and handle them
        }
      }
    } catch (error) {
      logger.error('Error processing retries:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Cleanup old and expired messages
   */
  private async cleanup(): Promise<void> {
    try {
      // Delete expired messages
      const expiredCount = this.storage.deleteExpired();
      if (expiredCount > 0) {
        logger.info('Cleaned up expired messages', { count: expiredCount });
      }

      // Delete old delivered messages (older than 7 days)
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const deliveredCount = this.storage.deleteOldDelivered(sevenDaysAgo);
      if (deliveredCount > 0) {
        logger.info('Cleaned up old delivered messages', { count: deliveredCount });
      }
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  /**
   * Get message by ID
   */
  getMessage(id: string): QueuedMessage | null {
    return this.storage.get(id);
  }

  /**
   * Query messages
   */
  queryMessages(filters: MessageQuery): QueuedMessage[] {
    return this.storage.query(filters);
  }

  /**
   * Get messages pending processing
   */
  getPendingMessages(limit = 10): QueuedMessage[] {
    return this.storage.query({
      status: [MessageStatus.PENDING, MessageStatus.PROCESSING],
      direction: MessageDirection.OUTBOUND,
      limit,
    });
  }

  /**
   * Get inbound messages to process
   */
  getInboundMessages(limit = 10): QueuedMessage[] {
    return this.storage.query({
      status: MessageStatus.PENDING,
      direction: MessageDirection.INBOUND,
      limit,
    });
  }

  /**
   * Delete a message
   */
  deleteMessage(id: string): boolean {
    return this.storage.delete(id);
  }

  /**
   * Get queue statistics
   */
  getStatistics(): {
    total: number;
    pending: number;
    processing: number;
    sent: number;
    delivered: number;
    failed: number;
    expired: number;
  } {
    return {
      total: this.storage.getCount(),
      pending: this.storage.getCount(MessageStatus.PENDING),
      processing: this.storage.getCount(MessageStatus.PROCESSING),
      sent: this.storage.getCount(MessageStatus.SENT),
      delivered: this.storage.getCount(MessageStatus.DELIVERED),
      failed: this.storage.getCount(MessageStatus.FAILED),
      expired: this.storage.getCount(MessageStatus.EXPIRED),
    };
  }

  /**
   * Close the queue
   */
  close(): void {
    this.stop();
    this.storage.close();
  }
}

