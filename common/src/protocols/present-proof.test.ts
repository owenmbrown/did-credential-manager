/**
 * Tests for Present Proof Protocol
 */

import { describe, it, expect } from '@jest/globals';
import { PresentProofProtocol } from './present-proof.js';

describe('PresentProofProtocol', () => {
  const verifierDid = 'did:peer:verifier';
  const holderDid = 'did:peer:holder';
  const testChallenge = 'test-challenge-12345';

  describe('createPropose', () => {
    it('should create a valid propose presentation message', () => {
      const propose = PresentProofProtocol.createPropose({
        from: holderDid,
        to: verifierDid,
        comment: 'I can present my credentials',
      });

      expect(propose['@type']).toBe('https://didcomm.org/present-proof/3.0/propose-presentation');
      expect(propose['@id']).toBeDefined();
      expect(propose.from).toBe(holderDid);
      expect(propose.to).toEqual([verifierDid]);
      expect(propose.body.comment).toBe('I can present my credentials');
    });
  });

  describe('createRequest', () => {
    it('should create a valid request presentation message', () => {
      const presentationDefinition = {
        id: 'def-id',
        input_descriptors: [{
          id: 'input-1',
          constraints: {
            fields: [{
              path: ['$.type'],
              filter: { type: 'string', pattern: 'DriversLicense' },
            }],
          },
        }],
      };

      const request = PresentProofProtocol.createRequest({
        from: verifierDid,
        to: holderDid,
        challenge: testChallenge,
        presentationDefinition,
      });

      expect(request['@type']).toBe('https://didcomm.org/present-proof/3.0/request-presentation');
      expect(request['@id']).toBeDefined();
      expect(request.from).toBe(verifierDid);
      expect(request.to).toEqual([holderDid]);
      expect(request.body.will_confirm).toBe(true);
      expect(request.attachments).toHaveLength(1);
    });

    it('should support thread ID', () => {
      const threadId = 'propose-thread-id';
      const request = PresentProofProtocol.createRequest({
        from: verifierDid,
        to: holderDid,
        challenge: testChallenge,
        presentationDefinition: { id: 'def', input_descriptors: [] },
        threadId,
      });

      expect(request.thid).toBe(threadId);
    });

    it('should support custom will_confirm', () => {
      const request = PresentProofProtocol.createRequest({
        from: verifierDid,
        to: holderDid,
        challenge: testChallenge,
        presentationDefinition: { id: 'def', input_descriptors: [] },
        willConfirm: false,
      });

      expect(request.body.will_confirm).toBe(false);
    });
  });

  describe('createSimpleRequest', () => {
    it('should create request with simple credential types', () => {
      const request = PresentProofProtocol.createSimpleRequest({
        from: verifierDid,
        to: holderDid,
        challenge: testChallenge,
        requestedTypes: ['DriversLicense', 'UniversityDegree'],
      });

      expect(request.attachments).toHaveLength(1);
      
      const def = request.attachments[0].data.json?.presentation_definition;
      expect(def).toBeDefined();
      expect(def!.input_descriptors).toHaveLength(2);
    });
  });

  describe('createPresentation', () => {
    it('should create a valid presentation message', () => {
      const vp = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        verifiableCredential: [{ type: ['VerifiableCredential'] }],
      };

      const presentation = PresentProofProtocol.createPresentation({
        from: holderDid,
        to: verifierDid,
        threadId: 'request-thread-id',
        verifiablePresentation: vp,
      });

      expect(presentation['@type']).toBe('https://didcomm.org/present-proof/3.0/presentation');
      expect(presentation['@id']).toBeDefined();
      expect(presentation.thid).toBe('request-thread-id');
      expect(presentation.attachments).toHaveLength(1);
      expect(presentation.attachments[0].data.json).toEqual(vp);
    });
  });

  describe('createAck', () => {
    it('should create acknowledgment message', () => {
      const ack = PresentProofProtocol.createAck({
        from: verifierDid,
        to: holderDid,
        threadId: 'presentation-thread-id',
        status: 'OK',
        comment: 'Verification successful',
      });

      expect(ack['@type']).toBe('https://didcomm.org/present-proof/3.0/ack');
      expect(ack['@id']).toBeDefined();
      expect(ack.thid).toBe('presentation-thread-id');
      expect(ack.body.status).toBe('OK');
      expect(ack.body.comment).toBe('Verification successful');
    });
  });

  describe('createProblemReport', () => {
    it('should create problem report message', () => {
      const report = PresentProofProtocol.createProblemReport({
        from: verifierDid,
        to: holderDid,
        threadId: 'failed-thread',
        code: 'e.p.trust',
        comment: 'Credential verification failed',
      });

      expect(report['@type']).toBe('https://didcomm.org/present-proof/3.0/problem-report');
      expect(report['@id']).toBeDefined();
      expect(report.thid).toBe('failed-thread');
      expect(report.body.code).toBe('e.p.trust');
    });
  });

  describe('extractPresentationDefinition', () => {
    it('should extract presentation definition from request', () => {
      const request = PresentProofProtocol.createSimpleRequest({
        from: verifierDid,
        to: holderDid,
        challenge: testChallenge,
        requestedTypes: ['DriversLicense'],
      });

      const def = PresentProofProtocol.extractPresentationDefinition(request);

      expect(def).toBeDefined();
      expect(def?.input_descriptors).toHaveLength(1);
    });

    it('should return null for request without attachments', () => {
      const request: any = {
        '@type': 'https://didcomm.org/present-proof/3.0/request-presentation',
        '@id': 'test',
        body: {},
        attachments: [],
      };

      const def = PresentProofProtocol.extractPresentationDefinition(request);

      expect(def).toBeNull();
    });
  });

  describe('extractChallenge', () => {
    it('should extract challenge from request', () => {
      const request = PresentProofProtocol.createSimpleRequest({
        from: verifierDid,
        to: holderDid,
        challenge: testChallenge,
        requestedTypes: ['DriversLicense'],
      });

      const challenge = PresentProofProtocol.extractChallenge(request);

      expect(challenge).toBe(testChallenge);
    });

    it('should return null for request without challenge', () => {
      const request: any = {
        '@type': 'https://didcomm.org/present-proof/3.0/request-presentation',
        '@id': 'test',
        body: {},
        attachments: [{ data: { json: { options: {} } } }],
      };

      const challenge = PresentProofProtocol.extractChallenge(request);

      expect(challenge).toBeNull();
    });
  });

  describe('extractPresentation', () => {
    it('should extract VP from presentation message', () => {
      const vp = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
      };

      const presentation = PresentProofProtocol.createPresentation({
        from: holderDid,
        to: verifierDid,
        threadId: 'thread',
        verifiablePresentation: vp,
      });

      const extracted = PresentProofProtocol.extractPresentation(presentation);

      expect(extracted).toEqual(vp);
    });
  });

  describe('buildPresentationDefinition', () => {
    it('should build presentation definition from credential types', () => {
      const def = PresentProofProtocol.buildPresentationDefinition(
        ['DriversLicense', 'UniversityDegree']
      );

      expect(def.id).toBeDefined();
      expect(def.input_descriptors).toHaveLength(2);
      expect(def.input_descriptors[0].name).toBe('DriversLicense');
      expect(def.input_descriptors[1].name).toBe('UniversityDegree');
    });

    it('should support custom options', () => {
      const def = PresentProofProtocol.buildPresentationDefinition(
        ['DriversLicense'],
        {
          name: 'Custom Request',
          purpose: 'Verify identity',
          limitDisclosure: true,
        }
      );

      expect(def.name).toBe('Custom Request');
      expect(def.purpose).toBe('Verify identity');
      expect(def.input_descriptors[0].constraints.limit_disclosure).toBe('required');
    });
  });

  describe('parseMessageType', () => {
    it('should parse valid message type', () => {
      const parsed = PresentProofProtocol.parseMessageType(
        'https://didcomm.org/present-proof/3.0/request-presentation'
      );

      expect(parsed).toEqual({
        protocol: 'present-proof',
        version: '3.0',
        messageType: 'request-presentation',
      });
    });
  });

  describe('validateMessage', () => {
    it('should validate valid message', () => {
      const message = PresentProofProtocol.createSimpleRequest({
        from: verifierDid,
        to: holderDid,
        challenge: testChallenge,
        requestedTypes: ['DriversLicense'],
      });

      expect(() => {
        PresentProofProtocol.validateMessage(message);
      }).not.toThrow();
    });

    it('should throw for wrong protocol', () => {
      const invalid = {
        '@type': 'https://didcomm.org/wrong-protocol/1.0/message',
        '@id': 'test',
      };

      expect(() => {
        PresentProofProtocol.validateMessage(invalid);
      }).toThrow('not a Present Proof 3.0 message');
    });
  });
});

