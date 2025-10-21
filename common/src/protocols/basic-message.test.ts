/**
 * Tests for Basic Message Protocol
 */

import { describe, it, expect } from '@jest/globals';
import { BasicMessageProtocol, type BasicMessage } from './basic-message.js';

describe('BasicMessageProtocol', () => {
  const senderDid = 'did:peer:sender';
  const recipientDid = 'did:peer:recipient';

  describe('createMessage', () => {
    it('should create a valid basic message', () => {
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Hello, World!',
      });

      expect(message['@type']).toBe('https://didcomm.org/basicmessage/2.0/message');
      expect(message['@id']).toBeDefined();
      expect(message.from).toBe(senderDid);
      expect(message.to).toEqual([recipientDid]);
      expect(message.body.content).toBe('Hello, World!');
      expect(message.body.locale).toBe('en');
      expect(message.created_time).toBeDefined();
    });

    it('should support custom locale', () => {
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Hola, Mundo!',
        locale: 'es',
      });

      expect(message.body.locale).toBe('es');
    });

    it('should support multiple recipients', () => {
      const recipients = ['did:peer:1', 'did:peer:2'];
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipients,
        content: 'Broadcast message',
      });

      expect(message.to).toEqual(recipients);
    });

    it('should set expiration time when TTL is provided', () => {
      const ttl = 3600; // 1 hour
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Expiring message',
        ttl,
      });

      expect(message.expires_time).toBeDefined();
      expect(message.expires_time).toBeGreaterThan(message.created_time!);
    });

    it('should support thread ID for conversations', () => {
      const threadId = 'conversation-123';
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Reply in thread',
        threadId,
      });

      expect(message.thid).toBe(threadId);
    });
  });

  describe('createReply', () => {
    it('should create a reply to an existing message', () => {
      const originalMessage = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Original message',
      });

      const reply = BasicMessageProtocol.createReply(originalMessage, {
        from: recipientDid,
        content: 'Reply message',
      });

      expect(reply.thid).toBe(originalMessage['@id']);
      expect(reply.to).toEqual([senderDid]);
      expect(reply.body.content).toBe('Reply message');
    });

    it('should preserve thread ID when replying to threaded message', () => {
      const threadId = 'conversation-456';
      const originalMessage = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Threaded message',
        threadId,
      });

      const reply = BasicMessageProtocol.createReply(originalMessage, {
        from: recipientDid,
        content: 'Reply',
      });

      expect(reply.thid).toBe(threadId);
    });

    it('should throw when original message has no sender', () => {
      const invalidMessage: any = {
        '@type': 'https://didcomm.org/basicmessage/2.0/message',
        '@id': 'test-id',
        body: { content: 'Test' },
      };

      expect(() => {
        BasicMessageProtocol.createReply(invalidMessage, {
          from: recipientDid,
          content: 'Reply',
        });
      }).toThrow('Cannot reply: original message has no sender');
    });
  });

  describe('validateMessage', () => {
    it('should validate a valid message', () => {
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Valid message',
      });

      expect(() => {
        BasicMessageProtocol.validateMessage(message);
      }).not.toThrow();
    });

    it('should throw for message without @type', () => {
      const invalid = { '@id': 'test', body: { content: 'Test' } };

      expect(() => {
        BasicMessageProtocol.validateMessage(invalid);
      }).toThrow('missing @type or @id');
    });

    it('should throw for message with wrong @type', () => {
      const invalid = {
        '@type': 'https://didcomm.org/wrong/1.0/message',
        '@id': 'test',
        body: { content: 'Test' },
      };

      expect(() => {
        BasicMessageProtocol.validateMessage(invalid);
      }).toThrow('not a Basic Message 2.0');
    });

    it('should throw for message without content', () => {
      const invalid = {
        '@type': 'https://didcomm.org/basicmessage/2.0/message',
        '@id': 'test',
        body: {},
      };

      expect(() => {
        BasicMessageProtocol.validateMessage(invalid);
      }).toThrow('missing body.content');
    });

    it('should throw for expired message', () => {
      const expired: BasicMessage = {
        '@type': 'https://didcomm.org/basicmessage/2.0/message',
        '@id': 'test-id',
        from: senderDid,
        to: [recipientDid],
        body: {
          content: 'Expired message',
        },
        created_time: Date.now() - 7200000, // 2 hours ago
        expires_time: Date.now() - 3600000, // 1 hour ago
      };

      expect(() => {
        BasicMessageProtocol.validateMessage(expired);
      }).toThrow('Message has expired');
    });
  });

  describe('isExpired', () => {
    it('should return false for message without expiration', () => {
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'No expiration',
      });

      expect(BasicMessageProtocol.isExpired(message)).toBe(false);
    });

    it('should return false for message not yet expired', () => {
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Future expiration',
        ttl: 3600, // 1 hour
      });

      expect(BasicMessageProtocol.isExpired(message)).toBe(false);
    });

    it('should return true for expired message', () => {
      const message: BasicMessage = {
        '@type': 'https://didcomm.org/basicmessage/2.0/message',
        '@id': 'test-id',
        from: senderDid,
        to: [recipientDid],
        body: { content: 'Expired' },
        expires_time: Date.now() - 1000, // Expired 1 second ago
      };

      expect(BasicMessageProtocol.isExpired(message)).toBe(true);
    });
  });

  describe('getContent', () => {
    it('should extract content from message', () => {
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Test content',
      });

      const content = BasicMessageProtocol.getContent(message);

      expect(content).toBe('Test content');
    });
  });

  describe('getThreadId', () => {
    it('should return thread ID for threaded message', () => {
      const threadId = 'conversation-789';
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Threaded',
        threadId,
      });

      expect(BasicMessageProtocol.getThreadId(message)).toBe(threadId);
    });

    it('should return message ID for non-threaded message', () => {
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Not threaded',
      });

      expect(BasicMessageProtocol.getThreadId(message)).toBe(message['@id']);
    });
  });

  describe('isThreaded', () => {
    it('should return true for threaded message', () => {
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Threaded',
        threadId: 'thread-123',
      });

      expect(BasicMessageProtocol.isThreaded(message)).toBe(true);
    });

    it('should return false for non-threaded message', () => {
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Not threaded',
      });

      expect(BasicMessageProtocol.isThreaded(message)).toBe(false);
    });
  });

  describe('getThreadMessages', () => {
    it('should filter and sort messages by thread', () => {
      const msg1 = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'First',
      });

      // Wait a bit to ensure different timestamps
      const msg2 = BasicMessageProtocol.createReply(msg1, {
        from: recipientDid,
        content: 'Second',
      });

      const msg3 = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Different thread',
      });

      const threadId = BasicMessageProtocol.getThreadId(msg1);
      const messages = [msg3, msg2, msg1]; // Unsorted

      const threadMessages = BasicMessageProtocol.getThreadMessages(messages, threadId);

      expect(threadMessages).toHaveLength(2);
      expect(threadMessages[0]).toBe(msg1); // First in chronological order
      expect(threadMessages[1]).toBe(msg2);
    });
  });

  describe('formatForDisplay', () => {
    it('should format message for display', () => {
      const message = BasicMessageProtocol.createMessage({
        from: senderDid,
        to: recipientDid,
        content: 'Display me!',
      });

      const formatted = BasicMessageProtocol.formatForDisplay(message);

      expect(formatted).toContain(senderDid);
      expect(formatted).toContain('Display me!');
    });

    it('should handle message without created_time', () => {
      const message: BasicMessage = {
        '@type': 'https://didcomm.org/basicmessage/2.0/message',
        '@id': 'test-id',
        body: { content: 'No timestamp' },
      };

      const formatted = BasicMessageProtocol.formatForDisplay(message);

      expect(formatted).toContain('Unknown time');
      expect(formatted).toContain('No timestamp');
    });

    it('should handle message without from', () => {
      const message: BasicMessage = {
        '@type': 'https://didcomm.org/basicmessage/2.0/message',
        '@id': 'test-id',
        body: { content: 'No sender' },
        created_time: Date.now(),
      };

      const formatted = BasicMessageProtocol.formatForDisplay(message);

      expect(formatted).toContain('Unknown sender');
      expect(formatted).toContain('No sender');
    });
  });
});

