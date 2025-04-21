import { randomBytes } from 'crypto';

/**
 * Represents a single challenge string used for Verifiable Presentations.
 * Helps prevent replay attacks by enforcing expiration and one-time use.
 */
interface Challenge {
  /** The challenge string (randomly generated) */
  challenge: string;

  /** The timestamp when the challenge was created (ms since epoch) */
  createdAt: number;

  /** The timestamp when the challenge will expire (ms since epoch) */
  expiresAt: number;

  /** Whether the challenge has already been used */
  used: boolean;
}

/**
 * Challenge expiration duration in milliseconds (1 minute).
 */
const EXPIRATION_TIMESPAN = 60000; // 1 minute

/**
 * Manages one-time use challenge strings for Verifiable Presentations.
 *
 * This helps prevent replay attacks by issuing random challenges that expire after 60 seconds
 * and can only be used once.
 */
export class ChallengeManager {
  /**
   * Internal in-memory store of all active challenges.
   */
  private challenges: Map<string, Challenge> = new Map();

  /**
   * Generates a random challenge string using secure random bytes (base64url encoded).
   * This is used as a nonce in the Verifiable Presentation flow.
   *
   * @returns A unique challenge string.
   */
  private generageChallengeSting(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Creates and stores a new challenge string with expiration and usage tracking.
   * The challenge is valid for 1 minute and is deleted after it expires.
   *
   * @returns The generated challenge string.
   */
  createChallenge(): string {
    const challenge = this.generageChallengeSting();
    const currentTimestamp = Date.now();

    this.challenges.set(challenge, {
      challenge,
      createdAt: currentTimestamp,
      expiresAt: currentTimestamp + EXPIRATION_TIMESPAN,
      used: false,
    });

    // Auto-cleanup after expiration
    setTimeout(() => {
      this.challenges.delete(challenge);
    }, EXPIRATION_TIMESPAN);

    return challenge;
  }

  /**
   * Verifies that a challenge is valid:
   * - It exists
   * - It has not expired
   * - It has not already been used
   *
   * If valid, the challenge is marked as used.
   *
   * @param challenge - The challenge string to verify.
   * @returns `true` if the challenge is valid and unused; otherwise `false`.
   */
  verifyChallenge(challenge: string): boolean {
    const storedChallenge = this.challenges.get(challenge);
    if (!storedChallenge) return false;

    const currentTimestamp = Date.now();
    if (currentTimestamp > storedChallenge.expiresAt || storedChallenge.used) return false;

    storedChallenge.used = true;
    return true;
  }
}
