/**
 * Tests for Verifier Routes
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';
import { createVerifierRoutes } from './verifier-routes.js';

// Mock @did-edu/common
jest.mock('@did-edu/common', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  OOBProtocol: {
    createPresentationRequestInvitation: jest.fn().mockReturnValue({
      invitation: {
        '@type': 'https://didcomm.org/out-of-band/2.0/invitation',
        '@id': 'invitation-123',
        from: 'did:peer:verifier789'
      },
      invitationUrl: 'https://example.com?oob=abc123'
    }),
    parseInvitationUrl: jest.fn().mockReturnValue({
      invitation: {},
      from: 'did:peer:verifier789'
    })
  }
}));

// Create mock challenge manager
const createMockChallengeManager = () => ({
  getChallenge: jest.fn().mockReturnValue({
    id: 'challenge-123',
    challenge: 'random-challenge-string',
    expiresAt: new Date(Date.now() + 300000).toISOString()
  }),
  getActiveChallengeCount: jest.fn().mockReturnValue(5)
});

// Create mock agent
const createMockAgent = () => {
  const mockChallengeManager = createMockChallengeManager();
  
  return {
    getDid: jest.fn().mockReturnValue('did:peer:verifier789'),
    generateChallenge: jest.fn().mockReturnValue({
      id: 'challenge-123',
      challenge: 'random-challenge-string',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      holderDid: 'did:peer:holder456',
      domain: 'verifier.example.com'
    }),
    getChallengeManager: jest.fn().mockReturnValue(mockChallengeManager),
    verifyCredential: jest.fn().mockResolvedValue({
      verified: true,
      credential: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: { id: 'did:peer:issuer123' },
        credentialSubject: { id: 'did:peer:holder456' }
      },
      results: [{ verified: true }]
    }),
    verifyPresentation: jest.fn().mockResolvedValue({
      verified: true,
      presentation: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder456'
      },
      results: [{ verified: true }]
    }),
    requestPresentation: jest.fn().mockResolvedValue({
      success: true,
      message: 'Presentation request sent'
    }),
    handleMessage: jest.fn().mockResolvedValue({ success: true }),
    getPolicy: jest.fn().mockReturnValue({
      requireValidSignature: true,
      requireNonExpired: true,
      trustedIssuers: []
    }),
    storeChallengeForInvitation: jest.fn()
  };
};

describe('Verifier Routes', () => {
  let app: Express;
  let mockAgent: ReturnType<typeof createMockAgent>;

  beforeEach(() => {
    mockAgent = createMockAgent();
    app = express();
    app.use(express.json());
    app.use(express.text({ type: 'application/didcomm-encrypted+json' }));
    app.use('/', createVerifierRoutes(mockAgent as any));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('GET /did', () => {
    it('should return the verifier DID', async () => {
      const response = await request(app)
        .get('/did')
        .expect(200);

      expect(response.body).toEqual({ did: 'did:peer:verifier789' });
      expect(mockAgent.getDid).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockAgent.getDid.mockImplementationOnce(() => {
        throw new Error('DID not available');
      });

      const response = await request(app)
        .get('/did')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'DID not available');
    });
  });

  describe('POST /challenges/generate', () => {
    it('should generate a challenge without parameters', async () => {
      const response = await request(app)
        .post('/challenges/generate')
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('challengeId', 'challenge-123');
      expect(response.body).toHaveProperty('challenge', 'random-challenge-string');
      expect(response.body).toHaveProperty('expiresAt');
      expect(mockAgent.generateChallenge).toHaveBeenCalled();
    });

    it('should generate a challenge with holder DID and domain', async () => {
      const response = await request(app)
        .post('/challenges/generate')
        .send({
          holderDid: 'did:peer:holder456',
          domain: 'verifier.example.com',
          ttlMinutes: 10
        })
        .expect(200);

      expect(response.body).toHaveProperty('challengeId');
      expect(response.body).toHaveProperty('holderDid', 'did:peer:holder456');
      expect(response.body).toHaveProperty('domain', 'verifier.example.com');
      expect(mockAgent.generateChallenge).toHaveBeenCalledWith({
        holderDid: 'did:peer:holder456',
        domain: 'verifier.example.com',
        ttlMinutes: 10
      });
    });

    it('should handle errors during challenge generation', async () => {
      mockAgent.generateChallenge.mockImplementationOnce(() => {
        throw new Error('Challenge generation failed');
      });

      const response = await request(app)
        .post('/challenges/generate')
        .send({})
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Challenge generation failed');
    });
  });

  describe('GET /challenges/:id', () => {
    it('should retrieve a challenge by ID', async () => {
      const response = await request(app)
        .get('/challenges/challenge-123')
        .expect(200);

      expect(response.body).toHaveProperty('challenge');
      const challengeManager = mockAgent.getChallengeManager();
      expect(challengeManager.getChallenge).toHaveBeenCalledWith('challenge-123');
    });

    it('should return 404 for non-existent challenge', async () => {
      const challengeManager = mockAgent.getChallengeManager();
      challengeManager.getChallenge.mockReturnValueOnce(null);

      const response = await request(app)
        .get('/challenges/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Challenge not found or expired');
    });
  });

  describe('POST /verify/credential', () => {
    it('should verify a valid credential', async () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: { id: 'did:peer:issuer123' },
        credentialSubject: { id: 'did:peer:holder456' }
      };

      const response = await request(app)
        .post('/verify/credential')
        .send({ credential })
        .expect(200);

      expect(response.body).toHaveProperty('verified', true);
      expect(mockAgent.verifyCredential).toHaveBeenCalledWith(credential);
    });

    it('should verify a credential with policy', async () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: { id: 'did:peer:issuer123' }
      };

      const policy = { requireValidSignature: true };

      const response = await request(app)
        .post('/verify/credential')
        .send({ credential, policy })
        .expect(200);

      expect(response.body).toHaveProperty('verified', true);
      expect(mockAgent.verifyCredential).toHaveBeenCalled();
    });

    it('should return 400 if credential is missing', async () => {
      const response = await request(app)
        .post('/verify/credential')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'credential is required');
    });

    it('should handle verification errors', async () => {
      mockAgent.verifyCredential.mockRejectedValueOnce(new Error('Verification failed'));

      const response = await request(app)
        .post('/verify/credential')
        .send({
          credential: {
            '@context': ['https://www.w3.org/2018/credentials/v1']
          }
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Verification failed');
    });
  });

  describe('POST /verify/presentation', () => {
    it('should verify a valid presentation', async () => {
      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder456',
        verifiableCredential: []
      };

      const response = await request(app)
        .post('/verify/presentation')
        .send({ presentation })
        .expect(200);

      expect(response.body).toHaveProperty('verified', true);
      expect(mockAgent.verifyPresentation).toHaveBeenCalled();
    });

    it('should verify presentation with challenge', async () => {
      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder456'
      };

      const response = await request(app)
        .post('/verify/presentation')
        .send({
          presentation,
          challenge: 'challenge-123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('verified', true);
      expect(mockAgent.verifyPresentation).toHaveBeenCalled();
    });

    it('should return 400 if presentation is missing', async () => {
      const response = await request(app)
        .post('/verify/presentation')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'presentation is required');
    });

    it('should handle verification errors', async () => {
      mockAgent.verifyPresentation.mockRejectedValueOnce(new Error('Verification failed'));

      const response = await request(app)
        .post('/verify/presentation')
        .send({
          presentation: {
            '@context': ['https://www.w3.org/2018/credentials/v1']
          }
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Verification failed');
    });
  });

  describe('POST /presentations/request', () => {
    it('should request a presentation via DIDComm', async () => {
      const response = await request(app)
        .post('/presentations/request')
        .send({
          holderDid: 'did:peer:holder456',
          requestedCredentials: ['DriversLicense']
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockAgent.requestPresentation).toHaveBeenCalled();
    });

    it('should return 400 if holderDid is missing', async () => {
      const response = await request(app)
        .post('/presentations/request')
        .send({ requestedCredentials: ['DriversLicense'] })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'holderDid is required');
    });

    it('should handle request errors', async () => {
      mockAgent.requestPresentation.mockRejectedValueOnce(new Error('Request failed'));

      const response = await request(app)
        .post('/presentations/request')
        .send({
          holderDid: 'did:peer:holder456'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Request failed');
    });
  });

  describe('POST /invitations/presentation-request', () => {
    it('should create a presentation request invitation', async () => {
      const response = await request(app)
        .post('/invitations/presentation-request')
        .send({
          requestedCredentials: ['DriversLicense']
        })
        .expect(200);

      expect(response.body).toHaveProperty('invitation');
      expect(response.body).toHaveProperty('invitationUrl');
      expect(response.body).toHaveProperty('qrCodeUrl');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('challenge');
      expect(mockAgent.generateChallenge).toHaveBeenCalled();
    });

    it('should return 400 if requestedCredentials is missing', async () => {
      const response = await request(app)
        .post('/invitations/presentation-request')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'requestedCredentials array is required');
    });

    it('should create invitation with custom TTL', async () => {
      const response = await request(app)
        .post('/invitations/presentation-request')
        .send({
          requestedCredentials: ['DriversLicense'],
          ttl: 7200
        })
        .expect(200);

      expect(response.body).toHaveProperty('invitation');
      expect(mockAgent.generateChallenge).toHaveBeenCalledWith({
        domain: 'did:peer:verifier789',
        ttlMinutes: 120
      });
    });
  });

  describe('GET /invitations/:shortId', () => {
    it('should return 404 for non-existent invitation', async () => {
      const response = await request(app)
        .get('/invitations/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Invitation not found or expired');
    });

    it('should retrieve an invitation by short ID', async () => {
      // First create an invitation
      const createResponse = await request(app)
        .post('/invitations/presentation-request')
        .send({
          requestedCredentials: ['DriversLicense']
        })
        .expect(200);

      // Extract qrCodeUrl which contains the shortId
      const { qrCodeUrl } = createResponse.body;
      const shortId = qrCodeUrl.split('/').pop();

      // Then retrieve it
      const response = await request(app)
        .get(`/invitations/${shortId}`)
        .expect(200);

      expect(response.body).toHaveProperty('invitation');
      expect(response.body).toHaveProperty('from');
    });
  });

  describe('POST /didcomm', () => {
    it('should handle DIDComm message as string', async () => {
      const response = await request(app)
        .post('/didcomm')
        .set('Content-Type', 'application/didcomm-encrypted+json')
        .send('encrypted-message-string')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockAgent.handleMessage).toHaveBeenCalledWith('encrypted-message-string');
    });

    it('should handle DIDComm message as JSON', async () => {
      const message = { protected: 'header', iv: 'iv', ciphertext: 'ct', tag: 'tag' };

      const response = await request(app)
        .post('/didcomm')
        .send(message)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockAgent.handleMessage).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should handle errors during message processing', async () => {
      mockAgent.handleMessage.mockRejectedValueOnce(new Error('Processing failed'));

      const response = await request(app)
        .post('/didcomm')
        .send('encrypted-message')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Processing failed');
    });
  });

  describe('GET /policy', () => {
    it('should return verification policy', async () => {
      const response = await request(app)
        .get('/policy')
        .expect(200);

      expect(response.body).toHaveProperty('requireValidSignature', true);
      expect(response.body).toHaveProperty('requireNonExpired', true);
      expect(mockAgent.getPolicy).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockAgent.getPolicy.mockImplementationOnce(() => {
        throw new Error('Policy retrieval failed');
      });

      const response = await request(app)
        .get('/policy')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Policy retrieval failed');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'verifier');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /verifications/:challenge', () => {
    it('should return 404 for non-existent verification', async () => {
      const response = await request(app)
        .get('/verifications/non-existent-challenge')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Verification result not found or expired');
    });
  });
});

