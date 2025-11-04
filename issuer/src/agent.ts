/**
 * Issuer Agent Setup
 * 
 * Configures the Veramo agent for credential issuance with did:peer support
 * 
 * @module agent
 */

import { createAgent, IResolver } from '@veramo/core';
import { CredentialPlugin, ICredentialIssuer } from '@veramo/credential-w3c';
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { Resolver } from 'did-resolver';
import { 
  DIDComm, 
  PrefixResolver,
  EphemeralSecretsResolver,
  logger
} from '@did-edu/common';

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  serviceEndpoint: string;
  did?: string;
}

/**
 * Issuer agent class
 */
export class IssuerAgent {
  private veramoAgent: any;
  private didcomm: DIDComm;
  private issuerDid: string | null = null;
  private secretsResolver: EphemeralSecretsResolver;

  constructor(config: AgentConfig) {
    this.secretsResolver = new EphemeralSecretsResolver();
    this.didcomm = new DIDComm(this.secretsResolver);

    // Create a custom resolver that uses our PrefixResolver
    const prefixResolver = new PrefixResolver();
    const didResolver = new Resolver({
      // Wrap our resolver to match did-resolver interface
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

    // Create Veramo agent with minimal plugins
    this.veramoAgent = createAgent<IResolver & ICredentialIssuer>({
      plugins: [
        new DIDResolverPlugin({
          resolver: didResolver,
        }),
        new CredentialPlugin(),
      ],
    });

    // Initialize with provided DID or generate new one
    if (config.did) {
      this.issuerDid = config.did;
    }
  }

  /**
   * Initialize the agent (generate DID if needed)
   */
  async initialize(serviceEndpoint: string): Promise<string> {
    if (!this.issuerDid) {
      logger.info('Generating new issuer DID...');
      this.issuerDid = await this.didcomm.generateDid(serviceEndpoint);
      logger.info(`Issuer DID created: ${this.issuerDid}`);
    }
    return this.issuerDid!;
  }

  /**
   * Get the issuer DID
   */
  getDid(): string {
    if (!this.issuerDid) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }
    return this.issuerDid;
  }

  /**
   * Get the DIDComm instance
   */
  getDIDComm(): DIDComm {
    return this.didcomm;
  }

  /**
   * Issue a Verifiable Credential
   */
  async issueCredential(params: {
    credentialSubject: {
      id: string;
      [key: string]: any;
    };
    type?: string[];
    expirationDate?: string;
  }): Promise<any> {
    if (!this.issuerDid) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    const credential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', ...(params.type || [])],
      issuer: { id: this.issuerDid },
      issuanceDate: new Date().toISOString(),
      ...(params.expirationDate && { expirationDate: params.expirationDate }),
      credentialSubject: params.credentialSubject,
    };

    // For now, return unsigned credential
    // TODO: Implement proper signing with did:peer keys
    logger.info('Issuing credential', {
      issuer: this.issuerDid,
      subject: params.credentialSubject.id,
      type: credential.type,
    });

    return {
      ...credential,
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        proofPurpose: 'assertionMethod',
        verificationMethod: `${this.issuerDid}#key-1`,
        // TODO: Add actual signature
      },
    };
  }

  /**
   * Send credential offer via DIDComm
   */
  async sendCredentialOffer(params: {
    holderDid: string;
    credentialType: string[];
    claims: { [key: string]: any };
  }): Promise<void> {
    if (!this.issuerDid) {
      throw new Error('Agent not initialized');
    }

    const offerMessage = {
      type: 'https://didcomm.org/issue-credential/3.0/offer-credential',
      body: {
        credential_preview: {
          type: params.credentialType,
          attributes: Object.entries(params.claims).map(([name, value]) => ({
            name,
            value,
          })),
        },
      },
    };

    await this.didcomm.sendMessage(params.holderDid, this.issuerDid, offerMessage);
    logger.info(`Credential offer sent to ${params.holderDid}`);
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
      case 'https://didcomm.org/issue-credential/3.0/request-credential':
        return await this.handleCredentialRequest(plaintext);

      case 'https://didcomm.org/trust-ping/2.0/ping':
        return await this.handleTrustPing(plaintext);

      default:
        logger.warn(`Unknown message type: ${plaintext.type}`);
        return null;
    }
  }

  /**
   * Handle credential request
   */
  private async handleCredentialRequest(message: any): Promise<void> {
    if (!this.issuerDid) {
      throw new Error('Agent not initialized');
    }

    const holderDid = message.from;
    logger.info(`Processing credential request from ${holderDid}`);

    // TODO: Extract credential details from request
    // For now, issue a simple credential
    const credential = await this.issueCredential({
      credentialSubject: {
        id: holderDid,
        // Add claims based on request
      },
    });

    // Send credential back via DIDComm
    const issueMessage = {
      type: 'https://didcomm.org/issue-credential/3.0/issue-credential',
      thid: message.id, // Thread ID from request
      body: {
        credentials: [credential],
      },
    };

    await this.didcomm.sendMessage(holderDid, this.issuerDid, issueMessage);
    logger.info(`Credential issued to ${holderDid}`);
  }

  /**
   * Handle trust ping
   */
  private async handleTrustPing(message: any): Promise<void> {
    if (!this.issuerDid) {
      throw new Error('Agent not initialized');
    }

    if (message.body?.response_requested !== false) {
      const responseMessage = {
        type: 'https://didcomm.org/trust-ping/2.0/ping-response',
        thid: message.id,
        body: {},
      };

      await this.didcomm.sendMessage(message.from, this.issuerDid, responseMessage);
      logger.info(`Trust ping response sent to ${message.from}`);
    }
  }
}

/**
 * Create and initialize an issuer agent
 */
export async function createIssuerAgent(config: AgentConfig): Promise<IssuerAgent> {
  const agent = new IssuerAgent(config);
  await agent.initialize(config.serviceEndpoint);
  return agent;
}

