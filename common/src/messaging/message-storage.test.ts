/**
 * Tests for Message Storage
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { MessageStorage } from './message-storage.js';
import { MessageStatus, MessageDirection, QueuedMessage } from './types.js';

describe('MessageStorage', () => {
  const testDbPath = path.join(__dirname, 'test-storage.db');
  let storage: MessageStorage;

  const createTestMessage = (overrides: Partial<QueuedMessage> = {}): QueuedMessage => {
    const now = Date.now();
    return {
      id: 'test-id-' + Date.now(),
      direction: MessageDirection.OUTBOUND,
      status: MessageStatus.PENDING,
      message: 'test message content',
      to: 'did:peer:recipient',
      createdAt: now,
      updatedAt: now,
      expiresAt: now + 60000,
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: now,
      ...overrides,
    };
  };

  beforeEach(() => {
    // Clean up old test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    storage = new MessageStorage({ dbPath: testDbPath });
  });

  afterEach(() => {
    if (storage) {
      storage.close();
    }

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('constructor', () => {
    it('should create database with correct schema', () => {
      expect(storage).toBeDefined();
    });

    it('should support readonly mode', () => {
      storage.close();
      storage = new MessageStorage({ dbPath: testDbPath, readonly: true });
      expect(storage).toBeDefined();
      storage.close();
    });
  });

  describe('store', () => {
    it('should store a message', () => {
      const message = createTestMessage();
      storage.store(message);

      const retrieved = storage.get(message.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(message.id);
      expect(retrieved!.message).toBe(message.message);
    });

    it('should store message with all fields', () => {
      const message = createTestMessage({
        from: 'did:peer:sender',
        metadata: { key: 'value' },
        lastError: 'previous error',
        sentAt: Date.now(),
        deliveredAt: Date.now(),
      });

      storage.store(message);

      const retrieved = storage.get(message.id);
      expect(retrieved!.from).toBe(message.from);
      expect(retrieved!.metadata).toEqual(message.metadata);
      expect(retrieved!.lastError).toBe(message.lastError);
      expect(retrieved!.sentAt).toBe(message.sentAt);
      expect(retrieved!.deliveredAt).toBe(message.deliveredAt);
    });
  });

  describe('get', () => {
    it('should retrieve stored message', () => {
      const message = createTestMessage();
      storage.store(message);

      const retrieved = storage.get(message.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(message.id);
    });

    it('should return null for non-existent message', () => {
      const retrieved = storage.get('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update message status', () => {
      const message = createTestMessage();
      storage.store(message);

      storage.updateStatus(message.id, MessageStatus.SENT);

      const retrieved = storage.get(message.id);
      expect(retrieved!.status).toBe(MessageStatus.SENT);
      expect(retrieved!.sentAt).toBeDefined();
    });

    it('should update status to delivered', () => {
      const message = createTestMessage();
      storage.store(message);

      storage.updateStatus(message.id, MessageStatus.DELIVERED);

      const retrieved = storage.get(message.id);
      expect(retrieved!.status).toBe(MessageStatus.DELIVERED);
      expect(retrieved!.deliveredAt).toBeDefined();
    });

    it('should store error message', () => {
      const message = createTestMessage();
      storage.store(message);

      storage.updateStatus(message.id, MessageStatus.FAILED, 'Test error');

      const retrieved = storage.get(message.id);
      expect(retrieved!.status).toBe(MessageStatus.FAILED);
      expect(retrieved!.lastError).toBe('Test error');
    });
  });

  describe('incrementRetry', () => {
    it('should increment retry count', () => {
      const message = createTestMessage();
      storage.store(message);

      const nextRetryAt = Date.now() + 1000;
      storage.incrementRetry(message.id, nextRetryAt, 'Retry error');

      const retrieved = storage.get(message.id);
      expect(retrieved!.retryCount).toBe(1);
      expect(retrieved!.nextRetryAt).toBe(nextRetryAt);
      expect(retrieved!.lastError).toBe('Retry error');
    });

    it('should increment retry count multiple times', () => {
      const message = createTestMessage();
      storage.store(message);

      storage.incrementRetry(message.id, Date.now() + 1000);
      storage.incrementRetry(message.id, Date.now() + 2000);
      storage.incrementRetry(message.id, Date.now() + 3000);

      const retrieved = storage.get(message.id);
      expect(retrieved!.retryCount).toBe(3);
    });
  });

  describe('incrementRetry without error', () => {
    it('should increment retry without error message', () => {
      const message = createTestMessage();
      storage.store(message);

      const nextRetryAt = Date.now() + 5000;
      storage.incrementRetry(message.id, nextRetryAt);

      const retrieved = storage.get(message.id);
      expect(retrieved!.retryCount).toBe(1);
      expect(retrieved!.nextRetryAt).toBe(nextRetryAt);
    });
  });

  describe('delete', () => {
    it('should delete a message', () => {
      const message = createTestMessage();
      storage.store(message);

      storage.delete(message.id);

      const retrieved = storage.get(message.id);
      expect(retrieved).toBeNull();
    });

    it('should not throw on deleting non-existent message', () => {
      expect(() => storage.delete('non-existent-id')).not.toThrow();
    });
  });

  describe('query', () => {
    it('should query by status', () => {
      storage.store(createTestMessage({ id: 'msg1', status: MessageStatus.PENDING }));
      storage.store(createTestMessage({ id: 'msg2', status: MessageStatus.SENT }));
      
      const pending = storage.query({ status: MessageStatus.PENDING });
      expect(pending.length).toBe(1);
      expect(pending[0].status).toBe(MessageStatus.PENDING);
    });

    it('should query by direction', () => {
      storage.store(createTestMessage({ direction: MessageDirection.INBOUND, from: 'did:peer:sender' }));
      storage.store(createTestMessage({ direction: MessageDirection.OUTBOUND }));
      
      const inbound = storage.query({ direction: MessageDirection.INBOUND });
      expect(inbound.length).toBe(1);
      expect(inbound[0].direction).toBe(MessageDirection.INBOUND);
    });

    it('should query by to', () => {
      storage.store(createTestMessage({ id: 'to1', to: 'did:peer:recipient1' }));
      storage.store(createTestMessage({ id: 'to2', to: 'did:peer:recipient2' }));
      storage.store(createTestMessage({ id: 'to3', to: 'did:peer:recipient3' }));
      
      const messages = storage.query({ to: 'did:peer:recipient2' });
      expect(messages.length).toBe(1);
      expect(messages[0].id).toBe('to2');
    });

    it('should query by from', () => {
      storage.store(createTestMessage({ direction: MessageDirection.INBOUND, from: 'did:peer:sender1' }));
      storage.store(createTestMessage({ direction: MessageDirection.INBOUND, from: 'did:peer:sender2' }));
      
      const messages = storage.query({ from: 'did:peer:sender1' });
      expect(messages.length).toBe(1);
      expect(messages[0].from).toBe('did:peer:sender1');
    });

    it('should respect query limit', () => {
      storage.store(createTestMessage({ id: 'q1' }));
      storage.store(createTestMessage({ id: 'q2' }));
      storage.store(createTestMessage({ id: 'q3' }));
      
      const messages = storage.query({ limit: 2 });
      expect(messages.length).toBe(2);
    });

    it('should query with multiple criteria', () => {
      storage.store(createTestMessage({
        id: 'multi1',
        status: MessageStatus.PENDING,
        direction: MessageDirection.OUTBOUND,
      }));
      storage.store(createTestMessage({
        id: 'multi2',
        status: MessageStatus.SENT,
        direction: MessageDirection.OUTBOUND,
      }));
      
      const messages = storage.query({
        status: MessageStatus.PENDING,
        direction: MessageDirection.OUTBOUND,
      });
      expect(messages.length).toBe(1);
      expect(messages[0].id).toBe('multi1');
    });

    it('should return empty array when no matches', () => {
      const messages = storage.query({ status: MessageStatus.PROCESSING });
      expect(messages).toEqual([]);
    });
  });

  describe('getMessagesForRetry', () => {
    it('should get messages ready for retry', () => {
      const now = Date.now();
      storage.store(createTestMessage({
        id: 'retry1',
        status: MessageStatus.PENDING,
        nextRetryAt: now - 1000, // Past
      }));
      storage.store(createTestMessage({
        id: 'retry2',
        status: MessageStatus.PENDING,
        nextRetryAt: now + 10000, // Future
      }));

      const pending = storage.getMessagesForRetry();
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending[0].id).toBe('retry1');
    });
  });

  describe('getAll', () => {
    it('should get all messages', () => {
      storage.store(createTestMessage({ id: 'msg1' }));
      storage.store(createTestMessage({ id: 'msg2' }));
      storage.store(createTestMessage({ id: 'msg3' }));

      const all = storage.getAll();
      expect(all.length).toBe(3);
    });

    it('should respect limit', () => {
      storage.store(createTestMessage({ id: 'msg1' }));
      storage.store(createTestMessage({ id: 'msg2' }));
      storage.store(createTestMessage({ id: 'msg3' }));

      const limited = storage.getAll(2);
      expect(limited.length).toBe(2);
    });
  });

  describe('getCount', () => {
    it('should count messages by status', () => {
      storage.store(createTestMessage({ id: 'msg1', status: MessageStatus.PENDING }));
      storage.store(createTestMessage({ id: 'msg2', status: MessageStatus.PENDING }));
      storage.store(createTestMessage({ id: 'msg3', status: MessageStatus.SENT }));

      const pendingCount = storage.getCount(MessageStatus.PENDING);
      const sentCount = storage.getCount(MessageStatus.SENT);

      expect(pendingCount).toBe(2);
      expect(sentCount).toBe(1);
    });

    it('should return 0 for non-existent status', () => {
      const count = storage.getCount(MessageStatus.PROCESSING);
      expect(count).toBe(0);
    });

    it('should count all messages when no status provided', () => {
      storage.store(createTestMessage({ status: MessageStatus.PENDING }));
      storage.store(createTestMessage({ status: MessageStatus.SENT }));
      storage.store(createTestMessage({ status: MessageStatus.DELIVERED }));

      const total = storage.getCount();
      expect(total).toBe(3);
    });
  });

  describe('deleteExpired', () => {
    it('should mark expired messages but not delete recent ones', () => {
      const now = Date.now();
      storage.store(createTestMessage({
        id: 'expired1',
        expiresAt: now - 1000,
        status: MessageStatus.DELIVERED,
      }));
      storage.store(createTestMessage({
        id: 'expired2',
        expiresAt: now - 2000,
        status: MessageStatus.FAILED,
      }));
      storage.store(createTestMessage({
        id: 'notexpired',
        expiresAt: now + 10000,
      }));

      // deleteExpired marks messages as expired, but only deletes those expired > 7 days
      const deleted = storage.deleteExpired();
      expect(deleted).toBe(0); // Nothing deleted yet (not old enough)

      // Check that expired messages were marked as EXPIRED
      const msg1 = storage.get('expired1');
      const msg2 = storage.get('expired2');
      expect(msg1!.status).toBe(MessageStatus.EXPIRED);
      expect(msg2!.status).toBe(MessageStatus.EXPIRED);
    });

    it('should return 0 when no expired messages', () => {
      const now = Date.now();
      storage.store(createTestMessage({ expiresAt: now + 10000 }));

      const deleted = storage.deleteExpired();
      expect(deleted).toBe(0);
    });
  });

  describe('deleteOldDelivered', () => {
    it('should delete old delivered messages', () => {
      const now = Date.now();
      const oldTime = now - 10000;
      
      storage.store(createTestMessage({
        id: 'old1',
        status: MessageStatus.DELIVERED,
        deliveredAt: oldTime,
      }));
      storage.store(createTestMessage({
        id: 'old2',
        status: MessageStatus.DELIVERED,
        deliveredAt: oldTime,
      }));
      storage.store(createTestMessage({
        id: 'recent',
        status: MessageStatus.DELIVERED,
        deliveredAt: now,
      }));

      const deleted = storage.deleteOldDelivered(now - 5000);
      expect(deleted).toBe(2);

      const remaining = storage.query({});
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('recent');
    });

    it('should return 0 when no old messages', () => {
      const now = Date.now();
      storage.store(createTestMessage({
        status: MessageStatus.DELIVERED,
        deliveredAt: now,
      }));

      const deleted = storage.deleteOldDelivered(now - 1000);
      expect(deleted).toBe(0);
    });
  });

  describe('close', () => {
    it('should close the database', () => {
      expect(() => storage.close()).not.toThrow();
    });

    it('should allow reopening after close', () => {
      storage.close();
      const newStorage = new MessageStorage({ dbPath: testDbPath });
      expect(newStorage).toBeDefined();
      newStorage.close();
    });
  });

  describe('data persistence', () => {
    it('should persist data across database instances', () => {
      const message = createTestMessage();
      storage.store(message);
      storage.close();

      const newStorage = new MessageStorage({ dbPath: testDbPath });
      const retrieved = newStorage.get(message.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(message.id);

      newStorage.close();
    });
  });
});

