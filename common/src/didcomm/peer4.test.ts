/**
 * Tests for DID Peer Method 4
 */

import { describe, it, expect } from '@jest/globals';
import * as DIDPeer4 from './peer4.js';

describe('DIDPeer4', () => {
  const sampleDocument = {
    '@context': ['https://www.w3.org/ns/did/v1'],
    verificationMethod: [
      {
        id: '#key-1',
        type: 'Ed25519VerificationKey2020',
        publicKeyMultibase: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
      },
    ],
    authentication: ['#key-1'],
  };

  describe('encode', () => {
    it('should encode a document into long-form did:peer:4', async () => {
      const did = await DIDPeer4.encode(sampleDocument);

      expect(did).toBeDefined();
      expect(did).toContain('did:peer:4');
      expect(did).toMatch(/^did:peer:4zQm[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{44}:z/);
    });

    it('should generate consistent DIDs for same document', async () => {
      const did1 = await DIDPeer4.encode(sampleDocument);
      const did2 = await DIDPeer4.encode(sampleDocument);

      expect(did1).toBe(did2);
    });

    it('should generate different DIDs for different documents', async () => {
      const doc2 = {
        ...sampleDocument,
        verificationMethod: [
          {
            id: '#key-2',
            type: 'Ed25519VerificationKey2020',
            publicKeyMultibase: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
          },
        ],
      };

      const did1 = await DIDPeer4.encode(sampleDocument);
      const did2 = await DIDPeer4.encode(doc2);

      expect(did1).not.toBe(did2);
    });
  });

  describe('encodeShort', () => {
    it('should encode a document into short-form did:peer:4', async () => {
      const did = await DIDPeer4.encodeShort(sampleDocument);

      expect(did).toBeDefined();
      expect(did).toContain('did:peer:4');
      expect(did).toMatch(/^did:peer:4zQm[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{44}$/);
      expect(did).not.toContain(':z'); // No encoded document
    });

    it('should generate consistent short DIDs', async () => {
      const did1 = await DIDPeer4.encodeShort(sampleDocument);
      const did2 = await DIDPeer4.encodeShort(sampleDocument);

      expect(did1).toBe(did2);
    });
  });

  describe('longToShort', () => {
    it('should convert long-form to short-form', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);
      const shortDid = DIDPeer4.longToShort(longDid);

      expect(shortDid).toBeDefined();
      expect(shortDid.length).toBeLessThan(longDid.length);
      expect(shortDid).toMatch(/^did:peer:4zQm[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{44}$/);
    });

    it('should throw error for non-long-form DID', () => {
      const invalidDid = 'did:peer:4zQmInvalidShortForm123456789012345678901234567890123';

      expect(() => DIDPeer4.longToShort(invalidDid)).toThrow('DID is not a long form did:peer:4');
    });

    it('should match result from encodeShort', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);
      const shortFromLong = DIDPeer4.longToShort(longDid);
      const shortDirect = await DIDPeer4.encodeShort(sampleDocument);

      expect(shortFromLong).toBe(shortDirect);
    });
  });

  describe('decode', () => {
    it('should decode a long-form did:peer:4', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);
      const decoded = await DIDPeer4.decode(longDid);

      expect(decoded).toBeDefined();
      expect(decoded.verificationMethod).toBeDefined();
      expect(decoded.authentication).toBeDefined();
    });

    it('should throw error for non-did:peer:4', async () => {
      await expect(DIDPeer4.decode('did:example:123')).rejects.toThrow('Invalid did:peer:4');
    });

    it('should throw error for short-form did:peer:4', async () => {
      const shortDid = await DIDPeer4.encodeShort(sampleDocument);
      await expect(DIDPeer4.decode(shortDid)).rejects.toThrow('Cannot decode document from short form did:peer:4');
    });

    it('should roundtrip encode/decode', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);
      const decoded = await DIDPeer4.decode(longDid);

      // The core structure should match
      expect(decoded.verificationMethod).toEqual(sampleDocument.verificationMethod);
      expect(decoded.authentication).toEqual(sampleDocument.authentication);
    });

    it('should throw error for invalid hash', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);
      // Corrupt the DID by changing a character in the hash
      const corruptedDid = longDid.replace(/zQm.{10}/, 'zQmXXXXXXXXXX');

      await expect(DIDPeer4.decode(corruptedDid)).rejects.toThrow();
    });
  });

  describe('resolve', () => {
    it('should resolve a long-form did:peer:4', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);
      const resolved = await DIDPeer4.resolve(longDid);

      expect(resolved).toBeDefined();
      expect(resolved.id).toBe(longDid);
      expect(resolved.verificationMethod).toBeDefined();
      expect(resolved.alsoKnownAs).toBeDefined();
      expect(Array.isArray(resolved.alsoKnownAs)).toBe(true);
    });

    it('should include short-form in alsoKnownAs', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);
      const shortDid = DIDPeer4.longToShort(longDid);
      const resolved = await DIDPeer4.resolve(longDid);

      expect(resolved.alsoKnownAs).toContain(shortDid);
    });

    it('should contextualize verification methods', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);
      const resolved = await DIDPeer4.resolve(longDid);

      expect(resolved.verificationMethod![0].controller).toBe(longDid);
    });
  });

  describe('resolveShort', () => {
    it('should resolve using long-form DID', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);
      const resolved = await DIDPeer4.resolveShort(longDid);

      expect(resolved).toBeDefined();
      expect(resolved.id).toBeDefined();
      expect(resolved.verificationMethod).toBeDefined();
    });

    it('should set short-form as id', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);
      const shortDid = DIDPeer4.longToShort(longDid);
      const resolved = await DIDPeer4.resolveShort(longDid);

      expect(resolved.id).toBe(shortDid);
    });

    it('should include long-form in alsoKnownAs', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);
      const resolved = await DIDPeer4.resolveShort(longDid);

      expect(resolved.alsoKnownAs).toContain(longDid);
    });
  });

  describe('resolveShortFromDoc', () => {
    it('should resolve from document', async () => {
      const shortDid = await DIDPeer4.encodeShort(sampleDocument);
      const resolved = await DIDPeer4.resolveShortFromDoc(sampleDocument, shortDid);

      expect(resolved).toBeDefined();
      expect(resolved.verificationMethod).toBeDefined();
    });

    it('should throw error if DID mismatch', async () => {
      const wrongDid = 'did:peer:4zQmWrongHash1234567890123456789012345678901234';

      await expect(
        DIDPeer4.resolveShortFromDoc(sampleDocument, wrongDid)
      ).rejects.toThrow(/DID mismatch/);
    });

    it('should work without provided DID', async () => {
      const resolved = await DIDPeer4.resolveShortFromDoc(sampleDocument, null);

      expect(resolved).toBeDefined();
      expect(resolved.verificationMethod).toBeDefined();
    });
  });

  describe('regex patterns', () => {
    it('should match valid long-form DIDs', async () => {
      const longDid = await DIDPeer4.encode(sampleDocument);

      expect(DIDPeer4.LONG_RE.test(longDid)).toBe(true);
      expect(DIDPeer4.SHORT_RE.test(longDid)).toBe(false);
    });

    it('should match valid short-form DIDs', async () => {
      const shortDid = await DIDPeer4.encodeShort(sampleDocument);

      expect(DIDPeer4.SHORT_RE.test(shortDid)).toBe(true);
      expect(DIDPeer4.LONG_RE.test(shortDid)).toBe(false);
    });

    it('should not match invalid DIDs', () => {
      expect(DIDPeer4.LONG_RE.test('did:peer:invalid')).toBe(false);
      expect(DIDPeer4.SHORT_RE.test('did:peer:invalid')).toBe(false);
    });
  });

  describe('complex documents', () => {
    it('should handle document with multiple verification methods', async () => {
      const complexDoc = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        verificationMethod: [
          {
            id: '#key-1',
            type: 'Ed25519VerificationKey2020',
            publicKeyMultibase: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
          },
          {
            id: '#key-2',
            type: 'X25519KeyAgreementKey2020',
            publicKeyMultibase: 'z6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc',
          },
        ],
        authentication: ['#key-1'],
        keyAgreement: ['#key-2'],
      };

      const did = await DIDPeer4.encode(complexDoc);
      const resolved = await DIDPeer4.resolve(did);

      expect(resolved.verificationMethod).toHaveLength(2);
      expect(resolved.authentication).toBeDefined();
      expect(resolved.keyAgreement).toBeDefined();
    });

    it('should handle document with services', async () => {
      const docWithServices = {
        ...sampleDocument,
        service: [
          {
            id: '#service-1',
            type: 'DIDCommMessaging',
            serviceEndpoint: 'https://example.com/didcomm',
          },
        ],
      };

      const did = await DIDPeer4.encode(docWithServices);
      const resolved = await DIDPeer4.resolve(did);

      expect(resolved.service).toBeDefined();
      expect(resolved.service).toHaveLength(1);
    });
  });
});

