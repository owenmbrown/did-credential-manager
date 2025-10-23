/**
 * Message Storage Layer
 * 
 * SQLite-based persistence for message queue
 * 
 * @module messaging/message-storage
 */

import Database from 'better-sqlite3';
import { QueuedMessage, MessageStatus, MessageDirection, MessageQuery } from './types.js';

export interface MessageStorageConfig {
  dbPath: string;
  readonly?: boolean;
}

/**
 * Message storage using SQLite
 */
export class MessageStorage {
  private db: Database.Database;

  constructor(config: MessageStorageConfig) {
    this.db = new Database(config.dbPath, {
      readonly: config.readonly,
      fileMustExist: false,
    });

    this.initializeDatabase();
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        direction TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        message_type TEXT,
        thread_id TEXT,
        from_did TEXT,
        to_did TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER,
        sent_at INTEGER,
        delivered_at INTEGER,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        next_retry_at INTEGER,
        last_error TEXT,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
      CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
      CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_next_retry_at ON messages(next_retry_at);
      CREATE INDEX IF NOT EXISTS idx_messages_from_did ON messages(from_did);
      CREATE INDEX IF NOT EXISTS idx_messages_to_did ON messages(to_did);
    `);
  }

  /**
   * Store a message
   */
  store(message: QueuedMessage): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO messages (
        id, direction, status, message, message_type, thread_id,
        from_did, to_did, created_at, updated_at, expires_at,
        sent_at, delivered_at, retry_count, max_retries, next_retry_at,
        last_error, metadata
      ) VALUES (
        @id, @direction, @status, @message, @messageType, @threadId,
        @from, @to, @createdAt, @updatedAt, @expiresAt,
        @sentAt, @deliveredAt, @retryCount, @maxRetries, @nextRetryAt,
        @lastError, @metadata
      )
    `);

    stmt.run({
      id: message.id,
      direction: message.direction,
      status: message.status,
      message: message.message,
      messageType: message.messageType || null,
      threadId: message.threadId || null,
      from: message.from || null,
      to: message.to || null,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      expiresAt: message.expiresAt || null,
      sentAt: message.sentAt || null,
      deliveredAt: message.deliveredAt || null,
      retryCount: message.retryCount,
      maxRetries: message.maxRetries,
      nextRetryAt: message.nextRetryAt || null,
      lastError: message.lastError || null,
      metadata: message.metadata ? JSON.stringify(message.metadata) : null,
    });
  }

  /**
   * Get a message by ID
   */
  get(id: string): QueuedMessage | null {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.rowToMessage(row) : null;
  }

  /**
   * Query messages with filters
   */
  query(filters: MessageQuery): QueuedMessage[] {
    let sql = 'SELECT * FROM messages WHERE 1=1';
    const params: any = {};

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        const placeholders = filters.status.map((_, i) => `@status${i}`).join(',');
        sql += ` AND status IN (${placeholders})`;
        filters.status.forEach((status, i) => {
          params[`status${i}`] = status;
        });
      } else {
        sql += ' AND status = @status';
        params.status = filters.status;
      }
    }

    if (filters.direction) {
      sql += ' AND direction = @direction';
      params.direction = filters.direction;
    }

    if (filters.from) {
      sql += ' AND from_did = @from';
      params.from = filters.from;
    }

    if (filters.to) {
      sql += ' AND to_did = @to';
      params.to = filters.to;
    }

    if (filters.messageType) {
      sql += ' AND message_type = @messageType';
      params.messageType = filters.messageType;
    }

    if (filters.threadId) {
      sql += ' AND thread_id = @threadId';
      params.threadId = filters.threadId;
    }

    if (filters.createdAfter) {
      sql += ' AND created_at >= @createdAfter';
      params.createdAfter = filters.createdAfter;
    }

    if (filters.createdBefore) {
      sql += ' AND created_at <= @createdBefore';
      params.createdBefore = filters.createdBefore;
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT @limit';
      params.limit = filters.limit;
    }

    if (filters.offset) {
      sql += ' OFFSET @offset';
      params.offset = filters.offset;
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(params) as any[];

    return rows.map(row => this.rowToMessage(row));
  }

  /**
   * Update message status
   */
  updateStatus(id: string, status: MessageStatus, error?: string): void {
    const updates: any = {
      id,
      status,
      updatedAt: Date.now(),
    };

    if (status === MessageStatus.SENT) {
      updates.sentAt = Date.now();
    } else if (status === MessageStatus.DELIVERED) {
      updates.deliveredAt = Date.now();
    }

    if (error) {
      updates.lastError = error;
    }

    const stmt = this.db.prepare(`
      UPDATE messages
      SET status = @status, updated_at = @updatedAt,
          sent_at = COALESCE(@sentAt, sent_at),
          delivered_at = COALESCE(@deliveredAt, delivered_at),
          last_error = COALESCE(@lastError, last_error)
      WHERE id = @id
    `);

    stmt.run(updates);
  }

  /**
   * Increment retry count and update next retry time
   */
  incrementRetry(id: string, nextRetryAt: number, error?: string): void {
    const stmt = this.db.prepare(`
      UPDATE messages
      SET retry_count = retry_count + 1,
          next_retry_at = @nextRetryAt,
          updated_at = @updatedAt,
          last_error = COALESCE(@lastError, last_error),
          status = @status
      WHERE id = @id
    `);

    stmt.run({
      id,
      nextRetryAt,
      updatedAt: Date.now(),
      lastError: error || null,
      status: MessageStatus.PENDING,
    });
  }

  /**
   * Get messages ready for retry
   */
  getMessagesForRetry(): QueuedMessage[] {
    const now = Date.now();
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE status = ?
        AND retry_count < max_retries
        AND next_retry_at IS NOT NULL
        AND next_retry_at <= ?
      ORDER BY next_retry_at ASC
    `);

    const rows = stmt.all(MessageStatus.PENDING, now) as any[];
    return rows.map(row => this.rowToMessage(row));
  }

  /**
   * Delete a message
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM messages WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete expired messages
   */
  deleteExpired(): number {
    const now = Date.now();
    
    // Mark expired messages first
    const markStmt = this.db.prepare(`
      UPDATE messages
      SET status = @expiredStatus, updated_at = @now
      WHERE expires_at IS NOT NULL AND expires_at < @now
    `);
    markStmt.run({ expiredStatus: MessageStatus.EXPIRED, now });

    // Delete old expired messages (older than 7 days)
    const deleteStmt = this.db.prepare(`
      DELETE FROM messages
      WHERE status = @expiredStatus
        AND updated_at < @sevenDaysAgo
    `);
    const result = deleteStmt.run({
      expiredStatus: MessageStatus.EXPIRED,
      sevenDaysAgo: now - 7 * 24 * 60 * 60 * 1000,
    });

    return result.changes;
  }

  /**
   * Delete old delivered messages
   */
  deleteOldDelivered(olderThan: number): number {
    const stmt = this.db.prepare(`
      DELETE FROM messages
      WHERE status = @deliveredStatus
        AND delivered_at IS NOT NULL
        AND delivered_at < @olderThan
    `);

    const result = stmt.run({
      deliveredStatus: MessageStatus.DELIVERED,
      olderThan,
    });

    return result.changes;
  }

  /**
   * Get message count by status
   */
  getCount(status?: MessageStatus): number {
    let stmt;
    if (status) {
      stmt = this.db.prepare('SELECT COUNT(*) as count FROM messages WHERE status = ?');
      const result = stmt.get(status) as any;
      return result.count;
    } else {
      stmt = this.db.prepare('SELECT COUNT(*) as count FROM messages');
      const result = stmt.get() as any;
      return result.count;
    }
  }

  /**
   * Get all messages (for debugging)
   */
  getAll(limit = 100): QueuedMessage[] {
    const stmt = this.db.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];
    return rows.map(row => this.rowToMessage(row));
  }

  /**
   * Convert database row to QueuedMessage
   */
  private rowToMessage(row: any): QueuedMessage {
    return {
      id: row.id,
      direction: row.direction as MessageDirection,
      status: row.status as MessageStatus,
      message: row.message,
      messageType: row.message_type || undefined,
      threadId: row.thread_id || undefined,
      from: row.from_did || undefined,
      to: row.to_did || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at || undefined,
      sentAt: row.sent_at || undefined,
      deliveredAt: row.delivered_at || undefined,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      nextRetryAt: row.next_retry_at || undefined,
      lastError: row.last_error || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}

