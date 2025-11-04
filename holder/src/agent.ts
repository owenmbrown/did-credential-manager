/**
 * Holder Agent
 * 
 * Main holder agent with credential storage and DIDComm support
 * 
 * @module agent
 */

import { createAgent, IResolver, ICredentialPlugin } from '@veramo/core';
import { CredentialPlugin } from '@veramo/credential-w3c';
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { Resolver } from 'did-resolver';
import {
  DIDComm,
  PrefixResolver,
  EphemeralSecretsResolver,
  logger,
} from '@did-edu/common';
import { CredentialStore, StoredCredential } from './storage/credential-store.js';
import { VPBuilder, PresentationOptions } from './presentation/vp-builder.js';

/**
 * Agent configuration
 */
export interface HolderAgentConfig {
  serviceEndpoint: string;
  dbPath?: string;
  did?: string;
}

/**
 * Holder Agent class
 */
export class HolderAgent {
  private veramoAgent: any;
  private didcomm: DIDComm;
  private credentialStore: CredentialStore;
  private holderDid: string | null = null;
  private secretsResolver: EphemeralSecretsResolver;
  private serviceEndpoint: string;

  constructor(config: HolderAgentConfig) {
    this.serviceEndpoint = config.serviceEndpoint;
    this.secretsResolver = new EphemeralSecretsResolver();
    this.didcomm = new DIDComm(this.secretsResolver);
    this.credentialStore = new CredentialStore(config.dbPath);

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
    this.veramoAgent = createAgent<IResolver & ICredentialPlugin>({
      plugins: [
        new DIDResolverPlugin({ resolver: didResolver }),
        new CredentialPlugin(),
      ],
    });

    // Initialize with provided DID
    if (config.did) {
      this.holderDid = config.did;
    }
  }

  /**
   * Initialize the agent
   */
  async initialize(serviceEndpoint?: string): Promise<string> {
    if (!this.holderDid) {
      logger.info('Generating new holder DID...');
      this.holderDid = await this.didcomm.generateDid(
        serviceEndpoint || this.serviceEndpoint
      );
      logger.info(`Holder DID created: ${this.holderDid}`);
    }
    return this.holderDid!;
  }

  /**
   * Get the holder DID
   */
  getDid(): string {
    if (!this.holderDid) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }
    return this.holderDid!;
  }

  /**
   * Get the DIDComm instance
   */
  getDIDComm(): DIDComm {
    return this.didcomm;
  }

  /**
   * Get the credential store
   */
  getCredentialStore(): CredentialStore {
    return this.credentialStore;
  }

  /**
   * Store a credential
   */
  async storeCredential(credential: any): Promise<void> {
    await this.credentialStore.storeCredential(credential);
    logger.info('Credential stored successfully');
  }

  /**
   * Get all stored credentials
   */
  async getCredentials(): Promise<StoredCredential[]> {
    return this.credentialStore.getAllCredentials();
  }

  /**
   * Get a specific credential
   */
  async getCredential(id: string): Promise<StoredCredential | null> {
    return this.credentialStore.getCredential(id);
  }

  /**
   * Delete a credential
   */
  async deleteCredential(id: string): Promise<boolean> {
    return this.credentialStore.deleteCredential(id);
  }

  /**
   * Create a Verifiable Presentation
   */
  async createPresentation(options: Omit<PresentationOptions, 'holderDid'>): Promise<any> {
    if (!this.holderDid) {
      throw new Error('Agent not initialized');
    }

    return VPBuilder.createPresentation({
      ...options,
      holderDid: this.holderDid,
    });
  }

  /**
   * Request credential from issuer via DIDComm
   */
  async requestCredential(params: {
    issuerDid: string;
    credentialType: string[];
    claims?: { [key: string]: any };
  }): Promise<void> {
    if (!this.holderDid) {
      throw new Error('Agent not initialized');
    }

    const requestMessage = {
      type: 'https://didcomm.org/issue-credential/3.0/request-credential',
      body: {
        credential_types: params.credentialType,
        ...(params.claims && { claims: params.claims }),
      },
    };

    await this.didcomm.sendMessage(params.issuerDid, this.holderDid, requestMessage);
    logger.info(`Credential request sent to ${params.issuerDid}`);
  }

  /**
   * Send presentation to verifier via DIDComm
   */
  async sendPresentation(params: {
    verifierDid: string;
    presentation: any;
    threadId?: string;
  }): Promise<void> {
    if (!this.holderDid) {
      throw new Error('Agent not initialized');
    }

    const presentationMessage = {
      type: 'https://didcomm.org/present-proof/3.0/presentation',
      ...(params.threadId && { thid: params.threadId }),
      body: {
        verifiable_presentation: params.presentation,
      },
    };

    await this.didcomm.sendMessage(params.verifierDid, this.holderDid, presentationMessage);
    logger.info(`Presentation sent to ${params.verifierDid}`);
  }

  /**
   * Handle incoming DIDComm message
   */
  async handleMessage(packedMessage: string): Promise<any> {
    const [message] = await this.didcomm.receiveMessage(packedMessage);
    const plaintext = message.as_value();

    logger.info(`Received message: ${plaintext.type}`);

    // Handle different message types
    switch (plaintext.type) {
      case 'https://didcomm.org/issue-credential/3.0/offer-credential':
        return await this.handleCredentialOffer(plaintext);

      case 'https://didcomm.org/issue-credential/3.0/issue-credential':
        return await this.handleCredentialIssuance(plaintext);

      case 'https://didcomm.org/present-proof/3.0/request-presentation':
        return await this.handlePresentationRequest(plaintext);

      case 'https://didcomm.org/trust-ping/2.0/ping':
        return await this.handleTrustPing(plaintext);

      default:
        logger.warn(`Unknown message type: ${plaintext.type}`);
        return null;
    }
  }

  /**
   * Handle credential offer
   */
  private async handleCredentialOffer(message: any): Promise<void> {
    if (!this.holderDid) {
      throw new Error('Agent not initialized');
    }

    logger.info('Received credential offer', {
      from: message.from,
      credentialPreview: message.body?.credential_preview,
    });

    // Auto-accept offer by requesting the credential
    const requestMessage = {
      type: 'https://didcomm.org/issue-credential/3.0/request-credential',
      thid: message.id,
      body: {},
    };

    await this.didcomm.sendMessage(message.from, this.holderDid, requestMessage);
    logger.info('Credential request sent in response to offer');
  }

  /**
   * Handle credential issuance
   */
  private async handleCredentialIssuance(message: any): Promise<void> {
    logger.info('Received credential', {
      from: message.from,
    });

    const credentials = message.body?.credentials || [];
    
    if (credentials.length === 0) {
      logger.warn('No credentials in issuance message');
      return;
    }

    // Store all credentials
    for (const credential of credentials) {
      await this.storeCredential(credential);
      logger.info(`Credential stored: ${credential.type || 'VerifiableCredential'}`);
    }

    // Send acknowledgment
    const ackMessage = {
      type: 'https://didcomm.org/issue-credential/3.0/ack',
      thid: message.id,
      body: {
        status: 'OK',
      },
    };

    await this.didcomm.sendMessage(message.from, this.holderDid!, ackMessage);
  }

  /**
   * Handle presentation request
   */
  private async handlePresentationRequest(message: any): Promise<void> {
    if (!this.holderDid) {
      throw new Error('Agent not initialized');
    }

    logger.info('Received presentation request', {
      from: message.from,
      body: message.body,
    });

    // Get all stored credentials
    const storedCredentials = await this.credentialStore.getAllCredentials();
    const credentials = storedCredentials.map(sc => sc.credential);

    if (credentials.length === 0) {
      logger.warn('No credentials available for presentation');
      // Send problem report
      const problemMessage = {
        type: 'https://didcomm.org/present-proof/3.0/problem-report',
        thid: message.id,
        body: {
          code: 'no-credentials',
          comment: 'No credentials available',
        },
      };
      await this.didcomm.sendMessage(message.from, this.holderDid, problemMessage);
      return;
    }

    // Create presentation from request
    try {
      const presentation = await VPBuilder.createPresentationFromRequest(
        this.holderDid,
        message,
        credentials
      );

      // Send presentation
      await this.sendPresentation({
        verifierDid: message.from,
        presentation,
        threadId: message.id,
      });

      logger.info('Presentation sent successfully');
    } catch (error: any) {
      logger.error('Error creating presentation:', error);
      
      // Send problem report
      const problemMessage = {
        type: 'https://didcomm.org/present-proof/3.0/problem-report',
        thid: message.id,
        body: {
          code: 'presentation-error',
          comment: error.message,
        },
      };
      await this.didcomm.sendMessage(message.from, this.holderDid, problemMessage);
    }
  }

  /**
   * Handle trust ping
   */
  private async handleTrustPing(message: any): Promise<void> {
    if (!this.holderDid) {
      throw new Error('Agent not initialized');
    }

    if (message.body?.response_requested !== false) {
      const responseMessage = {
        type: 'https://didcomm.org/trust-ping/2.0/ping-response',
        thid: message.id,
        body: {},
      };

      await this.didcomm.sendMessage(message.from, this.holderDid, responseMessage);
      logger.info(`Trust ping response sent to ${message.from}`);
    }
  }

  /**
   * Close the agent
   */
  close(): void {
    this.credentialStore.close();
    logger.info('Holder agent closed');
  }
}

/**
 * Create and initialize a holder agent
 */
export async function createHolderAgent(config: HolderAgentConfig): Promise<HolderAgent> {
  const agent = new HolderAgent(config);
  await agent.initialize(config.serviceEndpoint);
  return agent;
}

