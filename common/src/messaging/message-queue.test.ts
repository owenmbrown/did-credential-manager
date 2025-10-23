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
    queue.close();
    
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
});

