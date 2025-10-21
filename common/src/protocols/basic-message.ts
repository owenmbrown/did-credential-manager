/**
 * Basic Message Protocol 2.0 Implementation
 * 
 * This module implements the DIDComm Basic Message protocol v2.0 for
 * simple text messaging between agents.
 * 
 * Spec: https://didcomm.org/basicmessage/2.0/
 * 
 * @module protocols/basic-message
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Basic Message structure
 */
export interface BasicMessage {
  '@type': 'https://didcomm.org/basicmessage/2.0/message';
  '@id': string;
  thid?: string; // Thread ID for conversation threading
  from?: string;
  to?: string[];
  created_time?: number;
  expires_time?: number;
  body: {
    content: string;
    locale?: string; // Language code (e.g., 'en', 'es', 'fr')
  };
}

/**
 * Basic Message Protocol Handler
 */
export class BasicMessageProtocol {
  /**
   * Create a basic message
   * 
   * @param options - Message options
   * @returns Basic message
   */
  static createMessage(options: {
    from: string;
    to: string | string[];
    content: string;
    locale?: string;
    threadId?: string;
    ttl?: number; // Time-to-live in seconds
  }): BasicMessage {
    const now = Date.now();
    const to = Array.isArray(options.to) ? options.to : [options.to];

    return {
      '@type': 'https://didcomm.org/basicmessage/2.0/message',
      '@id': uuidv4(),
      thid: options.threadId,
      from: options.from,
      to,
      created_time: now,
      expires_time: options.ttl ? now + (options.ttl * 1000) : undefined,
      body: {
        content: options.content,
        locale: options.locale || 'en',
      },
    };
  }

  /**
   * Create a reply to an existing message
   * 
   * @param originalMessage - The message being replied to
   * @param options - Reply options
   * @returns Reply message
   */
  static createReply(
    originalMessage: BasicMessage,
    options: {
      from: string;
      content: string;
      locale?: string;
    }
  ): BasicMessage {
    // Thread ID is either the original thread ID or the original message ID
    const threadId = originalMessage.thid || originalMessage['@id'];
    
    // Reply goes to the sender of the original message
    const to = originalMessage.from;
    
    if (!to) {
      throw new Error('Cannot reply: original message has no sender');
    }

    return this.createMessage({
      from: options.from,
      to,
      content: options.content,
      locale: options.locale,
      threadId,
    });
  }

  /**
   * Validate a basic message
   * 
   * @param message - The message to validate
   * @returns True if valid
   * @throws Error if invalid
   */
  static validateMessage(message: any): boolean {
    if (!message['@type'] || !message['@id']) {
      throw new Error('Invalid message: missing @type or @id');
    }

    if (message['@type'] !== 'https://didcomm.org/basicmessage/2.0/message') {
      throw new Error('Invalid message: not a Basic Message 2.0');
    }

    if (!message.body || !message.body.content) {
      throw new Error('Invalid message: missing body.content');
    }

    // Check expiration
    if (message.expires_time && Date.now() > message.expires_time) {
      throw new Error('Message has expired');
    }

    return true;
  }

  /**
   * Check if a message is expired
   * 
   * @param message - The message to check
   * @returns True if expired
   */
  static isExpired(message: BasicMessage): boolean {
    if (!message.expires_time) {
      return false;
    }
    return Date.now() > message.expires_time;
  }

  /**
   * Extract content from a message
   * 
   * @param message - The message
   * @returns Message content
   */
  static getContent(message: BasicMessage): string {
    return message.body.content;
  }

  /**
   * Get thread ID from a message (for threading/conversations)
   * 
   * @param message - The message
   * @returns Thread ID
   */
  static getThreadId(message: BasicMessage): string {
    return message.thid || message['@id'];
  }

  /**
   * Check if a message is part of a thread
   * 
   * @param message - The message
   * @returns True if part of a thread
   */
  static isThreaded(message: BasicMessage): boolean {
    return !!message.thid;
  }

  /**
   * Get all messages in a thread (requires message storage)
   * This is a helper for organizing conversations
   * 
   * @param messages - Array of messages to filter
   * @param threadId - The thread ID to filter by
   * @returns Messages in the thread, sorted by creation time
   */
  static getThreadMessages(
    messages: BasicMessage[],
    threadId: string
  ): BasicMessage[] {
    return messages
      .filter(msg => this.getThreadId(msg) === threadId)
      .sort((a, b) => (a.created_time || 0) - (b.created_time || 0));
  }

  /**
   * Format message for display
   * 
   * @param message - The message
   * @returns Formatted string
   */
  static formatForDisplay(message: BasicMessage): string {
    const time = message.created_time
      ? new Date(message.created_time).toLocaleString()
      : 'Unknown time';
    const from = message.from || 'Unknown sender';
    const content = message.body.content;
    
    return `[${time}] ${from}: ${content}`;
  }
}

