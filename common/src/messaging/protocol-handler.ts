/**
 * Protocol Handler Framework
 * 
 * Routes DIDComm messages to appropriate protocol handlers
 * 
 * @module messaging/protocol-handler
 */

import { ProtocolRoute, ProtocolHandler } from './types.js';
import logger from '../utils/logger.js';

/**
 * Protocol Handler Registry
 */
export class ProtocolHandlerRegistry {
  private handlers: Map<string, ProtocolHandler>;

  constructor() {
    this.handlers = new Map();
  }

  /**
   * Register a protocol handler
   */
  register(route: ProtocolRoute): void {
    const key = this.makeKey(route.protocol, route.messageType);
    
    if (this.handlers.has(key)) {
      logger.warn('Overwriting existing handler', { protocol: route.protocol, messageType: route.messageType });
    }

    this.handlers.set(key, route.handler);
    logger.info('Protocol handler registered', {
      protocol: route.protocol,
      messageType: route.messageType,
      description: route.description,
    });
  }

  /**
   * Register multiple handlers at once
   */
  registerMany(routes: ProtocolRoute[]): void {
    for (const route of routes) {
      this.register(route);
    }
  }

  /**
   * Unregister a handler
   */
  unregister(protocol: string, messageType: string): boolean {
    const key = this.makeKey(protocol, messageType);
    const existed = this.handlers.has(key);
    this.handlers.delete(key);
    
    if (existed) {
      logger.info('Protocol handler unregistered', { protocol, messageType });
    }
    
    return existed;
  }

  /**
   * Get a handler
   */
  getHandler(protocol: string, messageType: string): ProtocolHandler | undefined {
    const key = this.makeKey(protocol, messageType);
    return this.handlers.get(key);
  }

  /**
   * Check if a handler exists
   */
  hasHandler(protocol: string, messageType: string): boolean {
    const key = this.makeKey(protocol, messageType);
    return this.handlers.has(key);
  }

  /**
   * Get all registered handlers
   */
  getAll(): Array<{ protocol: string; messageType: string }> {
    return Array.from(this.handlers.keys()).map(key => {
      const [protocol, messageType] = key.split(':');
      return { protocol, messageType };
    });
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    logger.info('All protocol handlers cleared');
  }

  /**
   * Make a key from protocol and message type
   */
  private makeKey(protocol: string, messageType: string): string {
    return `${protocol}:${messageType}`;
  }
}

/**
 * Message Router
 * 
 * Routes incoming messages to the appropriate protocol handler
 */
export class MessageRouter {
  private registry: ProtocolHandlerRegistry;

  constructor(registry?: ProtocolHandlerRegistry) {
    this.registry = registry || new ProtocolHandlerRegistry();
  }

  /**
   * Get the handler registry
   */
  getRegistry(): ProtocolHandlerRegistry {
    return this.registry;
  }

  /**
   * Route a message to its handler
   */
  async route(message: any, metadata?: { from?: string; to?: string; threadId?: string }): Promise<any> {
    // Extract protocol and message type from @type
    const messageType = message['@type'];
    if (!messageType) {
      throw new Error('Message missing @type field');
    }

    const { protocol, version, type } = this.parseMessageType(messageType);
    
    if (!protocol || !type) {
      throw new Error(`Invalid message type format: ${messageType}`);
    }

    // Construct protocol identifier
    const protocolId = `${protocol}/${version}`;

    // Find handler
    const handler = this.registry.getHandler(protocolId, type);
    
    if (!handler) {
      throw new Error(`No handler found for ${protocolId}:${type}`);
    }

    // Extract metadata from message if not provided
    const routeMetadata = metadata || {
      from: message.from,
      to: message.to?.[0],
      threadId: message.thid || message['@id'],
    };

    logger.info('Routing message', {
      messageType,
      protocol: protocolId,
      type,
      from: routeMetadata.from,
      to: routeMetadata.to,
    });

    try {
      // Call handler
      const result = await handler(message, routeMetadata);
      
      logger.info('Message handled successfully', {
        protocol: protocolId,
        type,
      });

      return result;
    } catch (error) {
      logger.error('Handler error', {
        protocol: protocolId,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Parse DIDComm message type
   * 
   * Example: "https://didcomm.org/issue-credential/3.0/offer-credential"
   * Returns: { protocol: "issue-credential", version: "3.0", type: "offer-credential" }
   */
  parseMessageType(messageType: string): {
    protocol: string | null;
    version: string | null;
    type: string | null;
  } {
    // Match: https://didcomm.org/{protocol}/{version}/{type}
    const match = messageType.match(/https:\/\/didcomm\.org\/([^/]+)\/([^/]+)\/([^/]+)/);
    
    if (!match) {
      return { protocol: null, version: null, type: null };
    }

    return {
      protocol: match[1],
      version: match[2],
      type: match[3],
    };
  }

  /**
   * Route multiple messages
   */
  async routeMany(messages: any[]): Promise<any[]> {
    const results = [];
    
    for (const message of messages) {
      try {
        const result = await this.route(message);
        results.push({ success: true, result });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }
}

/**
 * Create a default router with common handlers
 */
export function createDefaultRouter(): MessageRouter {
  const registry = new ProtocolHandlerRegistry();
  const router = new MessageRouter(registry);
  
  // Register default handlers for common protocols
  // (Agents will register their specific handlers)
  
  return router;
}

