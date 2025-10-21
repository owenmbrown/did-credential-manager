/**
 * Tests for Out-of-Band Protocol
 */

import { describe, it, expect } from '@jest/globals';
import { OOBProtocol, type OOBInvitation } from './oob.js';

describe('OOBProtocol', () => {
  const testDid = 'did:peer:2.Ez6LSghwSE437wnDE1pt3X6hVDUQzSjsHzinpX3XFvMjRAm7y.Vz6Mkhh1e5CEYYq6JBUcTZ6Cp2ranCWRrv7Yax3Le4N59R6dd';

  describe('createInvitation', () => {
    it('should create a valid OOB invitation', () => {
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
        goalCode: 'test-goal',
        goal: 'Test Goal Description',
      });

      expect(invitation).toBeDefined();
      expect(invitation['@type']).toBe('https://didcomm.org/out-of-band/2.0/invitation');
      expect(invitation['@id']).toBeDefined();
      expect(invitation.from).toBe(testDid);
      expect(invitation.body.goal_code).toBe('test-goal');
      expect(invitation.body.goal).toBe('Test Goal Description');
      expect(invitation.created_time).toBeDefined();
    });

    it('should include default accept values', () => {
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
      });

      expect(invitation.body.accept).toContain('didcomm/v2');
    });

    it('should set expiration time when TTL is provided', () => {
      const ttl = 3600; // 1 hour
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
        ttl,
      });

      expect(invitation.expires_time).toBeDefined();
      expect(invitation.expires_time).toBeGreaterThan(invitation.created_time!);
    });

    it('should include attachments when provided', () => {
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
        attachments: [{
          id: 'test-attachment',
          media_type: 'application/json',
          data: { json: { test: 'data' } },
        }],
      });

      expect(invitation.attachments).toBeDefined();
      expect(invitation.attachments).toHaveLength(1);
      expect(invitation.attachments![0].id).toBe('test-attachment');
    });
  });

  describe('createInvitationUrl', () => {
    it('should create a valid invitation URL', () => {
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
      });

      const url = OOBProtocol.createInvitationUrl(invitation, 'https://example.com');

      expect(url).toContain('https://example.com?oob=');
      expect(url).toMatch(/\?oob=[A-Za-z0-9_-]+$/);
    });
  });

  describe('parseInvitationUrl', () => {
    it('should parse a valid invitation URL', () => {
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
        goal: 'Test Goal',
      });

      const url = OOBProtocol.createInvitationUrl(invitation, 'https://example.com');
      const parsed = OOBProtocol.parseInvitationUrl(url);

      expect(parsed).toBeDefined();
      expect(parsed.from).toBe(testDid);
      expect(parsed.goal).toBe('Test Goal');
      expect(parsed.isExpired).toBe(false);
    });

    it('should detect expired invitations', () => {
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
        ttl: -1, // Already expired
      });

      const url = OOBProtocol.createInvitationUrl(invitation, 'https://example.com');
      const parsed = OOBProtocol.parseInvitationUrl(url);

      expect(parsed.isExpired).toBe(true);
    });

    it('should throw on invalid URL', () => {
      expect(() => {
        OOBProtocol.parseInvitationUrl('https://example.com');
      }).toThrow('Missing oob parameter');
    });

    it('should throw on malformed oob parameter', () => {
      expect(() => {
        OOBProtocol.parseInvitationUrl('https://example.com?oob=invalid');
      }).toThrow();
    });
  });

  describe('parseInvitation', () => {
    it('should parse a valid invitation object', () => {
      const invitation: OOBInvitation = {
        '@type': 'https://didcomm.org/out-of-band/2.0/invitation',
        '@id': 'test-id',
        from: testDid,
        body: {
          goal: 'Test',
        },
      };

      const parsed = OOBProtocol.parseInvitation(invitation);

      expect(parsed.from).toBe(testDid);
      expect(parsed.goal).toBe('Test');
    });

    it('should throw on invalid invitation type', () => {
      const invalid: any = {
        '@type': 'https://didcomm.org/wrong/1.0/invitation',
        '@id': 'test-id',
        from: testDid,
        body: {},
      };

      expect(() => {
        OOBProtocol.parseInvitation(invalid);
      }).toThrow('Invalid invitation type');
    });

    it('should throw on missing required fields', () => {
      const invalid: any = {
        '@type': 'https://didcomm.org/out-of-band/2.0/invitation',
        body: {},
      };

      expect(() => {
        OOBProtocol.parseInvitation(invalid);
      }).toThrow('missing required fields');
    });
  });

  describe('createCredentialOfferInvitation', () => {
    it('should create invitation with credential offer attachment', () => {
      const invitation = OOBProtocol.createCredentialOfferInvitation(
        testDid,
        'DriversLicense',
        { name: 'John Doe', age: 25 }
      );

      expect(invitation.attachments).toBeDefined();
      expect(invitation.attachments).toHaveLength(1);
      expect(invitation.body.goal_code).toBe('issue-vc');

      const attachment = invitation.attachments![0];
      expect(attachment.media_type).toBe('application/json');
      expect(attachment.data.json).toBeDefined();
      expect(attachment.data.json['@type']).toContain('offer-credential');
    });
  });

  describe('createPresentationRequestInvitation', () => {
    it('should create invitation with presentation request attachment', () => {
      const invitation = OOBProtocol.createPresentationRequestInvitation(
        testDid,
        ['DriversLicense'],
        'test-challenge'
      );

      expect(invitation.attachments).toBeDefined();
      expect(invitation.attachments).toHaveLength(1);
      expect(invitation.body.goal_code).toBe('verify-credentials');

      const attachment = invitation.attachments![0];
      expect(attachment.data.json).toBeDefined();
      expect(attachment.data.json['@type']).toContain('request-presentation');
    });
  });

  describe('extractCredentialOffer', () => {
    it('should extract credential offer from invitation', () => {
      const invitation = OOBProtocol.createCredentialOfferInvitation(
        testDid,
        'DriversLicense',
        { name: 'John Doe' }
      );

      const offer = OOBProtocol.extractCredentialOffer(invitation);

      expect(offer).toBeDefined();
      expect(offer['@type']).toContain('offer-credential');
    });

    it('should return null for invitation without credential offer', () => {
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
      });

      const offer = OOBProtocol.extractCredentialOffer(invitation);

      expect(offer).toBeNull();
    });
  });

  describe('extractPresentationRequest', () => {
    it('should extract presentation request from invitation', () => {
      const invitation = OOBProtocol.createPresentationRequestInvitation(
        testDid,
        ['DriversLicense'],
        'challenge'
      );

      const request = OOBProtocol.extractPresentationRequest(invitation);

      expect(request).toBeDefined();
      expect(request['@type']).toContain('request-presentation');
    });

    it('should return null for invitation without presentation request', () => {
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
      });

      const request = OOBProtocol.extractPresentationRequest(invitation);

      expect(request).toBeNull();
    });
  });

  describe('validateInvitation', () => {
    it('should validate a valid invitation', () => {
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
      });

      expect(() => {
        OOBProtocol.validateInvitation(invitation);
      }).not.toThrow();
    });

    it('should throw for expired invitation', () => {
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
        ttl: -1,
      });

      expect(() => {
        OOBProtocol.validateInvitation(invitation);
      }).toThrow('expired');
    });
  });

  describe('generateQRCode', () => {
    it('should generate a QR code data URL', async () => {
      const invitation = OOBProtocol.createInvitation({
        from: testDid,
      });

      const qrCode = await OOBProtocol.generateQRCode(invitation, 'https://example.com');

      expect(qrCode).toMatch(/^data:image\/png;base64,/);
    });
  });
});

