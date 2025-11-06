/**
 * Tests for Credential Store
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { CredentialStore, StoredCredential, CredentialQuery } from './credential-store.js';
import fs from 'fs';
import path from 'path';

// Mock @did-edu/common
jest.mock('@did-edu/common', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('CredentialStore', () => {
  let store: CredentialStore;
  const testDbPath = './test-credentials.db';

  const mockCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'UniversityDegree'],
    id: 'vc-test-123',
    issuer: {
      id: 'did:peer:issuer123'
    },
    credentialSubject: {
      id: 'did:peer:holder456',
      name: 'John Doe',
      degree: 'Bachelor of Science'
    },
    issuanceDate: '2020-05-15T12:00:00Z',
    expirationDate: '2025-05-15T12:00:00Z'
  };

  beforeEach(() => {
    // Remove test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    store = new CredentialStore(testDbPath);
  });

  afterEach(() => {
    store.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('constructor', () => {
    it('should initialize database with correct schema', () => {
      expect(store).toBeDefined();
    });

    it('should use default path if not provided', () => {
      const defaultStore = new CredentialStore();
      expect(defaultStore).toBeDefined();
      defaultStore.close();
    });
  });

  describe('storeCredential', () => {
    it('should store a credential successfully', async () => {
      await store.storeCredential(mockCredential);

      const retrieved = await store.getCredential('vc-test-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('vc-test-123');
      expect(retrieved!.credential).toEqual(mockCredential);
    });

    it('should store credential with string issuer', async () => {
      const credential = {
        ...mockCredential,
        issuer: 'did:peer:issuer456'
      };

      await store.storeCredential(credential);

      const retrieved = await store.getCredential('vc-test-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.issuer).toBe('did:peer:issuer456');
    });

    it('should generate ID if not provided', async () => {
      const credentialWithoutId = {
        ...mockCredential
      };
      delete (credentialWithoutId as any).id;

      await store.storeCredential(credentialWithoutId);

      const count = await store.getCredentialCount();
      expect(count).toBe(1);
    });

    it('should use credentialSubject.id as fallback ID', async () => {
      const credential = {
        ...mockCredential,
        credentialSubject: {
          id: 'fallback-id-123',
          name: 'Test User'
        }
      };
      delete (credential as any).id;

      await store.storeCredential(credential);

      const retrieved = await store.getCredential('fallback-id-123');
      expect(retrieved).not.toBeNull();
    });

    it('should replace existing credential with same ID', async () => {
      await store.storeCredential(mockCredential);

      const updatedCredential = {
        ...mockCredential,
        credentialSubject: {
          ...mockCredential.credentialSubject,
          name: 'Jane Doe'
        }
      };

      await store.storeCredential(updatedCredential);

      const retrieved = await store.getCredential('vc-test-123');
      expect(retrieved!.credential.credentialSubject.name).toBe('Jane Doe');

      const count = await store.getCredentialCount();
      expect(count).toBe(1);
    });

    it('should handle credential without expiration date', async () => {
      const credential = {
        ...mockCredential
      };
      delete (credential as any).expirationDate;

      await store.storeCredential(credential);

      const retrieved = await store.getCredential('vc-test-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.expirationDate).toBeNull();
    });

    it('should handle credential without issuance date', async () => {
      const credential = {
        ...mockCredential
      };
      delete (credential as any).issuanceDate;

      await store.storeCredential(credential);

      const retrieved = await store.getCredential('vc-test-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.issuanceDate).toBeDefined();
    });

    it('should handle unknown issuer', async () => {
      const credential = {
        ...mockCredential
      };
      delete (credential as any).issuer;

      await store.storeCredential(credential);

      const retrieved = await store.getCredential('vc-test-123');
      expect(retrieved!.issuer).toBe('unknown');
    });

    it('should handle unknown subject', async () => {
      const credential = {
        ...mockCredential,
        credentialSubject: {}
      };

      await store.storeCredential(credential);

      const retrieved = await store.getCredential('vc-test-123');
      expect(retrieved!.subject).toBe('unknown');
    });

    it('should handle missing credential type', async () => {
      const credential = {
        ...mockCredential
      };
      delete (credential as any).type;

      await store.storeCredential(credential);

      const retrieved = await store.getCredential('vc-test-123');
      expect(retrieved!.type).toEqual(['VerifiableCredential']);
    });
  });

  describe('getCredential', () => {
    it('should return null for non-existent credential', async () => {
      const result = await store.getCredential('non-existent-id');
      expect(result).toBeNull();
    });

    it('should retrieve stored credential correctly', async () => {
      await store.storeCredential(mockCredential);

      const retrieved = await store.getCredential('vc-test-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('vc-test-123');
      expect(retrieved!.issuer).toBe('did:peer:issuer123');
      expect(retrieved!.subject).toBe('did:peer:holder456');
      expect(retrieved!.type).toEqual(['VerifiableCredential', 'UniversityDegree']);
    });
  });

  describe('getAllCredentials', () => {
    it('should return empty array when no credentials', async () => {
      const credentials = await store.getAllCredentials();
      expect(credentials).toEqual([]);
    });

    it('should return all stored credentials', async () => {
      const credential1 = { ...mockCredential, id: 'vc-1' };
      const credential2 = { ...mockCredential, id: 'vc-2' };
      const credential3 = { ...mockCredential, id: 'vc-3' };

      await store.storeCredential(credential1);
      await store.storeCredential(credential2);
      await store.storeCredential(credential3);

      const credentials = await store.getAllCredentials();
      expect(credentials).toHaveLength(3);
    });

    it('should return credentials in descending order by createdAt', async () => {
      const credential1 = { ...mockCredential, id: 'vc-1' };
      await store.storeCredential(credential1);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const credential2 = { ...mockCredential, id: 'vc-2' };
      await store.storeCredential(credential2);

      const credentials = await store.getAllCredentials();
      expect(credentials[0].id).toBe('vc-2');
      expect(credentials[1].id).toBe('vc-1');
    });
  });

  describe('queryCredentials', () => {
    beforeEach(async () => {
      const credential1 = {
        ...mockCredential,
        id: 'vc-1',
        issuer: { id: 'did:peer:issuer123' },
        credentialSubject: { id: 'did:peer:holder456', name: 'John' }
      };

      const credential2 = {
        ...mockCredential,
        id: 'vc-2',
        type: ['VerifiableCredential', 'DriversLicense'],
        issuer: { id: 'did:peer:issuer456' },
        credentialSubject: { id: 'did:peer:holder789', name: 'Jane' }
      };

      const credential3 = {
        ...mockCredential,
        id: 'vc-3',
        issuer: { id: 'did:peer:issuer123' },
        credentialSubject: { id: 'did:peer:holder456', name: 'Bob' }
      };

      await store.storeCredential(credential1);
      await store.storeCredential(credential2);
      await store.storeCredential(credential3);
    });

    it('should query by issuer', async () => {
      const query: CredentialQuery = {
        issuer: 'did:peer:issuer123'
      };

      const results = await store.queryCredentials(query);
      expect(results).toHaveLength(2);
      expect(results.every(vc => vc.issuer === 'did:peer:issuer123')).toBe(true);
    });

    it('should query by subject', async () => {
      const query: CredentialQuery = {
        subject: 'did:peer:holder456'
      };

      const results = await store.queryCredentials(query);
      expect(results).toHaveLength(2);
      expect(results.every(vc => vc.subject === 'did:peer:holder456')).toBe(true);
    });

    it('should query by type', async () => {
      const query: CredentialQuery = {
        type: 'DriversLicense'
      };

      const results = await store.queryCredentials(query);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('vc-2');
    });

    it('should query by multiple criteria', async () => {
      const query: CredentialQuery = {
        issuer: 'did:peer:issuer123',
        subject: 'did:peer:holder456'
      };

      const results = await store.queryCredentials(query);
      expect(results).toHaveLength(2);
    });

    it('should return empty array if no matches', async () => {
      const query: CredentialQuery = {
        issuer: 'did:peer:nonexistent'
      };

      const results = await store.queryCredentials(query);
      expect(results).toEqual([]);
    });

    it('should handle empty query', async () => {
      const query: CredentialQuery = {};

      const results = await store.queryCredentials(query);
      expect(results).toHaveLength(3);
    });
  });

  describe('deleteCredential', () => {
    it('should delete existing credential', async () => {
      await store.storeCredential(mockCredential);

      const deleted = await store.deleteCredential('vc-test-123');
      expect(deleted).toBe(true);

      const retrieved = await store.getCredential('vc-test-123');
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent credential', async () => {
      const deleted = await store.deleteCredential('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should decrease credential count after deletion', async () => {
      await store.storeCredential(mockCredential);
      await store.storeCredential({ ...mockCredential, id: 'vc-2' });

      let count = await store.getCredentialCount();
      expect(count).toBe(2);

      await store.deleteCredential('vc-test-123');

      count = await store.getCredentialCount();
      expect(count).toBe(1);
    });
  });

  describe('getCredentialsBySubject', () => {
    it('should return credentials for specific subject', async () => {
      await store.storeCredential(mockCredential);
      await store.storeCredential({
        ...mockCredential,
        id: 'vc-2',
        credentialSubject: { id: 'did:peer:other', name: 'Other' }
      });

      const results = await store.getCredentialsBySubject('did:peer:holder456');
      expect(results).toHaveLength(1);
      expect(results[0].subject).toBe('did:peer:holder456');
    });

    it('should return empty array if no credentials for subject', async () => {
      const results = await store.getCredentialsBySubject('did:peer:nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('getCredentialsByIssuer', () => {
    it('should return credentials from specific issuer', async () => {
      await store.storeCredential(mockCredential);
      await store.storeCredential({
        ...mockCredential,
        id: 'vc-2',
        issuer: { id: 'did:peer:other-issuer' }
      });

      const results = await store.getCredentialsByIssuer('did:peer:issuer123');
      expect(results).toHaveLength(1);
      expect(results[0].issuer).toBe('did:peer:issuer123');
    });

    it('should return empty array if no credentials from issuer', async () => {
      const results = await store.getCredentialsByIssuer('did:peer:nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('getCredentialsByType', () => {
    it('should return credentials of specific type', async () => {
      await store.storeCredential(mockCredential);
      await store.storeCredential({
        ...mockCredential,
        id: 'vc-2',
        type: ['VerifiableCredential', 'DriversLicense']
      });

      const results = await store.getCredentialsByType('UniversityDegree');
      expect(results).toHaveLength(1);
      expect(results[0].type).toContain('UniversityDegree');
    });

    it('should return empty array if no credentials of type', async () => {
      const results = await store.getCredentialsByType('NonExistentType');
      expect(results).toEqual([]);
    });
  });

  describe('hasCredential', () => {
    it('should return true for existing credential', async () => {
      await store.storeCredential(mockCredential);

      const exists = await store.hasCredential('vc-test-123');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent credential', async () => {
      const exists = await store.hasCredential('non-existent-id');
      expect(exists).toBe(false);
    });
  });

  describe('getCredentialCount', () => {
    it('should return 0 when no credentials', async () => {
      const count = await store.getCredentialCount();
      expect(count).toBe(0);
    });

    it('should return correct count', async () => {
      await store.storeCredential(mockCredential);
      await store.storeCredential({ ...mockCredential, id: 'vc-2' });
      await store.storeCredential({ ...mockCredential, id: 'vc-3' });

      const count = await store.getCredentialCount();
      expect(count).toBe(3);
    });

    it('should update count after deletion', async () => {
      await store.storeCredential(mockCredential);
      await store.storeCredential({ ...mockCredential, id: 'vc-2' });

      let count = await store.getCredentialCount();
      expect(count).toBe(2);

      await store.deleteCredential('vc-test-123');

      count = await store.getCredentialCount();
      expect(count).toBe(1);
    });
  });

  describe('close', () => {
    it('should close database connection', () => {
      expect(() => store.close()).not.toThrow();
    });

    it('should be able to reopen after closing', () => {
      store.close();
      const newStore = new CredentialStore(testDbPath);
      expect(newStore).toBeDefined();
      newStore.close();
    });
  });

  describe('data persistence', () => {
    it('should persist credentials across database instances', async () => {
      await store.storeCredential(mockCredential);
      store.close();

      const newStore = new CredentialStore(testDbPath);
      const retrieved = await newStore.getCredential('vc-test-123');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('vc-test-123');

      newStore.close();
    });
  });

  describe('edge cases', () => {
    it('should handle credentials with complex nested structures', async () => {
      const complexCredential = {
        ...mockCredential,
        credentialSubject: {
          id: 'did:peer:holder456',
          name: 'Test User',
          nested: {
            deep: {
              value: 'complex'
            }
          }
        }
      };

      await store.storeCredential(complexCredential);

      const retrieved = await store.getCredential('vc-test-123');
      expect(retrieved!.credential.credentialSubject.nested.deep.value).toBe('complex');
    });

    it('should handle credentials with special characters', async () => {
      const specialCredential = {
        ...mockCredential,
        id: 'vc-special-!@#$%',
        credentialSubject: {
          id: 'did:peer:holder456',
          name: "O'Brien"
        }
      };

      await store.storeCredential(specialCredential);

      const retrieved = await store.getCredential('vc-special-!@#$%');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.credential.credentialSubject.name).toBe("O'Brien");
    });

    it('should handle large number of credentials', async () => {
      const credentials = [];
      for (let i = 0; i < 100; i++) {
        credentials.push({
          ...mockCredential,
          id: `vc-${i}`
        });
      }

      for (const cred of credentials) {
        await store.storeCredential(cred);
      }

      const count = await store.getCredentialCount();
      expect(count).toBe(100);

      const all = await store.getAllCredentials();
      expect(all).toHaveLength(100);
    });
  });
});

