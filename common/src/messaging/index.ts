/**
 * Message Queue and Routing System
 * 
 * @module messaging
 */

// Types
export * from './types.js';

// Storage
export { MessageStorage, type MessageStorageConfig } from './message-storage.js';

// Queue
export { MessageQueue } from './message-queue.js';

// Protocol Handler
export {
  ProtocolHandlerRegistry,
  MessageRouter,
  createDefaultRouter,
} from './protocol-handler.js';

// Agent Integration
export { AgentMessaging } from './agent-integration.js';

