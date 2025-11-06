/**
 * Tests for Message Queue
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { MessageStorage } from './message-storage.js';
import { MessageQueue } from './message-queue.js';
import { MessageStatus, MessageDirection } from './types.js';

describe('MessageQueue', () => {
  const testDbPath = path.join(__dirname, 'test-queue.db');
  let storage: MessageStorage;
  let queue: MessageQueue;

  beforeEach(() => {
    // Clean up old test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    storage = new MessageStorage({ dbPath: testDbPath });
    queue = new MessageQueue(storage, {
      maxRetries: 3,
      initialRetryDelay: 100,
      autoProcessInterval: 1000,
      autoCleanup: false, // Disable for tests
    });
  });

  afterEach(() => {
    if (queue) {
      queue.close();
    }
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('enqueueOutbound', () => {
    it('should enqueue an outbound message', async () => {
      const id = await queue.enqueueOutbound('test-message', 'did:peer:recipient');

      expect(id).toBeDefined();

      const message = queue.getMessage(id);
      expect(message).toBeDefined();
      expect(message!.status).toBe(MessageStatus.PENDING);
      expect(message!.direction).toBe(MessageDirection.OUTBOUND);
      expect(message!.to).toBe('did:peer:recipient');
    });

    it('should respect max queue size', async () => {
      const smallQueue = new MessageQueue(storage, { maxQueueSize: 2 });

      await smallQueue.enqueueOutbound('msg1', 'recipient1');
      await smallQueue.enqueueOutbound('msg2', 'recipient2');

      await expect(
        smallQueue.enqueueOutbound('msg3', 'recipient3')
      ).rejects.toThrow('Message queue is full');
    });
  });

  describe('enqueueInbound', () => {
    it('should enqueue an inbound message', async () => {
      const id = await queue.enqueueInbound('test-message', 'did:peer:sender');

      const message = queue.getMessage(id);
      expect(message).toBeDefined();
      expect(message!.status).toBe(MessageStatus.PENDING);
      expect(message!.direction).toBe(MessageDirection.INBOUND);
      expect(message!.from).toBe('did:peer:sender');
    });
  });

  describe('markAsSent', () => {
    it('should mark message as sent', async () => {
      const id = await queue.enqueueOutbound('test-message', 'recipient');

      queue.markAsSent(id);

      const message = queue.getMessage(id);
      expect(message!.status).toBe(MessageStatus.SENT);
      expect(message!.sentAt).toBeDefined();
    });
  });

  describe('markAsDelivered', () => {
    it('should mark message as delivered', async () => {
      const id = await queue.enqueueOutbound('test-message', 'recipient');

      queue.markAsDelivered(id);

      const message = queue.getMessage(id);
      expect(message!.status).toBe(MessageStatus.DELIVERED);
      expect(message!.deliveredAt).toBeDefined();
    });
  });

  describe('markAsFailed', () => {
    it('should schedule retry on failure', async () => {
      const id = await queue.enqueueOutbound('test-message', 'recipient');

      await queue.markAsFailed(id, 'Test error');

      const message = queue.getMessage(id);
      expect(message!.status).toBe(MessageStatus.PENDING);
      expect(message!.retryCount).toBe(1);
      expect(message!.nextRetryAt).toBeDefined();
      expect(message!.lastError).toBe('Test error');
    });

    it('should mark as failed after max retries', async () => {
      const id = await queue.enqueueOutbound('test-message', 'recipient', { maxRetries: 2 });

      await queue.markAsFailed(id, 'Error 1');
      await queue.markAsFailed(id, 'Error 2');
      await queue.markAsFailed(id, 'Error 3');

      const message = queue.getMessage(id);
      expect(message!.status).toBe(MessageStatus.FAILED);
      expect(message!.retryCount).toBe(2);
    });
  });

  describe('queryMessages', () => {
    it('should query messages by status', async () => {
      await queue.enqueueOutbound('msg1', 'recipient1');
      const id2 = await queue.enqueueOutbound('msg2', 'recipient2');
      await queue.enqueueOutbound('msg3', 'recipient3');

      queue.markAsDelivered(id2);

      const pending = queue.queryMessages({ status: MessageStatus.PENDING });
      const delivered = queue.queryMessages({ status: MessageStatus.DELIVERED });

      expect(pending.length).toBe(2);
      expect(delivered.length).toBe(1);
    });

    it('should query messages by direction', async () => {
      await queue.enqueueOutbound('msg1', 'recipient');
      await queue.enqueueInbound('msg2', 'sender');

      const outbound = queue.queryMessages({ direction: MessageDirection.OUTBOUND });
      const inbound = queue.queryMessages({ direction: MessageDirection.INBOUND });

      expect(outbound.length).toBe(1);
      expect(inbound.length).toBe(1);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      await queue.enqueueOutbound('msg1', 'recipient1');
      const id2 = await queue.enqueueOutbound('msg2', 'recipient2');
      const id3 = await queue.enqueueOutbound('msg3', 'recipient3');

      queue.markAsDelivered(id2);
      await queue.markAsFailed(id3, 'Error');
      await queue.markAsFailed(id3, 'Error');
      await queue.markAsFailed(id3, 'Error');
      await queue.markAsFailed(id3, 'Error');

      const stats = queue.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.delivered).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe('start and stop', () => {
    it('should start auto-processing', () => {
      const autoQueue = new MessageQueue(storage, {
        autoProcessInterval: 100,
        autoCleanup: true,
        cleanupInterval: 200,
      });

      autoQueue.start();
      // Start should be idempotent
      autoQueue.start();

      autoQueue.stop();
      autoQueue.close();
    });

    it('should stop auto-processing', () => {
      queue.start();
      queue.stop();
      // Stop should be idempotent
      queue.stop();
    });
  });

  describe('immediate processing', () => {
    it('should mark as processing when immediate flag is set', async () => {
      const id = await queue.enqueueOutbound('test-message', 'recipient', {
        immediate: true,
      });

      const message = queue.getMessage(id);
      expect(message!.status).toBe(MessageStatus.PROCESSING);
    });
  });

  describe('expiration', () => {
    it('should set custom expiration time', async () => {
      const expiresIn = 5000;
      const id = await queue.enqueueOutbound('test-message', 'recipient', {
        expiresIn,
      });

      const message = queue.getMessage(id);
      expect(message!.expiresAt).toBeDefined();
      expect(message!.expiresAt! - message!.createdAt).toBeGreaterThanOrEqual(expiresIn - 10);
    });
  });

  describe('metadata', () => {
    it('should store message metadata', async () => {
      const metadata = { correlationId: '123', priority: 'high' };
      const id = await queue.enqueueOutbound('test-message', 'recipient', {
        metadata,
      });

      const message = queue.getMessage(id);
      expect(message!.metadata).toEqual(metadata);
    });

    it('should store metadata for inbound messages', async () => {
      const metadata = { source: 'external-api' };
      const id = await queue.enqueueInbound('test-message', 'sender', metadata);

      const message = queue.getMessage(id);
      expect(message!.metadata).toEqual(metadata);
    });
  });

  describe('query by from', () => {
    it('should query messages by from', async () => {
      await queue.enqueueInbound('msg1', 'did:peer:sender1');
      await queue.enqueueInbound('msg2', 'did:peer:sender2');

      const messages = queue.queryMessages({ from: 'did:peer:sender1' });
      expect(messages.length).toBe(1);
      expect(messages[0].from).toBe('did:peer:sender1');
    });
  });

  describe('retry behavior', () => {
    it('should handle retry scheduling', async () => {
      const id = await queue.enqueueOutbound('test-message', 'recipient');
      await queue.markAsFailed(id, 'Error');

      const message = queue.getMessage(id);
      expect(message!.status).toBe(MessageStatus.PENDING);
      expect(message!.nextRetryAt).toBeGreaterThan(Date.now());
    });
  });

  describe('expired messages', () => {
    it('should handle expired messages', async () => {
      const id = await queue.enqueueOutbound('test-message', 'recipient', {
        expiresIn: 100,
      });

      queue.markAsDelivered(id);

      const message = queue.getMessage(id);
      expect(message).toBeDefined();
      expect(message!.expiresAt).toBeDefined();
    });
  });

  describe('getMessage', () => {
    it('should return null for non-existent message', () => {
      const message = queue.getMessage('non-existent-id');
      expect(message).toBeNull();
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      const id = await queue.enqueueOutbound('test-message', 'recipient');

      queue.deleteMessage(id);

      const message = queue.getMessage(id);
      expect(message).toBeNull();
    });
  });

  describe('queryMessages with limit', () => {
    it('should respect query limit', async () => {
      await queue.enqueueOutbound('msg1', 'recipient');
      await queue.enqueueOutbound('msg2', 'recipient');
      await queue.enqueueOutbound('msg3', 'recipient');

      const messages = queue.queryMessages({ limit: 2 });
      expect(messages.length).toBe(2);
    });
  });
});

