/**
 * Tests for Issue Credential Protocol
 */

import { describe, it, expect } from '@jest/globals';
import { IssueCredentialProtocol } from './issue-credential.js';

describe('IssueCredentialProtocol', () => {
  const issuerDid = 'did:peer:issuer';
  const holderDid = 'did:peer:holder';

  describe('createPropose', () => {
    it('should create a valid propose message', () => {
      const propose = IssueCredentialProtocol.createPropose({
        from: holderDid,
        to: issuerDid,
        credentialType: 'DriversLicense',
        attributes: { name: 'John Doe', age: 25 },
      });

      expect(propose['@type']).toBe('https://didcomm.org/issue-credential/3.0/propose-credential');
      expect(propose['@id']).toBeDefined();
      expect(propose.from).toBe(holderDid);
      expect(propose.to).toEqual([issuerDid]);
      expect(propose.body.goal_code).toBe('issue-vc');
      expect(propose.created_time).toBeDefined();
    });

    it('should include credential preview when attributes provided', () => {
      const propose = IssueCredentialProtocol.createPropose({
        from: holderDid,
        to: issuerDid,
        credentialType: 'DriversLicense',
        attributes: { name: 'John Doe' },
      });

      expect(propose.body.credential_preview).toBeDefined();
      expect(propose.body.credential_preview?.attributes).toEqual({ name: 'John Doe' });
    });
  });

  describe('createOffer', () => {
    it('should create a valid offer message', () => {
      const credentialPreview = {
        '@type': 'https://didcomm.org/issue-credential/3.0/credential-preview' as const,
        attributes: { name: 'John Doe', age: 25 },
      };

      const offer = IssueCredentialProtocol.createOffer({
        from: issuerDid,
        to: holderDid,
        credentialPreview,
      });

      expect(offer['@type']).toBe('https://didcomm.org/issue-credential/3.0/offer-credential');
      expect(offer['@id']).toBeDefined();
      expect(offer.from).toBe(issuerDid);
      expect(offer.to).toEqual([holderDid]);
      expect(offer.body.credential_preview).toEqual(credentialPreview);
      expect(offer.attachments).toBeDefined();
      expect(offer.attachments).toHaveLength(1);
    });

    it('should support thread ID for replies', () => {
      const threadId = 'original-thread-id';
      const offer = IssueCredentialProtocol.createOffer({
        from: issuerDid,
        to: holderDid,
        credentialPreview: {
          '@type': 'https://didcomm.org/issue-credential/3.0/credential-preview',
          attributes: {},
        },
        threadId,
      });

      expect(offer.thid).toBe(threadId);
    });

    it('should use specified format', () => {
      const offer = IssueCredentialProtocol.createOffer({
        from: issuerDid,
        to: holderDid,
        credentialPreview: {
          '@type': 'https://didcomm.org/issue-credential/3.0/credential-preview',
          attributes: {},
        },
        format: 'vc+sd-jwt',
      });

      expect(offer.attachments[0].format).toBe('vc+sd-jwt');
    });
  });

  describe('createRequest', () => {
    it('should create a valid request message', () => {
      const threadId = 'offer-thread-id';
      const request = IssueCredentialProtocol.createRequest({
        from: holderDid,
        to: issuerDid,
        threadId,
      });

      expect(request['@type']).toBe('https://didcomm.org/issue-credential/3.0/request-credential');
      expect(request['@id']).toBeDefined();
      expect(request.thid).toBe(threadId);
      expect(request.from).toBe(holderDid);
      expect(request.to).toEqual([issuerDid]);
    });

    it('should include comment', () => {
      const request = IssueCredentialProtocol.createRequest({
        from: holderDid,
        to: issuerDid,
        threadId: 'thread',
        comment: 'Please issue my credential',
      });

      expect(request.body.comment).toBe('Please issue my credential');
    });
  });

  describe('createIssue', () => {
    it('should create a valid issue message with credential', () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'DriversLicense'],
        issuer: issuerDid,
        credentialSubject: {
          id: holderDid,
          name: 'John Doe',
        },
      };

      const issue = IssueCredentialProtocol.createIssue({
        from: issuerDid,
        to: holderDid,
        threadId: 'request-thread-id',
        credential,
      });

      expect(issue['@type']).toBe('https://didcomm.org/issue-credential/3.0/issue-credential');
      expect(issue['@id']).toBeDefined();
      expect(issue.thid).toBe('request-thread-id');
      expect(issue.attachments).toHaveLength(1);
      expect(issue.attachments[0].data.json).toEqual(credential);
    });
  });

  describe('createAck', () => {
    it('should create acknowledgment message', () => {
      const ack = IssueCredentialProtocol.createAck({
        from: holderDid,
        to: issuerDid,
        threadId: 'issue-thread-id',
        status: 'OK',
      });

      expect(ack['@type']).toBe('https://didcomm.org/issue-credential/3.0/ack');
      expect(ack['@id']).toBeDefined();
      expect(ack.thid).toBe('issue-thread-id');
      expect(ack.body.status).toBe('OK');
    });

    it('should support different status values', () => {
      const statuses: Array<'OK' | 'FAIL' | 'PENDING'> = ['OK', 'FAIL', 'PENDING'];

      statuses.forEach(status => {
        const ack = IssueCredentialProtocol.createAck({
          from: holderDid,
          to: issuerDid,
          threadId: 'thread',
          status,
        });

        expect(ack.body.status).toBe(status);
      });
    });
  });

  describe('createProblemReport', () => {
    it('should create problem report message', () => {
      const report = IssueCredentialProtocol.createProblemReport({
        from: issuerDid,
        to: holderDid,
        threadId: 'failed-thread',
        code: 'e.p.msg.unrecognized',
        comment: 'Could not process request',
      });

      expect(report['@type']).toBe('https://didcomm.org/issue-credential/3.0/problem-report');
      expect(report['@id']).toBeDefined();
      expect(report.thid).toBe('failed-thread');
      expect(report.body.code).toBe('e.p.msg.unrecognized');
      expect(report.body.comment).toBe('Could not process request');
    });
  });

  describe('extractCredential', () => {
    it('should extract credential from issue message', () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
      };

      const issue = IssueCredentialProtocol.createIssue({
        from: issuerDid,
        to: holderDid,
        threadId: 'thread',
        credential,
      });

      const extracted = IssueCredentialProtocol.extractCredential(issue);

      expect(extracted).toEqual(credential);
    });

    it('should return null for message without attachments', () => {
      const message: any = {
        '@type': 'https://didcomm.org/issue-credential/3.0/issue-credential',
        '@id': 'test',
        body: {},
        attachments: [],
      };

      const extracted = IssueCredentialProtocol.extractCredential(message);

      expect(extracted).toBeNull();
    });
  });

  describe('parseMessageType', () => {
    it('should parse valid message type', () => {
      const parsed = IssueCredentialProtocol.parseMessageType(
        'https://didcomm.org/issue-credential/3.0/offer-credential'
      );

      expect(parsed).toEqual({
        protocol: 'issue-credential',
        version: '3.0',
        messageType: 'offer-credential',
      });
    });

    it('should return null for invalid type', () => {
      const parsed = IssueCredentialProtocol.parseMessageType('invalid-type');

      expect(parsed).toBeNull();
    });
  });

  describe('validateMessage', () => {
    it('should validate valid message', () => {
      const message = IssueCredentialProtocol.createOffer({
        from: issuerDid,
        to: holderDid,
        credentialPreview: {
          '@type': 'https://didcomm.org/issue-credential/3.0/credential-preview',
          attributes: {},
        },
      });

      expect(() => {
        IssueCredentialProtocol.validateMessage(message);
      }).not.toThrow();
    });

    it('should throw for message without @type', () => {
      const invalid = { '@id': 'test' };

      expect(() => {
        IssueCredentialProtocol.validateMessage(invalid);
      }).toThrow('missing @type or @id');
    });

    it('should throw for wrong protocol', () => {
      const invalid = {
        '@type': 'https://didcomm.org/wrong-protocol/1.0/message',
        '@id': 'test',
      };

      expect(() => {
        IssueCredentialProtocol.validateMessage(invalid);
      }).toThrow('not an Issue Credential 3.0 message');
    });
  });
});

