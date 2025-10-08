/**
 * Challenge Manager
 * 
 * Manages challenges for presentation requests
 * 
 * @module challenge/challenge-manager
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@did-edu/common';

export interface Challenge {
  id: string;
  challenge: string;
  createdAt: Date;
  expiresAt: Date;
  holderDid?: string;
  domain?: string;
  metadata?: any;
}

/**
 * Challenge Manager
 */
export class ChallengeManager {
  private challenges: Map<string, Challenge> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private ttlMinutes: number = 5) {
    // Cleanup expired challenges every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Generate a new challenge
   */
  generateChallenge(options?: {
    holderDid?: string;
    domain?: string;
    ttlMinutes?: number;
    metadata?: any;
  }): Challenge {
    const id = uuidv4();
    const challenge = uuidv4(); // Random challenge string
    const now = new Date();
    const ttl = options?.ttlMinutes || this.ttlMinutes;
    const expiresAt = new Date(now.getTime() + ttl * 60000);

    const challengeObj: Challenge = {
      id,
      challenge,
      createdAt: now,
      expiresAt,
      holderDid: options?.holderDid,
      domain: options?.domain,
      metadata: options?.metadata,
    };

    this.challenges.set(id, challengeObj);
    
    logger.info('Challenge generated', {
      id,
      holderDid: options?.holderDid,
      expiresIn: `${ttl} minutes`,
    });

    return challengeObj;
  }

  /**
   * Get a challenge by ID
   */
  getChallenge(id: string): Challenge | null {
    const challenge = this.challenges.get(id);
    
    if (!challenge) {
      return null;
    }

    // Check if expired
    if (new Date() > challenge.expiresAt) {
      this.challenges.delete(id);
      logger.warn('Challenge expired', { id });
      return null;
    }

    return challenge;
  }

  /**
   * Validate a challenge
   */
  validateChallenge(id: string, providedChallenge: string): {
    valid: boolean;
    challenge?: Challenge;
    error?: string;
  } {
    const challenge = this.getChallenge(id);

    if (!challenge) {
      return {
        valid: false,
        error: 'Challenge not found or expired',
      };
    }

    if (challenge.challenge !== providedChallenge) {
      logger.warn('Invalid challenge provided', { id });
      return {
        valid: false,
        challenge,
        error: 'Invalid challenge',
      };
    }

    logger.info('Challenge validated successfully', { id });
    return {
      valid: true,
      challenge,
    };
  }

  /**
   * Consume (delete) a challenge after successful validation
   */
  consumeChallenge(id: string): boolean {
    const deleted = this.challenges.delete(id);
    if (deleted) {
      logger.info('Challenge consumed', { id });
    }
    return deleted;
  }

  /**
   * Cleanup expired challenges
   */
  private cleanup(): void {
    const now = new Date();
    let count = 0;

    for (const [id, challenge] of this.challenges.entries()) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(id);
        count++;
      }
    }

    if (count > 0) {
      logger.info(`Cleaned up ${count} expired challenges`);
    }
  }

  /**
   * Get active challenge count
   */
  getActiveChallengeCount(): number {
    this.cleanup(); // Cleanup first
    return this.challenges.size;
  }

  /**
   * Clear all challenges
   */
  clearAll(): void {
    this.challenges.clear();
    logger.info('All challenges cleared');
  }

  /**
   * Stop the cleanup interval
   */
  stop(): void {
    clearInterval(this.cleanupInterval);
    logger.info('Challenge manager stopped');
  }
}

