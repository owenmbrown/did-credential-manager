/**
 * DID Education Toolkit - Common Package
 * 
 * Shared utilities, DIDComm v2.1 implementation, and types
 * 
 * @module @did-edu/common
 */

// DIDComm exports
export {
  DIDComm,
  DIDCommMessage,
  DID,
  generateDid,
  generateDidForMediator,
  DIDPeerResolver,
  DIDPeer4Resolver,
  PrefixResolver,
  EphemeralSecretsResolver,
  SecretsManager,
} from './didcomm/wrapper';

export { default as DIDPeer } from './didcomm/peer2';
export * as DIDPeer4 from './didcomm/peer4';

// Types exports
export * from './types/credentials';
export * from './types/messages';

// Utils exports
export { default as logger, Logger, LogLevel, LogRecord, MessageRecord } from './utils/logger';

// Re-export commonly used types from didcomm library
export type {
  DIDResolver,
  DIDDoc,
  Secret,
  Message,
  UnpackMetadata,
  PackEncryptedMetadata,
  MessagingServiceMetadata,
  IMessage,
  Service,
} from 'didcomm';

