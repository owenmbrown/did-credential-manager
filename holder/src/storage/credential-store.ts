/**
 * Credential Storage
 * 
 * SQLite-based storage for Verifiable Credentials
 * 
 * @module storage/credential-store
 */

import Database from 'better-sqlite3';
import { logger } from '@did-edu/common';

export interface StoredCredential {
  id: string;
  credential: any;
  issuer: string;
  subject: string;
  type: string[];
  issuanceDate: string;
  expirationDate?: string;
  createdAt: string;
}

export interface CredentialQuery {
  issuer?: string;
  subject?: string;
  type?: string;
}

/**
 * Credential Store using SQLite
 */
export class CredentialStore {
  private db: Database.Database;

  constructor(dbPath: string = './holder-credentials.db') {
    this.db = new Database(dbPath);
    this.initialize();
    logger.info(`Credential store initialized at ${dbPath}`);
  }

  /**
   * Initialize database schema
   */
  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        credential TEXT NOT NULL,
        issuer TEXT NOT NULL,
        subject TEXT NOT NULL,
        type TEXT NOT NULL,
        issuanceDate TEXT NOT NULL,
        expirationDate TEXT,
        createdAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_issuer ON credentials(issuer);
      CREATE INDEX IF NOT EXISTS idx_subject ON credentials(subject);
      CREATE INDEX IF NOT EXISTS idx_type ON credentials(type);
    `);
  }

  /**
   * Store a credential
   */
  async storeCredential(credential: any): Promise<void> {
    const id = credential.id || credential.credentialSubject?.id || `vc-${Date.now()}`;
    const issuer = typeof credential.issuer === 'string' 
      ? credential.issuer 
      : credential.issuer?.id || 'unknown';
    const subject = credential.credentialSubject?.id || 'unknown';
    const type = JSON.stringify(credential.type || ['VerifiableCredential']);
    const issuanceDate = credential.issuanceDate || new Date().toISOString();
    const expirationDate = credential.expirationDate || null;
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO credentials 
      (id, credential, issuer, subject, type, issuanceDate, expirationDate, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      JSON.stringify(credential),
      issuer,
      subject,
      type,
      issuanceDate,
      expirationDate,
      createdAt
    );

    logger.info(`Credential stored: ${id}`);
  }

  /**
   * Get a credential by ID
   */
  async getCredential(id: string): Promise<StoredCredential | null> {
    const stmt = this.db.prepare('SELECT * FROM credentials WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.rowToStoredCredential(row);
  }

  /**
   * Get all credentials
   */
  async getAllCredentials(): Promise<StoredCredential[]> {
    const stmt = this.db.prepare('SELECT * FROM credentials ORDER BY createdAt DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => this.rowToStoredCredential(row));
  }

  /**
   * Query credentials
   */
  async queryCredentials(query: CredentialQuery): Promise<StoredCredential[]> {
    let sql = 'SELECT * FROM credentials WHERE 1=1';
    const params: any[] = [];

    if (query.issuer) {
      sql += ' AND issuer = ?';
      params.push(query.issuer);
    }

    if (query.subject) {
      sql += ' AND subject = ?';
      params.push(query.subject);
    }

    if (query.type) {
      sql += ' AND type LIKE ?';
      params.push(`%${query.type}%`);
    }

    sql += ' ORDER BY createdAt DESC';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToStoredCredential(row));
  }

  /**
   * Delete a credential
   */
  async deleteCredential(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM credentials WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
      logger.info(`Credential deleted: ${id}`);
      return true;
    }

    return false;
  }

  /**
   * Get credentials by subject
   */
  async getCredentialsBySubject(subjectDid: string): Promise<StoredCredential[]> {
    return this.queryCredentials({ subject: subjectDid });
  }

  /**
   * Get credentials by issuer
   */
  async getCredentialsByIssuer(issuerDid: string): Promise<StoredCredential[]> {
    return this.queryCredentials({ issuer: issuerDid });
  }

  /**
   * Get credentials by type
   */
  async getCredentialsByType(type: string): Promise<StoredCredential[]> {
    return this.queryCredentials({ type });
  }

  /**
   * Check if credential exists
   */
  async hasCredential(id: string): Promise<boolean> {
    const credential = await this.getCredential(id);
    return credential !== null;
  }

  /**
   * Get credential count
   */
  async getCredentialCount(): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM credentials');
    const row = stmt.get() as any;
    return row.count;
  }

  /**
   * Convert database row to StoredCredential
   */
  private rowToStoredCredential(row: any): StoredCredential {
    return {
      id: row.id,
      credential: JSON.parse(row.credential),
      issuer: row.issuer,
      subject: row.subject,
      type: JSON.parse(row.type),
      issuanceDate: row.issuanceDate,
      expirationDate: row.expirationDate,
      createdAt: row.createdAt,
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
    logger.info('Credential store closed');
  }
}

