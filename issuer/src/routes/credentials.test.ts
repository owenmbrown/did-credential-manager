/**
 * Tests for Credential Issuance Routes
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';
import { createCredentialRoutes } from './credentials.js';

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-1234-5678-90ab-cdef')
}));

// Mock @did-edu/common
jest.mock('@did-edu/common', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  OOBProtocol: {
    createCredentialOfferInvitation: jest.fn().mockReturnValue({
      '@type': 'https://didcomm.org/out-of-band/2.0/invitation',
      '@id': 'invitation-123',
      from: 'did:peer:issuer123',
      body: {
        goal_code: 'issue-vc',
        goal: 'Issue Credential',
        accept: ['didcomm/v2']
      }
    }),
    createInvitationUrl: jest.fn().mockReturnValue(
      'http://localhost:5001/didcomm?oob=eyJ0eXBlIjoi...'
    ),
    generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,iVBORw0...' as any),
    parseInvitationUrl: jest.fn().mockReturnValue({
      invitation: {
        '@type': 'https://didcomm.org/out-of-band/2.0/invitation',
        '@id': 'invitation-123',
        from: 'did:peer:issuer123'
      },
      from: 'did:peer:issuer123',
      goal: 'Issue Credential',
      goalCode: 'issue-vc',
      isExpired: false,
      attachments: []
    })
  }
}));

// Create mock agent
const createMockAgent = () => ({
  getDid: jest.fn().mockReturnValue('did:peer:issuer123'),
  issueCredential: jest.fn().mockResolvedValue({
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'DriversLicense'],
    issuer: { id: 'did:peer:issuer123' },
    issuanceDate: '2025-01-01T00:00:00Z',
    credentialSubject: {
      id: 'did:peer:holder456',
      name: 'John Doe',
      age: 25
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: '2025-01-01T00:00:00Z',
      proofPurpose: 'assertionMethod',
      verificationMethod: 'did:peer:issuer123#key-1'
    }
  } as any),
  sendCredentialOffer: jest.fn().mockResolvedValue(undefined as any),
  handleMessage: jest.fn().mockResolvedValue({ success: true } as any)
});

describe('Credential Routes', () => {
  let app: Express;
  let mockAgent: ReturnType<typeof createMockAgent>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAgent = createMockAgent();
    
    app = express();
    app.use(express.json());
    app.use(express.text({ type: 'application/didcomm-encrypted+json' }));
    app.use('/', createCredentialRoutes(mockAgent as any));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('GET /did', () => {
    it('should return the issuer DID', async () => {
      const response = await request(app)
        .get('/did')
        .expect(200);

      expect(response.body).toEqual({ did: 'did:peer:issuer123' });
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

  describe('POST /credentials/issue', () => {
    it('should issue a credential with valid input', async () => {
      const credentialRequest = {
        credentialSubject: {
          id: 'did:peer:holder456',
          name: 'John Doe',
          age: 25
        }
      };

      const response = await request(app)
        .post('/credentials/issue')
        .send(credentialRequest)
        .expect(200);

      expect(response.body).toHaveProperty('credential');
      expect(response.body.credential.issuer.id).toBe('did:peer:issuer123');
      expect(mockAgent.issueCredential).toHaveBeenCalledWith({
        credentialSubject: credentialRequest.credentialSubject,
        type: undefined,
        expirationDate: undefined
      });
    });

    it('should issue a credential with custom type', async () => {
      const credentialRequest = {
        credentialSubject: {
          id: 'did:peer:holder456',
          name: 'John Doe'
        },
        type: ['DriversLicense']
      };

      await request(app)
        .post('/credentials/issue')
        .send(credentialRequest)
        .expect(200);

      expect(mockAgent.issueCredential).toHaveBeenCalledWith({
        credentialSubject: credentialRequest.credentialSubject,
        type: ['DriversLicense'],
        expirationDate: undefined
      });
    });

    it('should issue a credential with expiration date', async () => {
      const credentialRequest = {
        credentialSubject: {
          id: 'did:peer:holder456',
          name: 'John Doe'
        },
        expirationDate: '2025-12-31T23:59:59Z'
      };

      await request(app)
        .post('/credentials/issue')
        .send(credentialRequest)
        .expect(200);

      expect(mockAgent.issueCredential).toHaveBeenCalledWith({
        credentialSubject: credentialRequest.credentialSubject,
        type: undefined,
        expirationDate: '2025-12-31T23:59:59Z'
      });
    });

    it('should return 400 if credentialSubject is missing', async () => {
      const response = await request(app)
        .post('/credentials/issue')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'credentialSubject with id is required');
    });

    it('should return 400 if credentialSubject.id is missing', async () => {
      const response = await request(app)
        .post('/credentials/issue')
        .send({ credentialSubject: { name: 'John Doe' } })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'credentialSubject with id is required');
    });

    it('should handle errors during issuance', async () => {
      mockAgent.issueCredential.mockRejectedValueOnce(new Error('Issuance failed') as any);

      const response = await request(app)
        .post('/credentials/issue')
        .send({
          credentialSubject: {
            id: 'did:peer:holder456',
            name: 'John Doe'
          }
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Issuance failed');
    });
  });

  describe('POST /credentials/offer', () => {
    it('should send a credential offer via DIDComm', async () => {
      const offerRequest = {
        holderDid: 'did:peer:holder456',
        credentialType: ['VerifiableCredential', 'DriversLicense'],
        claims: { name: 'John Doe', age: 25 }
      };

      const response = await request(app)
        .post('/credentials/offer')
        .send(offerRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Credential offer sent',
        holderDid: 'did:peer:holder456'
      });
      expect(mockAgent.sendCredentialOffer).toHaveBeenCalledWith(offerRequest);
    });

    it('should return 400 if holderDid is missing', async () => {
      const response = await request(app)
        .post('/credentials/offer')
        .send({
          credentialType: ['VerifiableCredential'],
          claims: {}
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'holderDid is required');
    });

    it('should return 400 if credentialType is missing', async () => {
      const response = await request(app)
        .post('/credentials/offer')
        .send({
          holderDid: 'did:peer:holder456',
          claims: {}
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'credentialType array is required');
    });

    it('should return 400 if credentialType is not an array', async () => {
      const response = await request(app)
        .post('/credentials/offer')
        .send({
          holderDid: 'did:peer:holder456',
          credentialType: 'VerifiableCredential',
          claims: {}
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'credentialType array is required');
    });

    it('should return 400 if claims is missing', async () => {
      const response = await request(app)
        .post('/credentials/offer')
        .send({
          holderDid: 'did:peer:holder456',
          credentialType: ['VerifiableCredential']
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'claims object is required');
    });

    it('should return 400 if claims is not an object', async () => {
      const response = await request(app)
        .post('/credentials/offer')
        .send({
          holderDid: 'did:peer:holder456',
          credentialType: ['VerifiableCredential'],
          claims: 'invalid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'claims object is required');
    });

    it('should handle errors during offer', async () => {
      mockAgent.sendCredentialOffer.mockRejectedValueOnce(new Error('Offer failed') as any);

      const response = await request(app)
        .post('/credentials/offer')
        .send({
          holderDid: 'did:peer:holder456',
          credentialType: ['VerifiableCredential'],
          claims: {}
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Offer failed');
    });
  });

  describe('POST /invitations/credential-offer', () => {
    it('should create an OOB invitation with credential offer', async () => {
      const invitationRequest = {
        credentialType: 'DriversLicense',
        credentialData: { name: 'John Doe', age: 25 }
      };

      const response = await request(app)
        .post('/invitations/credential-offer')
        .send(invitationRequest)
        .expect(200);

      expect(response.body).toHaveProperty('invitation');
      expect(response.body).toHaveProperty('invitationUrl');
      expect(response.body).toHaveProperty('qrCodeUrl');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it('should create invitation with custom TTL', async () => {
      const invitationRequest = {
        credentialType: 'DriversLicense',
        credentialData: { name: 'John Doe' },
        ttl: 7200
      };

      const response = await request(app)
        .post('/invitations/credential-offer')
        .send(invitationRequest)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('invitation');
      expect(response.body).toHaveProperty('invitationUrl');
      expect(response.body).toHaveProperty('qrCodeUrl');
    });

    it('should return 400 if credentialType is missing', async () => {
      const response = await request(app)
        .post('/invitations/credential-offer')
        .send({ credentialData: {} })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'credentialType is required');
    });

    it('should return 400 if credentialData is missing', async () => {
      const response = await request(app)
        .post('/invitations/credential-offer')
        .send({ credentialType: 'DriversLicense' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'credentialData object is required');
    });

    it('should return 400 if credentialData is not an object', async () => {
      const response = await request(app)
        .post('/invitations/credential-offer')
        .send({
          credentialType: 'DriversLicense',
          credentialData: 'invalid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'credentialData object is required');
    });

    it('should handle agent errors during invitation creation', async () => {
      // Mock getDid to throw an error
      mockAgent.getDid.mockImplementationOnce(() => {
        throw new Error('DID not available');
      });

      const response = await request(app)
        .post('/invitations/credential-offer')
        .send({
          credentialType: 'DriversLicense',
          credentialData: {}
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /invitations/:shortId', () => {
    it('should return 404 for shortId endpoint (integration test needed)', async () => {
      // This endpoint requires actual invitation storage which needs integration testing
      // For now, test the 404 case
      const response = await request(app)
        .get('/invitations/test-short-id')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Invitation not found or expired');
    });

    it('should return 404 for non-existent invitation', async () => {
      const response = await request(app)
        .get('/invitations/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Invitation not found or expired');
    });

    it('should return 404 for expired invitation', async () => {
      // Create invitation with very short TTL (1 second)
      const createResponse = await request(app)
        .post('/invitations/credential-offer')
        .send({
          credentialType: 'DriversLicense',
          credentialData: {},
          ttl: 1
        });

      const { shortId } = createResponse.body;

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const response = await request(app)
        .get(`/invitations/${shortId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Invitation not found or expired');
    }, 10000);

    it('should handle retrieval of non-existent invitations', async () => {
      // Try to retrieve a non-existent invitation
      const response = await request(app)
        .get('/invitations/non-existent-id-xyz')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Invitation not found or expired');
    });
  });

  describe('GET /invitations/accept', () => {
    it('should return 400 if oob parameter is missing', async () => {
      const response = await request(app)
        .get('/invitations/accept')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing oob query parameter');
    });

    it('should handle errors during invitation parsing', async () => {
      const response = await request(app)
        .get('/invitations/accept?oob=invalid-base64-data')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /didcomm', () => {
    it('should handle DIDComm message as string', async () => {
      const response = await request(app)
        .post('/didcomm')
        .set('Content-Type', 'application/didcomm-encrypted+json')
        .send('encrypted-message-string')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockAgent.handleMessage).toHaveBeenCalledWith('encrypted-message-string');
    });

    it('should handle DIDComm message as JSON object', async () => {
      const message = { type: 'encrypted', data: '...' };
      
      const response = await request(app)
        .post('/didcomm')
        .send(message)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockAgent.handleMessage).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should handle errors during message processing', async () => {
      mockAgent.handleMessage.mockRejectedValueOnce(new Error('Processing failed') as any);

      const response = await request(app)
        .post('/didcomm')
        .send('encrypted-message')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Processing failed');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        service: 'issuer',
        did: 'did:peer:issuer123',
        timestamp: expect.any(String)
      });
    });

    it('should include valid ISO timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });
});

