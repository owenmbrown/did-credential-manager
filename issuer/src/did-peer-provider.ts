/**
 * DID:Peer Provider for Veramo
 * 
 * Custom Veramo DID provider for did:peer method
 * 
 * @module did-peer-provider
 */

import { AbstractIdentifierProvider } from '@veramo/did-manager';
import { IIdentifier, IKey, IService, IAgentContext, IKeyManager } from '@veramo/core';
import { generateDid, DIDPeer4 } from '@did-edu/common';

type IContext = IAgentContext<IKeyManager>;

/**
 * DID:Peer Provider for Veramo DID Manager
 */
export class DIDPeerProvider extends AbstractIdentifierProvider {
  private defaultKms: string;
  private serviceEndpoint: string;

  constructor(options: { defaultKms: string; serviceEndpoint: string }) {
    super();
    this.defaultKms = options.defaultKms;
    this.serviceEndpoint = options.serviceEndpoint;
  }

  /**
   * Create a new did:peer:4 identifier
   */
  async createIdentifier(
    { kms, options }: { kms?: string; options?: any },
    context: IContext
  ): Promise<Omit<IIdentifier, 'provider'>> {
    // Generate did:peer:4 with our common package
    const { did, secrets } = await generateDid(this.serviceEndpoint);

    // Extract keys from the DID document
    const didDoc = await DIDPeer4.resolve(did);

    // Create Veramo-compatible keys
    const keys: IKey[] = [];

    // Add verification key (Ed25519)
    if (didDoc.verificationMethod && didDoc.verificationMethod.length > 0) {
      const verificationMethod = didDoc.verificationMethod[0];
      keys.push({
        kid: verificationMethod.id,
        kms: kms || this.defaultKms,
        type: 'Ed25519',
        publicKeyHex: '', // We'll store the multibase encoded key
        meta: {
          algorithms: ['EdDSA', 'Ed25519'],
          publicKeyMultibase: verificationMethod.publicKeyMultibase,
        },
      });
    }

    // Add encryption key (X25519)
    if (didDoc.verificationMethod && didDoc.verificationMethod.length > 1) {
      const keyAgreementMethod = didDoc.verificationMethod[1];
      keys.push({
        kid: keyAgreementMethod.id,
        kms: kms || this.defaultKms,
        type: 'X25519',
        publicKeyHex: '',
        meta: {
          algorithms: ['ECDH', 'ECDH-ES'],
          publicKeyMultibase: keyAgreementMethod.publicKeyMultibase,
        },
      });
    }

    // Create services
    const services: IService[] = [];
    if (didDoc.service) {
      didDoc.service.forEach((service: any) => {
        services.push({
          id: service.id,
          type: service.type,
          serviceEndpoint: service.serviceEndpoint.uri || service.serviceEndpoint,
          description: 'DIDComm messaging service',
        });
      });
    }

    // Store the secrets in a way Veramo can access them
    // Note: In production, these should be stored securely
    const privateKeyData = {
      secrets: secrets,
    };

    return {
      did,
      controllerKeyId: keys[0]?.kid,
      keys,
      services,
    };
  }

  /**
   * Delete a did:peer identifier (not supported for did:peer)
   */
  async deleteIdentifier(
    identifier: IIdentifier,
    context: IContext
  ): Promise<boolean> {
    // did:peer identifiers cannot be deleted from a registry
    // They simply cease to be used
    return true;
  }

  /**
   * Add a key to an existing identifier (not supported for did:peer)
   */
  async addKey(
    { identifier, key, options }: { identifier: IIdentifier; key: IKey; options?: any },
    context: IContext
  ): Promise<any> {
    throw new Error('Adding keys to did:peer identifiers is not supported. Create a new DID instead.');
  }

  /**
   * Add a service to an existing identifier (not supported for did:peer)
   */
  async addService(
    { identifier, service, options }: { identifier: IIdentifier; service: IService; options?: any },
    context: IContext
  ): Promise<any> {
    throw new Error('Adding services to did:peer identifiers is not supported. Create a new DID instead.');
  }

  /**
   * Remove a key from an identifier (not supported for did:peer)
   */
  async removeKey(
    args: { identifier: IIdentifier; kid: string; options?: any },
    context: IContext
  ): Promise<any> {
    throw new Error('Removing keys from did:peer identifiers is not supported.');
  }

  /**
   * Remove a service from an identifier (not supported for did:peer)
   */
  async removeService(
    args: { identifier: IIdentifier; id: string; options?: any },
    context: IContext
  ): Promise<any> {
    throw new Error('Removing services from did:peer identifiers is not supported.');
  }
}

