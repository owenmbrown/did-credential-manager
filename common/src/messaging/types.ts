/**
 * Message Queue and Routing Types
 * 
 * @module messaging/types
 */

/**
 * Message status in the queue
 */
export enum MessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

/**
 * Message direction
 */
export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

/**
 * Stored message in the queue
 */
export interface QueuedMessage {
  id: string;
  direction: MessageDirection;
  status: MessageStatus;
  
  // Message details
  message: string; // Packed DIDComm message
  messageType?: string; // @type from unpacked message
  threadId?: string; // thid from message
  
  // Sender/Recipient
  from?: string;
  to?: string;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  sentAt?: number;
  deliveredAt?: number;
  
  // Retry logic
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: number;
  
  // Error tracking
  lastError?: string;
  
  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Message queue configuration
 */
export interface MessageQueueConfig {
  /** Maximum number of messages to store */
  maxQueueSize?: number;
  
  /** Message TTL in milliseconds (default: 24 hours) */
  messageTTL?: number;
  
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  
  /** Initial retry delay in milliseconds (default: 1000) */
  initialRetryDelay?: number;
  
  /** Maximum retry delay in milliseconds (default: 60000) */
  maxRetryDelay?: number;
  
  /** Retry backoff multiplier (default: 2) */
  retryBackoffMultiplier?: number;
  
  /** Auto-process interval in milliseconds (default: 5000) */
  autoProcessInterval?: number;
  
  /** Enable auto-cleanup of old messages (default: true) */
  autoCleanup?: boolean;
  
  /** Cleanup interval in milliseconds (default: 60000) */
  cleanupInterval?: number;
}

/**
 * Protocol handler function signature
 */
export type ProtocolHandler = (
  message: any,
  metadata: {
    from?: string;
    to?: string;
    threadId?: string;
  }
) => Promise<void | any>;

/**
 * Protocol route definition
 */
export interface ProtocolRoute {
  /** Protocol identifier (e.g., 'issue-credential/3.0') */
  protocol: string;
  
  /** Message type within protocol (e.g., 'offer-credential') */
  messageType: string;
  
  /** Handler function */
  handler: ProtocolHandler;
  
  /** Optional description */
  description?: string;
}

/**
 * Message sending options
 */
export interface SendMessageOptions {
  /** Maximum retry attempts for this message */
  maxRetries?: number;
  
  /** Message expiration time in milliseconds */
  expiresIn?: number;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
  
  /** Skip queue and send immediately */
  immediate?: boolean;
}

/**
 * Message query filters
 */
export interface MessageQuery {
  status?: MessageStatus | MessageStatus[];
  direction?: MessageDirection;
  from?: string;
  to?: string;
  messageType?: string;
  threadId?: string;
  createdAfter?: number;
  createdBefore?: number;
  limit?: number;
  offset?: number;
}

