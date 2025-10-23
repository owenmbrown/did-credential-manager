/**
 * Agent Integration Helper
 * 
 * Provides utilities for integrating message queue with agents
 * 
 * @module messaging/agent-integration
 */

import { MessageStorage } from './message-storage.js';
import { MessageQueue } from './message-queue.js';
import { MessageRouter } from './protocol-handler.js';
import { MessageQueueConfig } from './types.js';
import logger from '../utils/logger.js';

/**
 * Integrated messaging system for agents
 */
export class AgentMessaging {
  public storage: MessageStorage;
  public queue: MessageQueue;
  public router: MessageRouter;

  constructor(
    dbPath: string,
    config?: MessageQueueConfig
  ) {
    this.storage = new MessageStorage({ dbPath });
    this.queue = new MessageQueue(this.storage, config);
    this.router = new MessageRouter();
  }

  /**
   * Start the messaging system
   */
  start(): void {
    this.queue.start();
    logger.info('Agent messaging system started');
  }

  /**
   * Stop the messaging system
   */
  stop(): void {
    this.queue.stop();
    logger.info('Agent messaging system stopped');
  }

  /**
   * Close and cleanup
   */
  close(): void {
    this.queue.close();
    logger.info('Agent messaging system closed');
  }

  /**
   * Send a message (enqueue outbound)
   */
  async sendMessage(
    packedMessage: string,
    to: string,
    options?: { maxRetries?: number; expiresIn?: number; immediate?: boolean }
  ): Promise<string> {
    return this.queue.enqueueOutbound(packedMessage, to, options);
  }

  /**
   * Receive a message (enqueue inbound)
   */
  async receiveMessage(
    packedMessage: string,
    from?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.queue.enqueueInbound(packedMessage, from, metadata);
  }

  /**
   * Process inbound messages
   * 
   * This should be called periodically by the agent
   */
  async processInbound(limit = 10): Promise<number> {
    const messages = this.queue.getInboundMessages(limit);
    let processed = 0;

    for (const queuedMessage of messages) {
      try {
        // Parse the packed message
        const message = JSON.parse(queuedMessage.message);

        // Route to handler
        await this.router.route(message, {
          from: queuedMessage.from,
          to: queuedMessage.to,
          threadId: queuedMessage.threadId,
        });

        // Mark as delivered
        this.queue.markAsDelivered(queuedMessage.id);
        processed++;
      } catch (error) {
        logger.error('Error processing inbound message', {
          id: queuedMessage.id,
          error: error instanceof Error ? error.message : String(error),
        });

        // Mark as failed (inbound messages don't retry)
        await this.queue.markAsFailed(
          queuedMessage.id,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    return processed;
  }

  /**
   * Get queue statistics
   */
  getStatistics() {
    return this.queue.getStatistics();
  }
}

