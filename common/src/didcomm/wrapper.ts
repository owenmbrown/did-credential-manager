/**
 * DIDComm v2.1 Wrapper
 * 
 * Provides a simplified interface for DIDComm messaging with did:peer support.
 * 
 * @module wrapper
 */

import {
  ed25519,
  edwardsToMontgomeryPub,
  edwardsToMontgomeryPriv,
} from '@noble/curves/ed25519';
import * as DIDCommLib from 'didcomm';
import type {
  DIDResolver,
  DIDDoc,
  SecretsResolver,
  Secret,
  UnpackMetadata,
  PackEncryptedMetadata,
  MessagingServiceMetadata,
  IMessage,
  Service,
  Message as MessageType,
} from 'didcomm';
import DIDPeer from './peer2.js';
import * as DIDPeer4 from './peer4.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import * as multibase from 'multibase';
import * as multicodec from 'multicodec';

// Re-export Message class from didcomm
const { Message } = DIDCommLib;

export type DID = string;

/**
 * Convert X25519 key pair to DIDComm secret
 */
function x25519ToSecret(did: DID, x25519KeyPriv: Uint8Array, x25519Key: Uint8Array): Secret {
  const encIdent = 'key-2';
  const secretEnc: Secret = {
    id: `${did}#${encIdent}`,
    type: 'X25519KeyAgreementKey2020',
    privateKeyMultibase: DIDPeer.keyToMultibase(x25519KeyPriv, 'x25519-priv'),
  };
  return secretEnc;
}

/**
 * Convert Ed25519 key pair to DIDComm secret
 */
async function ed25519ToSecret(
  did: DID,
  ed25519KeyPriv: Uint8Array,
  ed25519Key: Uint8Array
): Promise<Secret> {
  const verIdent = 'key-1';
  const ed25519KeyPriv2 = new Uint8Array(ed25519Key.length + ed25519KeyPriv.length);
  ed25519KeyPriv2.set(ed25519KeyPriv);
  ed25519KeyPriv2.set(ed25519Key, ed25519KeyPriv.length);
  const secretVer: Secret = {
    id: `${did}#${verIdent}`,
    type: 'Ed25519VerificationKey2020',
    privateKeyMultibase: DIDPeer.keyToMultibase(ed25519KeyPriv2, 'ed25519-priv'),
  };
  return secretVer;
}

/**
 * Generate a did:peer:4 DID for a mediator (with queue endpoint)
 * 
 * @returns Object containing the DID and associated secrets
 */
export async function generateDidForMediator(): Promise<{ did: DID; secrets: Secret[] }> {
  const key = ed25519.utils.randomPrivateKey();
  const enckeyPriv = edwardsToMontgomeryPriv(key);
  const verkey = ed25519.getPublicKey(key);
  const enckey = edwardsToMontgomeryPub(verkey);
  const service = {
    type: 'DIDCommMessaging',
    id: '#service',
    serviceEndpoint: {
      uri: 'didcomm:transport/queue',
      accept: ['didcomm/v2'],
      routingKeys: [] as string[],
    },
  };

  const doc = {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/multikey/v1'],
    verificationMethod: [
      {
        id: '#key-1',
        type: 'Multikey',
        publicKeyMultibase: DIDPeer.keyToMultibase(verkey, 'ed25519-pub'),
      },
      {
        id: '#key-2',
        type: 'Multikey',
        publicKeyMultibase: DIDPeer.keyToMultibase(enckey, 'x25519-pub'),
      },
    ],
    authentication: ['#key-1'],
    capabilityDelegation: ['#key-1'],
    service: [service],
    keyAgreement: ['#key-2'],
  };

  const did = await DIDPeer4.encode(doc);

  const secretVer = await ed25519ToSecret(did, key, verkey);
  const secretEnc = x25519ToSecret(did, enckeyPriv, enckey);
  return { did, secrets: [secretVer, secretEnc] };
}

/**
 * Generate a did:peer:4 DID with routing
 * 
 * @param routingDid - The DID to use for routing (or HTTP endpoint)
 * @returns Object containing the DID and associated secrets
 */
export async function generateDid(routingDid: DID): Promise<{ did: DID; secrets: Secret[] }> {
  const key = ed25519.utils.randomPrivateKey();
  const enckeyPriv = edwardsToMontgomeryPriv(key);
  const verkey = ed25519.getPublicKey(key);
  const enckey = edwardsToMontgomeryPub(verkey);
  const service = {
    type: 'DIDCommMessaging',
    id: '#service',
    serviceEndpoint: {
      uri: routingDid,
      accept: ['didcomm/v2'],
    },
  };

  const doc = {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/multikey/v1'],
    verificationMethod: [
      {
        id: '#key-1',
        type: 'Multikey',
        publicKeyMultibase: DIDPeer.keyToMultibase(verkey, 'ed25519-pub'),
      },
      {
        id: '#key-2',
        type: 'Multikey',
        publicKeyMultibase: DIDPeer.keyToMultibase(enckey, 'x25519-pub'),
      },
    ],
    authentication: ['#key-1'],
    capabilityDelegation: ['#key-1'],
    service: [service],
    keyAgreement: ['#key-2'],
  };

  const did = await DIDPeer4.encode(doc);

  const secretVer = await ed25519ToSecret(did, key, verkey);
  const secretEnc = x25519ToSecret(did, enckeyPriv, enckey);
  return { did, secrets: [secretVer, secretEnc] };
}

/**
 * DID Peer 2 Resolver
 */
export class DIDPeerResolver implements DIDResolver {
  async resolve(did: DID): Promise<DIDDoc | null> {
    const raw_doc = DIDPeer.resolve(did);
    return {
      id: raw_doc.id,
      verificationMethod: raw_doc.verificationMethod,
      authentication: raw_doc.authentication,
      keyAgreement: raw_doc.keyAgreement,
      service: raw_doc.service,
    };
  }
}

/**
 * DID Peer 4 Resolver
 */
export class DIDPeer4Resolver implements DIDResolver {
  async resolve(did: DID): Promise<DIDDoc | null> {
    const raw_doc = await DIDPeer4.resolve(did);
    const fix_vms = async (vms: Array<Record<string, any>>) => {
      let methods = vms.map((k: Record<string, any>) => {
        let new_method = {
          id: `${did}${k.id}`,
          type: k.type,
          controller: k.controller,
          publicKeyMultibase: k.publicKeyMultibase,
        };
        if (new_method.type == 'Multikey') {
          const key = multibase.decode(k.publicKeyMultibase);
          const codec = multicodec.getNameFromData(key);
          switch (codec) {
            case 'x25519-pub':
              new_method.type = 'X25519KeyAgreementKey2020';
              break;
            case 'ed25519-pub':
              new_method.type = 'Ed25519VerificationKey2020';
              break;
          }
        }
        return new_method;
      });
      return methods;
    };
    const doc = {
      id: raw_doc.id,
      verificationMethod: await fix_vms(raw_doc.verificationMethod),
      authentication: raw_doc.authentication.map((kid: string) => `${raw_doc.id}${kid}`),
      keyAgreement: raw_doc.keyAgreement.map((kid: string) => `${raw_doc.id}${kid}`),
      service: raw_doc.service,
    };
    return doc;
  }
}

/**
 * Prefix-based DID Resolver (supports multiple DID methods)
 */
export class PrefixResolver implements DIDResolver {
  resolver_map: Record<string, DIDResolver> = {};

  constructor() {
    this.resolver_map = {
      'did:peer:2': new DIDPeerResolver() as DIDResolver,
      'did:peer:4': new DIDPeer4Resolver() as DIDResolver,
    };
  }

  async resolve(did: DID): Promise<DIDDoc | null> {
    const result = Object.keys(this.resolver_map).filter((resolver) => did.startsWith(resolver));
    if (result.length === 0) {
      throw new Error(`No resolver found for DID: ${did}`);
    }
    const resolved_doc = await this.resolver_map[result[0]].resolve(did);
    return resolved_doc;
  }
}

/**
 * Secrets Manager interface
 */
export interface SecretsManager extends SecretsResolver {
  store_secret: (secret: Secret) => void;
}

/**
 * In-memory secrets resolver (for Node.js environments)
 */
export class EphemeralSecretsResolver implements SecretsManager {
  private secrets: Record<string, Secret> = {};

  private static createError(message: string, name: string): Error {
    const e = new Error(message);
    e.name = name;
    return e;
  }

  async get_secret(secret_id: string): Promise<Secret | null> {
    try {
      return this.secrets[secret_id] || null;
    } catch (error) {
      throw EphemeralSecretsResolver.createError(
        'Unable to fetch secret from memory',
        'DIDCommMemoryError'
      );
    }
  }

  async find_secrets(secret_ids: Array<string>): Promise<Array<string>> {
    try {
      return secret_ids
        .map((id) => this.secrets[id])
        .filter((secret) => !!secret)
        .map((secret) => secret.id);
    } catch (error) {
      throw EphemeralSecretsResolver.createError(
        'Unable to fetch secrets from memory',
        'DIDCommMemoryError'
      );
    }
  }

  store_secret(secret: Secret): void {
    try {
      this.secrets[secret.id] = secret;
    } catch (error) {
      throw EphemeralSecretsResolver.createError(
        'Unable to store secret in memory',
        'DIDCommMemoryError'
      );
    }
  }

  /**
   * Get all stored secrets (useful for export/backup)
   */
  getAllSecrets(): Record<string, Secret> {
    return { ...this.secrets };
  }

  /**
   * Clear all secrets
   */
  clearAll(): void {
    this.secrets = {};
  }
}

/**
 * DIDComm Message interface
 */
export interface DIDCommMessage {
  type: string;
  body?: any;
  [key: string]: any;
}

/**
 * Main DIDComm v2.1 wrapper class
 */
export class DIDComm {
  private readonly resolver: DIDResolver;
  private readonly secretsResolver: SecretsManager;

  constructor(secretsResolver?: SecretsManager) {
    this.resolver = new PrefixResolver();
    this.secretsResolver = secretsResolver || new EphemeralSecretsResolver();
  }

  /**
   * Generate a DID for mediator use
   */
  async generateDidForMediator(): Promise<DID> {
    const { did, secrets } = await generateDidForMediator();
    secrets.forEach((secret) => this.secretsResolver.store_secret(secret));
    return did;
  }

  /**
   * Generate a DID with routing
   */
  async generateDid(routingDid: DID): Promise<DID> {
    const { did, secrets } = await generateDid(routingDid);
    secrets.forEach((secret) => this.secretsResolver.store_secret(secret));
    return did;
  }

  /**
   * Store secrets for an existing DID
   */
  storeSecrets(secrets: Secret[]): void {
    secrets.forEach((secret) => this.secretsResolver.store_secret(secret));
  }

  /**
   * Resolve a DID to a DID Document
   */
  async resolve(did: DID): Promise<DIDDoc | null> {
    return await this.resolver.resolve(did);
  }

  /**
   * Resolve DIDComm services from a DID
   */
  async resolveDIDCommServices(did: DID): Promise<Service[]> {
    const doc = await this.resolve(did);
    if (!doc) {
      throw new Error('Unable to resolve DID');
    }
    if (!doc.service) {
      throw new Error('No service found');
    }

    const services = doc.service
      .filter((s) => s.type === 'DIDCommMessaging')
      .filter((s) => s.serviceEndpoint.accept?.includes('didcomm/v2'));
    return services;
  }

  /**
   * Get HTTP endpoint for a DID
   */
  async httpEndpoint(did: DID): Promise<MessagingServiceMetadata> {
    const services = await this.resolveDIDCommServices(did);
    const service = services.filter((s: Service) => s.serviceEndpoint.uri.startsWith('http'))[0];
    if (!service) {
      throw new Error(`No HTTP endpoint found for DID: ${did}`);
    }
    return {
      id: service.id,
      service_endpoint: service.serviceEndpoint.uri,
    };
  }

  /**
   * Prepare a DIDComm message for sending
   */
  async prepareMessage(
    to: DID,
    from: DID,
    message: DIDCommMessage
  ): Promise<[IMessage, string, PackEncryptedMetadata]> {
    const msg = new Message({
      id: uuidv4(),
      typ: 'application/didcomm-plain+json',
      from: from,
      to: [to],
      body: message.body || {},
      created_time: Date.now(),
      ...message,
    });
    const [packed, meta] = await msg.pack_encrypted(
      to,
      from,
      null,
      this.resolver,
      this.secretsResolver,
      { forward: true }
    );
    if (!meta.messaging_service) {
      meta.messaging_service = await this.httpEndpoint(to);
    }
    return [msg.as_value(), packed, meta];
  }

  /**
   * Unpack a DIDComm message
   */
  async unpackMessage(message: string): Promise<[MessageType, UnpackMetadata]> {
    return await Message.unpack(message, this.resolver, this.secretsResolver, {});
  }

  /**
   * Send a DIDComm message and expect a reply
   */
  async sendMessageAndExpectReply(
    to: DID,
    from: DID,
    message: DIDCommMessage
  ): Promise<[MessageType, UnpackMetadata] | undefined> {
    const [plaintext, packed, meta] = await this.prepareMessage(to, from, message);
    logger.sentMessage({ to, from, message: plaintext });
    
    if (!meta.messaging_service) {
      throw new Error('No messaging service found');
    }

    try {
      // Use node-fetch for Node.js environments
      const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
      
      const response = await fetchFn(meta.messaging_service.service_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/didcomm-encrypted+json',
        },
        body: packed,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error sending message: ${text}`);
      }
      
      logger.info('Message sent successfully.');

      const packedResponse = await response.text();
      const unpacked = await this.unpackMessage(packedResponse);

      logger.recvMessage({ to, from, message: unpacked[0].as_value() });
      return unpacked;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send a DIDComm message (no reply expected)
   */
  async sendMessage(to: DID, from: DID, message: DIDCommMessage): Promise<void> {
    const [plaintext, packed, meta] = await this.prepareMessage(to, from, message);
    logger.sentMessage({ to, from, message: plaintext });
    
    if (!meta.messaging_service) {
      throw new Error('No messaging service found');
    }

    try {
      // Use node-fetch for Node.js environments
      const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
      
      const response = await fetchFn(meta.messaging_service.service_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/didcomm-encrypted+json',
        },
        body: packed,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error sending message: ${text}`);
      }
      
      const text = await response.text();
      logger.debug('Response:', text);
      logger.info('Message sent successfully.');
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Receive and unpack a DIDComm message
   */
  async receiveMessage(message: string): Promise<[MessageType, UnpackMetadata]> {
    const unpacked = await Message.unpack(message, this.resolver, this.secretsResolver, {});
    const plaintext = unpacked[0].as_value();
    logger.recvMessage({
      to: plaintext.to?.[0] ?? 'unknown',
      from: plaintext.from ?? 'unknown',
      message: plaintext,
    });
    return unpacked;
  }
}

