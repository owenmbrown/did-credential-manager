/**
 * Tests for Protocol Handler
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ProtocolHandlerRegistry, MessageRouter } from './protocol-handler.js';
import { ProtocolRoute } from './types.js';

describe('ProtocolHandlerRegistry', () => {
  let registry: ProtocolHandlerRegistry;

  beforeEach(() => {
    registry = new ProtocolHandlerRegistry();
  });

  describe('register', () => {
    it('should register a handler', () => {
      const handler = async (msg: any) => ({ success: true });
      const route: ProtocolRoute = {
        protocol: 'issue-credential/3.0',
        messageType: 'offer-credential',
        handler,
      };

      registry.register(route);

      expect(registry.hasHandler('issue-credential/3.0', 'offer-credential')).toBe(true);
    });

    it('should allow overwriting handlers', () => {
      const handler1 = async () => 'handler1';
      const handler2 = async () => 'handler2';

      registry.register({
        protocol: 'test/1.0',
        messageType: 'test',
        handler: handler1,
      });

      registry.register({
        protocol: 'test/1.0',
        messageType: 'test',
        handler: handler2,
      });

      const retrievedHandler = registry.getHandler('test/1.0', 'test');
      expect(retrievedHandler).toBe(handler2);
    });
  });

  describe('unregister', () => {
    it('should unregister a handler', () => {
      registry.register({
        protocol: 'test/1.0',
        messageType: 'test',
        handler: async () => {},
      });

      const result = registry.unregister('test/1.0', 'test');

      expect(result).toBe(true);
      expect(registry.hasHandler('test/1.0', 'test')).toBe(false);
    });

    it('should return false for non-existent handler', () => {
      const result = registry.unregister('nonexistent/1.0', 'test');
      expect(result).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered handlers', () => {
      registry.register({
        protocol: 'protocol1/1.0',
        messageType: 'type1',
        handler: async () => {},
      });

      registry.register({
        protocol: 'protocol2/2.0',
        messageType: 'type2',
        handler: async () => {},
      });

      const all = registry.getAll();

      expect(all).toHaveLength(2);
      expect(all).toContainEqual({ protocol: 'protocol1/1.0', messageType: 'type1' });
      expect(all).toContainEqual({ protocol: 'protocol2/2.0', messageType: 'type2' });
    });
  });

  describe('clear', () => {
    it('should clear all handlers', () => {
      registry.register({
        protocol: 'test/1.0',
        messageType: 'test',
        handler: async () => {},
      });

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
    });
  });
});

describe('MessageRouter', () => {
  let router: MessageRouter;
  let registry: ProtocolHandlerRegistry;

  beforeEach(() => {
    registry = new ProtocolHandlerRegistry();
    router = new MessageRouter(registry);
  });

  describe('parseMessageType', () => {
    it('should parse valid message types', () => {
      const result = router.parseMessageType(
        'https://didcomm.org/issue-credential/3.0/offer-credential'
      );

      expect(result).toEqual({
        protocol: 'issue-credential',
        version: '3.0',
        type: 'offer-credential',
      });
    });

    it('should return nulls for invalid message types', () => {
      const result = router.parseMessageType('invalid-type');

      expect(result).toEqual({
        protocol: null,
        version: null,
        type: null,
      });
    });
  });

  describe('route', () => {
    it('should route message to correct handler', async () => {
      let handlerCalled = false;
      let receivedMessage: any;

      registry.register({
        protocol: 'issue-credential/3.0',
        messageType: 'offer-credential',
        handler: async (msg) => {
          handlerCalled = true;
          receivedMessage = msg;
          return { success: true };
        },
      });

      const message = {
        '@type': 'https://didcomm.org/issue-credential/3.0/offer-credential',
        '@id': 'test-id',
        from: 'did:peer:issuer',
        to: ['did:peer:holder'],
      };

      const result = await router.route(message);

      expect(handlerCalled).toBe(true);
      expect(receivedMessage).toEqual(message);
      expect(result).toEqual({ success: true });
    });

    it('should throw for message without @type', async () => {
      const message = { '@id': 'test-id' };

      await expect(router.route(message)).rejects.toThrow('Message missing @type field');
    });

    it('should throw for unregistered handler', async () => {
      const message = {
        '@type': 'https://didcomm.org/unknown/1.0/test',
        '@id': 'test-id',
      };

      await expect(router.route(message)).rejects.toThrow('No handler found');
    });

    it('should pass metadata to handler', async () => {
      let receivedMetadata: any;

      registry.register({
        protocol: 'test/1.0',
        messageType: 'test',
        handler: async (msg, metadata) => {
          receivedMetadata = metadata;
        },
      });

      const message = {
        '@type': 'https://didcomm.org/test/1.0/test',
        '@id': 'test-id',
        from: 'sender',
        to: ['recipient'],
        thid: 'thread-123',
      };

      await router.route(message);

      expect(receivedMetadata).toEqual({
        from: 'sender',
        to: 'recipient',
        threadId: 'thread-123',
      });
    });
  });

  describe('routeMany', () => {
    it('should route multiple messages', async () => {
      registry.register({
        protocol: 'test/1.0',
        messageType: 'msg1',
        handler: async () => ({ result: 'msg1' }),
      });

      registry.register({
        protocol: 'test/1.0',
        messageType: 'msg2',
        handler: async () => ({ result: 'msg2' }),
      });

      const messages = [
        {
          '@type': 'https://didcomm.org/test/1.0/msg1',
          '@id': 'id1',
        },
        {
          '@type': 'https://didcomm.org/test/1.0/msg2',
          '@id': 'id2',
        },
      ];

      const results = await router.routeMany(messages);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ success: true, result: { result: 'msg1' } });
      expect(results[1]).toEqual({ success: true, result: { result: 'msg2' } });
    });

    it('should handle errors gracefully', async () => {
      registry.register({
        protocol: 'test/1.0',
        messageType: 'test',
        handler: async () => {
          throw new Error('Handler error');
        },
      });

      const messages = [
        {
          '@type': 'https://didcomm.org/test/1.0/test',
          '@id': 'id1',
        },
      ];

      const results = await router.routeMany(messages);

      expect(results[0]).toEqual({
        success: false,
        error: 'Handler error',
      });
    });
  });
});

