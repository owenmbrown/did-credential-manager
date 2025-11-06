/**
 * Tests for Challenge Manager
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ChallengeManager, Challenge } from './challenge-manager.js';

describe('ChallengeManager', () => {
  let manager: ChallengeManager;

  beforeEach(() => {
    manager = new ChallengeManager();
  });

  afterEach(() => {
    manager.stop();
  });

  describe('constructor', () => {
    it('should create a manager with default TTL of 5 minutes', () => {
      const challenge = manager.generateChallenge();
      const expectedExpiry = new Date(challenge.createdAt.getTime() + 5 * 60000);
      
      expect(challenge.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });

    it('should create a manager with custom TTL', () => {
      const customManager = new ChallengeManager(10);
      const challenge = customManager.generateChallenge();
      const expectedExpiry = new Date(challenge.createdAt.getTime() + 10 * 60000);
      
      expect(challenge.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
      customManager.stop();
    });
  });

  describe('generateChallenge', () => {
    it('should generate a challenge with required fields', () => {
      const challenge = manager.generateChallenge();

      expect(challenge).toBeDefined();
      expect(challenge.id).toBeDefined();
      expect(challenge.challenge).toBeDefined();
      expect(challenge.createdAt).toBeInstanceOf(Date);
      expect(challenge.expiresAt).toBeInstanceOf(Date);
      expect(challenge.expiresAt.getTime()).toBeGreaterThan(challenge.createdAt.getTime());
    });

    it('should generate unique challenges', () => {
      const challenge1 = manager.generateChallenge();
      const challenge2 = manager.generateChallenge();

      expect(challenge1.id).not.toBe(challenge2.id);
      expect(challenge1.challenge).not.toBe(challenge2.challenge);
    });

    it('should generate a challenge with holderDid option', () => {
      const holderDid = 'did:peer:holder123';
      const challenge = manager.generateChallenge({ holderDid });

      expect(challenge.holderDid).toBe(holderDid);
    });

    it('should generate a challenge with domain option', () => {
      const domain = 'https://verifier.example.com';
      const challenge = manager.generateChallenge({ domain });

      expect(challenge.domain).toBe(domain);
    });

    it('should generate a challenge with custom TTL', () => {
      const challenge = manager.generateChallenge({ ttlMinutes: 10 });
      const expectedExpiry = new Date(challenge.createdAt.getTime() + 10 * 60000);

      expect(challenge.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });

    it('should generate a challenge with metadata', () => {
      const metadata = { requestId: 'req-123', purpose: 'authentication' };
      const challenge = manager.generateChallenge({ metadata });

      expect(challenge.metadata).toEqual(metadata);
    });

    it('should generate a challenge with all options', () => {
      const options = {
        holderDid: 'did:peer:holder456',
        domain: 'https://verifier.example.com',
        ttlMinutes: 15,
        metadata: { sessionId: 'session-789' },
      };
      const challenge = manager.generateChallenge(options);

      expect(challenge.holderDid).toBe(options.holderDid);
      expect(challenge.domain).toBe(options.domain);
      expect(challenge.metadata).toEqual(options.metadata);
      const expectedExpiry = new Date(challenge.createdAt.getTime() + 15 * 60000);
      expect(challenge.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });
  });

  describe('getChallenge', () => {
    it('should return a valid challenge by ID', () => {
      const generated = manager.generateChallenge();
      const retrieved = manager.getChallenge(generated.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(generated.id);
      expect(retrieved?.challenge).toBe(generated.challenge);
    });

    it('should return null for non-existent challenge ID', () => {
      const retrieved = manager.getChallenge('non-existent-id');

      expect(retrieved).toBeNull();
    });

    it('should return null for expired challenge', () => {
      // Generate a challenge with 0.001 minute (60ms) TTL
      const challenge = manager.generateChallenge({ ttlMinutes: 0.001 });

      // Wait for it to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const retrieved = manager.getChallenge(challenge.id);
          expect(retrieved).toBeNull();
          resolve();
        }, 100);
      });
    });

    it('should delete expired challenges when accessed', () => {
      const challenge = manager.generateChallenge({ ttlMinutes: 0.001 });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          manager.getChallenge(challenge.id);
          const count = manager.getActiveChallengeCount();
          expect(count).toBe(0);
          resolve();
        }, 100);
      });
    });
  });

  describe('validateChallenge', () => {
    it('should validate a correct challenge', () => {
      const generated = manager.generateChallenge();
      const result = manager.validateChallenge(generated.id, generated.challenge);

      expect(result.valid).toBe(true);
      expect(result.challenge).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should reject an incorrect challenge string', () => {
      const generated = manager.generateChallenge();
      const result = manager.validateChallenge(generated.id, 'wrong-challenge');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid challenge');
      expect(result.challenge).toBeDefined();
    });

    it('should reject a non-existent challenge ID', () => {
      const result = manager.validateChallenge('non-existent', 'some-challenge');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Challenge not found or expired');
      expect(result.challenge).toBeUndefined();
    });

    it('should reject an expired challenge', () => {
      const challenge = manager.generateChallenge({ ttlMinutes: 0.001 });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = manager.validateChallenge(challenge.id, challenge.challenge);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Challenge not found or expired');
          resolve();
        }, 100);
      });
    });
  });

  describe('consumeChallenge', () => {
    it('should delete a challenge successfully', () => {
      const challenge = manager.generateChallenge();
      const deleted = manager.consumeChallenge(challenge.id);

      expect(deleted).toBe(true);
      expect(manager.getChallenge(challenge.id)).toBeNull();
    });

    it('should return false when deleting non-existent challenge', () => {
      const deleted = manager.consumeChallenge('non-existent-id');

      expect(deleted).toBe(false);
    });

    it('should prevent re-use after consumption', () => {
      const challenge = manager.generateChallenge();
      manager.consumeChallenge(challenge.id);

      const result = manager.validateChallenge(challenge.id, challenge.challenge);
      expect(result.valid).toBe(false);
    });
  });

  describe('getActiveChallengeCount', () => {
    it('should return 0 for new manager', () => {
      const count = manager.getActiveChallengeCount();
      expect(count).toBe(0);
    });

    it('should return correct count after generating challenges', () => {
      manager.generateChallenge();
      manager.generateChallenge();
      manager.generateChallenge();

      const count = manager.getActiveChallengeCount();
      expect(count).toBe(3);
    });

    it('should return correct count after consuming challenges', () => {
      const c1 = manager.generateChallenge();
      const c2 = manager.generateChallenge();
      manager.generateChallenge();

      manager.consumeChallenge(c1.id);
      manager.consumeChallenge(c2.id);

      const count = manager.getActiveChallengeCount();
      expect(count).toBe(1);
    });

    it('should not count expired challenges', () => {
      manager.generateChallenge({ ttlMinutes: 10 });
      manager.generateChallenge({ ttlMinutes: 0.001 });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const count = manager.getActiveChallengeCount();
          expect(count).toBe(1);
          resolve();
        }, 100);
      });
    });
  });

  describe('clearAll', () => {
    it('should clear all challenges', () => {
      manager.generateChallenge();
      manager.generateChallenge();
      manager.generateChallenge();

      manager.clearAll();

      const count = manager.getActiveChallengeCount();
      expect(count).toBe(0);
    });

    it('should work on empty manager', () => {
      expect(() => manager.clearAll()).not.toThrow();
      expect(manager.getActiveChallengeCount()).toBe(0);
    });
  });

  describe('stop', () => {
    it('should stop the cleanup interval', () => {
      const testManager = new ChallengeManager();
      expect(() => testManager.stop()).not.toThrow();
    });

    it('should be idempotent', () => {
      const testManager = new ChallengeManager();
      testManager.stop();
      expect(() => testManager.stop()).not.toThrow();
    });
  });

  describe('cleanup interval', () => {
    it('should automatically cleanup expired challenges', () => {
      const testManager = new ChallengeManager();
      testManager.generateChallenge({ ttlMinutes: 0.001 });
      testManager.generateChallenge({ ttlMinutes: 10 });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const count = testManager.getActiveChallengeCount();
          expect(count).toBe(1);
          testManager.stop();
          resolve();
        }, 150);
      });
    }, 10000);
  });

  describe('edge cases', () => {
    it('should handle very short TTL', () => {
      const challenge = manager.generateChallenge({ ttlMinutes: 0.0001 });
      expect(challenge.expiresAt.getTime()).toBeGreaterThan(challenge.createdAt.getTime());
    });

    it('should handle very long TTL', () => {
      const challenge = manager.generateChallenge({ ttlMinutes: 10000 });
      const expectedExpiry = new Date(challenge.createdAt.getTime() + 10000 * 60000);
      expect(challenge.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });

    it('should handle undefined metadata', () => {
      const challenge = manager.generateChallenge({ metadata: undefined });
      expect(challenge.metadata).toBeUndefined();
    });

    it('should handle null metadata', () => {
      const challenge = manager.generateChallenge({ metadata: null });
      expect(challenge.metadata).toBeNull();
    });

    it('should handle complex nested metadata', () => {
      const metadata = {
        level1: {
          level2: {
            level3: 'deep value',
            array: [1, 2, 3],
          },
        },
      };
      const challenge = manager.generateChallenge({ metadata });
      expect(challenge.metadata).toEqual(metadata);
    });
  });
});

