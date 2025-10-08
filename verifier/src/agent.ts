/**
 * Verifier Agent
 * 
 * Main verifier agent with presentation verification and DIDComm support
 * 
 * @module agent
 */

import { createAgent, IResolver } from '@veramo/core';
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { Resolver } from 'did-resolver';
import {
  DIDComm,
  DID,
  PrefixResolver,
  EphemeralSecretsResolver,
  generateDid,
  logger,
} from '@did-edu/common';
import { ChallengeManager, Challenge } from './challenge/challenge-manager';
import { Verifier, VerificationPolicy, VerificationResult } from './verification/verifier';

/**
 * Agent configuration
 */
export interface VerifierAgentConfig {
  serviceEndpoint: string;
  did?: string;
  policy?: VerificationPolicy;
  challengeTTL?: number;
}

/**
 * Presentation request options
 */
export interface PresentationRequestOptions {
  holderDid: string;
  credentialTypes?: string[];
  fields?: string[];
  trustedIssuers?: string[];
  challenge?: string;
  domain?: string;
}

/**
 * Verifier Agent class
 */
export class VerifierAgent {
  private veramoAgent: any;
  private didcomm: DIDComm;
  private challengeManager: ChallengeManager;
  private verifier: Verifier;
  private verifierDid: string | null = null;
  private secretsResolver: EphemeralSecretsResolver;
  private serviceEndpoint: string;

  constructor(config: VerifierAgentConfig) {
    this.serviceEndpoint = config.serviceEndpoint;
    this.secretsResolver = new EphemeralSecretsResolver();
    this.didcomm = new DIDComm(this.secretsResolver);
    this.challengeManager = new ChallengeManager(config.challengeTTL || 5);
    this.verifier = new Verifier(config.policy);

    // Create resolver
    const prefixResolver = new PrefixResolver();
    const didResolver = new Resolver({
      peer: async (did: string) => {
        const doc = await prefixResolver.resolve(did);
        if (!doc) {
          throw new Error(`Could not resolve DID: ${did}`);
        }
        return {
          didDocument: doc,
          didDocumentMetadata: {},
          didResolutionMetadata: { contentType: 'application/did+ld+json' },
        };
      },
    });

    // Create Veramo agent
    this.veramoAgent = createAgent<IResolver>({
      plugins: [
        new DIDResolverPlugin({ resolver: didResolver }),
      ],
    });

    // Initialize with provided DID
    if (config.did) {
      this.verifierDid = config.did;
    }
  }

  /**
   * Initialize the agent
   */
  async initialize(serviceEndpoint?: string): Promise<string> {
    if (!this.verifierDid) {
      logger.info('Generating new verifier DID...');
      this.verifierDid = await this.didcomm.generateDid(
        serviceEndpoint || this.serviceEndpoint
      );
      logger.info(`Verifier DID created: ${this.verifierDid}`);
    }
    return this.verifierDid;
  }

  /**
   * Get the verifier DID
   */
  getDid(): string {
    if (!this.verifierDid) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }
    return this.verifierDid;
  }

  /**
   * Get the DIDComm instance
   */
  getDIDComm(): DIDComm {
    return this.didcomm;
  }

  /**
   * Get the challenge manager
   */
  getChallengeManager(): ChallengeManager {
    return this.challengeManager;
  }

  /**
   * Get the verifier
   */
  getVerifier(): Verifier {
    return this.verifier;
  }

  /**
   * Generate a challenge for presentation request
   */
  generateChallenge(options?: {
    holderDid?: string;
    domain?: string;
    ttlMinutes?: number;
  }): Challenge {
    return this.challengeManager.generateChallenge(options);
  }

  /**
   * Verify a credential
   */
  async verifyCredential(credential: any): Promise<VerificationResult> {
    return this.verifier.verifyCredential(credential);
  }

  /**
   * Verify a presentation
   */
  async verifyPresentation(
    presentation: any,
    options?: {
      challenge?: string;
      domain?: string;
    }
  ): Promise<VerificationResult> {
    return this.verifier.verifyPresentation(presentation, options);
  }

  /**
   * Verify presentation with challenge
   */
  async verifyPresentationWithChallenge(
    presentation: any,
    challengeId: string
  ): Promise<VerificationResult> {
    const challenge = this.challengeManager.getChallenge(challengeId);
    
    if (!challenge) {
      return {
        verified: false,
        errors: ['Challenge not found or expired'],
        warnings: [],
      };
    }

    const result = await this.verifier.verifyPresentationWithChallenge(
      presentation,
      challenge.challenge,
      { domain: challenge.domain }
    );

    // Consume challenge if verification successful
    if (result.verified) {
      this.challengeManager.consumeChallenge(challengeId);
    }

    return result;
  }

  /**
   * Request presentation from holder via DIDComm
   */
  async requestPresentation(options: PresentationRequestOptions): Promise<Challenge> {
    if (!this.verifierDid) {
      throw new Error('Agent not initialized');
    }

    // Generate challenge if not provided
    const challenge = options.challenge
      ? this.challengeManager.generateChallenge({
          holderDid: options.holderDid,
          domain: options.domain,
          metadata: { challenge: options.challenge },
        })
      : this.challengeManager.generateChallenge({
          holderDid: options.holderDid,
          domain: options.domain,
        });

    // Build request message
    const requestMessage = {
      type: 'https://didcomm.org/present-proof/3.0/request-presentation',
      body: {
        challenge: challenge.challenge,
        ...(options.domain && { domain: options.domain }),
        ...(options.credentialTypes && { credential_types: options.credentialTypes }),
        ...(options.fields && { fields: options.fields }),
        ...(options.trustedIssuers && { trusted_issuers: options.trustedIssuers }),
      },
    };

    await this.didcomm.sendMessage(options.holderDid, this.verifierDid, requestMessage);
    logger.info(`Presentation request sent to ${options.holderDid}`, {
      challengeId: challenge.id,
    });

    return challenge;
  }

  /**
   * Handle incoming DIDComm message
   */
  async handleMessage(packedMessage: string): Promise<any> {
    const [message, metadata] = await this.didcomm.receiveMessage(packedMessage);
    const plaintext = message.as_value();

    logger.info(`Received message: ${plaintext.type}`);

    // Handle different message types
    switch (plaintext.type) {
      case 'https://didcomm.org/present-proof/3.0/presentation':
        return await this.handlePresentation(plaintext);

      case 'https://didcomm.org/present-proof/3.0/problem-report':
        return await this.handleProblemReport(plaintext);

      case 'https://didcomm.org/trust-ping/2.0/ping':
        return await this.handleTrustPing(plaintext);

      default:
        logger.warn(`Unknown message type: ${plaintext.type}`);
        return null;
    }
  }

  /**
   * Handle presentation from holder
   */
  private async handlePresentation(message: any): Promise<VerificationResult> {
    if (!this.verifierDid) {
      throw new Error('Agent not initialized');
    }

    logger.info('Received presentation', {
      from: message.from,
      threadId: message.thid,
    });

    const presentation = message.body?.verifiable_presentation;
    
    if (!presentation) {
      logger.error('No presentation in message body');
      return {
        verified: false,
        errors: ['No presentation in message body'],
        warnings: [],
      };
    }

    // Verify the presentation
    // If this is in response to a request (has thread ID), verify with challenge
    let result: VerificationResult;
    
    if (message.thid) {
      // This is a response to our request, verify with challenge
      result = await this.verifyPresentationWithChallenge(presentation, message.thid);
    } else {
      // Unsolicited presentation, verify without challenge
      result = await this.verifyPresentation(presentation);
    }

    // Send verification result back to holder
    const resultMessage = {
      type: 'https://didcomm.org/present-proof/3.0/ack',
      thid: message.id,
      body: {
        status: result.verified ? 'OK' : 'REJECTED',
        verified: result.verified,
        errors: result.errors,
        warnings: result.warnings,
      },
    };

    await this.didcomm.sendMessage(message.from, this.verifierDid, resultMessage);
    logger.info(`Verification result sent to ${message.from}`, {
      verified: result.verified,
    });

    return result;
  }

  /**
   * Handle problem report from holder
   */
  private async handleProblemReport(message: any): Promise<void> {
    logger.warn('Received problem report', {
      from: message.from,
      code: message.body?.code,
      comment: message.body?.comment,
    });
  }

  /**
   * Handle trust ping
   */
  private async handleTrustPing(message: any): Promise<void> {
    if (!this.verifierDid) {
      throw new Error('Agent not initialized');
    }

    if (message.body?.response_requested !== false) {
      const responseMessage = {
        type: 'https://didcomm.org/trust-ping/2.0/ping-response',
        thid: message.id,
        body: {},
      };

      await this.didcomm.sendMessage(message.from, this.verifierDid, responseMessage);
      logger.info(`Trust ping response sent to ${message.from}`);
    }
  }

  /**
   * Update verification policy
   */
  updatePolicy(policy: Partial<VerificationPolicy>): void {
    this.verifier.updatePolicy(policy);
  }

  /**
   * Get current policy
   */
  getPolicy(): VerificationPolicy {
    return this.verifier.getPolicy();
  }

  /**
   * Close the agent
   */
  close(): void {
    this.challengeManager.stop();
    logger.info('Verifier agent closed');
  }
}

/**
 * Create and initialize a verifier agent
 */
export async function createVerifierAgent(config: VerifierAgentConfig): Promise<VerifierAgent> {
  const agent = new VerifierAgent(config);
  await agent.initialize(config.serviceEndpoint);
  return agent;
}

