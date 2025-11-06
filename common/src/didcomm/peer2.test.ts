/**
 * Tests for DID Peer Method 2
 */

import { describe, it, expect } from '@jest/globals';
import DIDPeer from './peer2.js';

describe('DIDPeer', () => {
  describe('keyToMultibase', () => {
    it('should encode a key to multibase format', () => {
      const key = new Uint8Array([1, 2, 3, 4, 5]);
      const result = DIDPeer.keyToMultibase(key, 'ed25519-pub');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle x25519-pub keys', () => {
      const key = new Uint8Array(32).fill(1);
      const result = DIDPeer.keyToMultibase(key, 'x25519-pub');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('base64UrlEncode', () => {
    it('should encode a string to base64url format', () => {
      const input = 'hello world';
      const result = DIDPeer.base64UrlEncode(input);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('should handle special characters', () => {
      const input = 'test+data/value=';
      const result = DIDPeer.base64UrlEncode(input);
      
      expect(result).toBeDefined();
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
    });

    it('should handle empty string', () => {
      const result = DIDPeer.base64UrlEncode('');
      expect(result).toBe('');
    });
  });

  describe('base64UrlDecode', () => {
    it('should decode a base64url string', () => {
      const encoded = DIDPeer.base64UrlEncode('hello world');
      const decoded = DIDPeer.base64UrlDecode(encoded);
      
      expect(decoded).toBe('hello world');
    });

    it('should handle strings with padding', () => {
      // Simulate base64url without padding
      const input = 'dGVzdA'; // 'test' in base64
      const result = DIDPeer.base64UrlDecode(input);
      
      expect(result).toBeDefined();
    });

    it('should roundtrip encode/decode', () => {
      const original = 'test data 123';
      const encoded = DIDPeer.base64UrlEncode(original);
      const decoded = DIDPeer.base64UrlDecode(encoded);
      
      expect(decoded).toBe(original);
    });
  });

  describe('keyToIdent', () => {
    it('should generate identifier from key', () => {
      const key = new Uint8Array(32).fill(42);
      const ident = DIDPeer.keyToIdent(key, 'ed25519-pub');
      
      expect(ident).toBeDefined();
      expect(typeof ident).toBe('string');
      expect(ident.length).toBe(8);
    });

    it('should generate consistent identifiers', () => {
      const key = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const ident1 = DIDPeer.keyToIdent(key, 'ed25519-pub');
      const ident2 = DIDPeer.keyToIdent(key, 'ed25519-pub');
      
      expect(ident1).toBe(ident2);
    });
  });

  describe('generate', () => {
    it('should generate a did:peer:2 DID', () => {
      const signingKey = new Uint8Array(32).fill(1);
      const encryptionKey = new Uint8Array(32).fill(2);
      const service = {
        type: 'DIDCommMessaging',
        serviceEndpoint: 'https://example.com/didcomm',
        routingKeys: [],
      };

      const did = DIDPeer.generate([signingKey], [encryptionKey], service);

      expect(did).toBeDefined();
      expect(did).toContain('did:peer:2');
      expect(typeof did).toBe('string');
    });

    it('should handle multiple signing keys', () => {
      const signingKeys = [
        new Uint8Array(32).fill(1),
        new Uint8Array(32).fill(2),
      ];
      const encryptionKey = new Uint8Array(32).fill(3);
      const service = {
        type: 'DIDCommMessaging',
        serviceEndpoint: 'https://example.com/didcomm',
      };

      const did = DIDPeer.generate(signingKeys, [encryptionKey], service);

      expect(did).toBeDefined();
      expect(did).toContain('did:peer:2');
    });

    it('should handle multiple encryption keys', () => {
      const signingKey = new Uint8Array(32).fill(1);
      const encryptionKeys = [
        new Uint8Array(32).fill(2),
        new Uint8Array(32).fill(3),
      ];
      const service = {
        type: 'DIDCommMessaging',
        serviceEndpoint: 'https://example.com/didcomm',
      };

      const did = DIDPeer.generate([signingKey], encryptionKeys, service);

      expect(did).toBeDefined();
      expect(did).toContain('did:peer:2');
    });
  });

  describe('resolve', () => {
    it('should resolve a did:peer:2 DID to a DID document', () => {
      const signingKey = new Uint8Array(32).fill(1);
      const encryptionKey = new Uint8Array(32).fill(2);
      const service = {
        type: 'DIDCommMessaging',
        serviceEndpoint: 'https://example.com/didcomm',
        routingKeys: [],
      };

      const did = DIDPeer.generate([signingKey], [encryptionKey], service);
      const doc = DIDPeer.resolve(did);

      expect(doc).toBeDefined();
      expect(doc.id).toBe(did);
      expect(doc['@context']).toBeDefined();
      expect(doc.verificationMethod).toBeDefined();
      expect(Array.isArray(doc.verificationMethod)).toBe(true);
    });

    it('should include verification methods in resolved document', () => {
      const signingKey = new Uint8Array(32).fill(1);
      const encryptionKey = new Uint8Array(32).fill(2);
      const service = {
        type: 'DIDCommMessaging',
        serviceEndpoint: 'https://example.com/didcomm',
      };

      const did = DIDPeer.generate([signingKey], [encryptionKey], service);
      const doc = DIDPeer.resolve(did);

      expect(doc.verificationMethod!.length).toBeGreaterThan(0);
      expect(doc.verificationMethod![0]).toHaveProperty('id');
      expect(doc.verificationMethod![0]).toHaveProperty('type');
      expect(doc.verificationMethod![0]).toHaveProperty('publicKeyMultibase');
    });

    it('should include key agreements in resolved document', () => {
      const signingKey = new Uint8Array(32).fill(1);
      const encryptionKey = new Uint8Array(32).fill(2);
      const service = {
        type: 'DIDCommMessaging',
        serviceEndpoint: 'https://example.com/didcomm',
      };

      const did = DIDPeer.generate([signingKey], [encryptionKey], service);
      const doc = DIDPeer.resolve(did);

      expect(doc.keyAgreement).toBeDefined();
      expect(Array.isArray(doc.keyAgreement)).toBe(true);
    });

    it('should include authentication in resolved document', () => {
      const signingKey = new Uint8Array(32).fill(1);
      const encryptionKey = new Uint8Array(32).fill(2);
      const service = {
        type: 'DIDCommMessaging',
        serviceEndpoint: 'https://example.com/didcomm',
      };

      const did = DIDPeer.generate([signingKey], [encryptionKey], service);
      const doc = DIDPeer.resolve(did);

      expect(doc.authentication).toBeDefined();
      expect(Array.isArray(doc.authentication)).toBe(true);
    });

    it('should include service endpoints in resolved document', () => {
      const signingKey = new Uint8Array(32).fill(1);
      const encryptionKey = new Uint8Array(32).fill(2);
      const service = {
        type: 'DIDCommMessaging',
        serviceEndpoint: 'https://example.com/didcomm',
        routingKeys: ['did:example:router'],
      };

      const did = DIDPeer.generate([signingKey], [encryptionKey], service);
      const doc = DIDPeer.resolve(did);

      expect(doc.service).toBeDefined();
      expect(Array.isArray(doc.service)).toBe(true);
      if (doc.service && doc.service.length > 0) {
        expect(doc.service[0]).toHaveProperty('type');
        expect(doc.service[0]).toHaveProperty('serviceEndpoint');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty service object', () => {
      const signingKey = new Uint8Array(32).fill(1);
      const encryptionKey = new Uint8Array(32).fill(2);
      const service = {};

      const did = DIDPeer.generate([signingKey], [encryptionKey], service);

      expect(did).toBeDefined();
      expect(did).toContain('did:peer:2');
    });

    it('should handle service with complex endpoint', () => {
      const signingKey = new Uint8Array(32).fill(1);
      const encryptionKey = new Uint8Array(32).fill(2);
      const service = {
        type: 'DIDCommMessaging',
        serviceEndpoint: {
          uri: 'https://example.com/didcomm',
          accept: ['didcomm/v2'],
          routingKeys: ['did:example:router1', 'did:example:router2'],
        },
      };

      const did = DIDPeer.generate([signingKey], [encryptionKey], service);

      expect(did).toBeDefined();
      expect(did).toContain('did:peer:2');
    });
  });
});

