/**
 * Structured logger for DIDComm messages and general logging
 * 
 * @module logger
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogRecord {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
}

export interface MessageRecord {
  to: string;
  from: string;
  message: object;
}

/**
 * Logger service for structured logging
 */
export class Logger {
  private records: LogRecord[] = [];
  private maxRecords = 1000; // Keep last 1000 records

  /**
   * Log a debug message
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Log a general message
   */
  log(level: LogLevel, message: string, data?: any): void {
    const record: LogRecord = {
      level,
      message,
      timestamp: new Date(),
      data,
    };

    // Console output
    const timestamp = record.timestamp.toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }

    // Store record
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records.shift(); // Remove oldest record
    }
  }

  /**
   * Log a sent DIDComm message
   */
  sentMessage(record: MessageRecord): void {
    this.info(`Sent message to ${record.to}`, {
      to: record.to,
      from: record.from,
      messageType: (record.message as any).type,
      messageId: (record.message as any).id,
    });
    
    this.debug('Message details:', record.message);
  }

  /**
   * Log a received DIDComm message
   */
  recvMessage(record: MessageRecord): void {
    this.info(`Received message from ${record.from}`, {
      to: record.to,
      from: record.from,
      messageType: (record.message as any).type,
      messageId: (record.message as any).id,
    });
    
    this.debug('Message details:', record.message);
  }

  /**
   * Get all log records
   */
  getRecords(): LogRecord[] {
    return [...this.records];
  }

  /**
   * Get records filtered by level
   */
  getRecordsByLevel(level: LogLevel): LogRecord[] {
    return this.records.filter((r) => r.level === level);
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records = [];
  }

  /**
   * Export records as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.records, null, 2);
  }
}

// Export singleton instance
export default new Logger();

