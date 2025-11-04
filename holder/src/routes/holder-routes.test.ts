/**
 * Tests for Holder Routes
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';
import { createHolderRoutes } from './holder-routes.js';

// Mock @did-edu/common
jest.mock('@did-edu/common', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  OOBProtocol: {
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
  getDid: jest.fn().mockReturnValue('did:peer:holder456'),
  getCredentials: jest.fn().mockResolvedValue([
    {
      hash: 'cred-hash-1',
      credential: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'DriversLicense'],
        issuer: { id: 'did:peer:issuer123' },
        credentialSubject: { id: 'did:peer:holder456', name: 'John Doe' }
      }
    }
  ]),
  getCredential: jest.fn().mockResolvedValue({
    hash: 'cred-hash-1',
    credential: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      issuer: { id: 'did:peer:issuer123' },
      credentialSubject: { id: 'did:peer:holder456' }
    }
  }),
  storeCredential: jest.fn().mockResolvedValue(undefined),
  deleteCredential: jest.fn().mockResolvedValue(undefined),
  createPresentation: jest.fn().mockResolvedValue({
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiablePresentation'],
    holder: 'did:peer:holder456',
    verifiableCredential: []
  }),
  handleMessage: jest.fn().mockResolvedValue({ success: true })
});

describe('Holder Routes', () => {
  let app: Express;
  let mockAgent: ReturnType<typeof createMockAgent>;

  beforeEach(() => {
    mockAgent = createMockAgent();
    app = express();
    app.use(express.json());
    app.use(express.text({ type: 'application/didcomm-encrypted+json' }));
    app.use('/', createHolderRoutes(mockAgent as any));
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('GET /did', () => {
    it('should return the holder DID', async () => {
      const response = await request(app)
        .get('/did')
        .expect(200);

      expect(response.body).toEqual({ did: 'did:peer:holder456' });
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

  describe('GET /credentials', () => {
    it('should return all credentials', async () => {
      const response = await request(app)
        .get('/credentials')
        .expect(200);

      expect(response.body).toHaveProperty('credentials');
      expect(response.body).toHaveProperty('count', 1);
      expect(response.body.credentials).toHaveLength(1);
      expect(mockAgent.getCredentials).toHaveBeenCalled();
    });

    it('should return empty array when no credentials', async () => {
      mockAgent.getCredentials.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/credentials')
        .expect(200);

      expect(response.body.credentials).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should handle errors', async () => {
      mockAgent.getCredentials.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/credentials')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('GET /credentials/:id', () => {
    it('should return a specific credential', async () => {
      const response = await request(app)
        .get('/credentials/cred-hash-1')
        .expect(200);

      expect(response.body).toHaveProperty('credential');
      expect(mockAgent.getCredential).toHaveBeenCalledWith('cred-hash-1');
    });

    it('should return 404 for non-existent credential', async () => {
      mockAgent.getCredential.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/credentials/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Credential not found');
    });

    it('should handle errors', async () => {
      mockAgent.getCredential.mockRejectedValueOnce(new Error('Retrieval failed'));

      const response = await request(app)
        .get('/credentials/cred-1')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Retrieval failed');
    });
  });

  describe('POST /credentials', () => {
    it('should store a credential', async () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: { id: 'did:peer:issuer123' },
        credentialSubject: { id: 'did:peer:holder456' }
      };

      const response = await request(app)
        .post('/credentials')
        .send({ credential })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Credential stored successfully');
      expect(mockAgent.storeCredential).toHaveBeenCalledWith(credential);
    });

    it('should return 400 if credential is missing', async () => {
      const response = await request(app)
        .post('/credentials')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'credential is required');
    });

    it('should handle storage errors', async () => {
      mockAgent.storeCredential.mockRejectedValueOnce(new Error('Storage failed'));

      const response = await request(app)
        .post('/credentials')
        .send({
          credential: { '@context': ['https://www.w3.org/2018/credentials/v1'] }
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Storage failed');
    });
  });

  describe('DELETE /credentials/:id', () => {
    it('should delete a credential', async () => {
      mockAgent.deleteCredential.mockResolvedValueOnce(true);

      const response = await request(app)
        .delete('/credentials/cred-hash-1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Credential deleted successfully');
      expect(mockAgent.deleteCredential).toHaveBeenCalledWith('cred-hash-1');
    });

    it('should return 404 for non-existent credential', async () => {
      mockAgent.deleteCredential.mockResolvedValueOnce(false);

      const response = await request(app)
        .delete('/credentials/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Credential not found');
    });

    it('should handle deletion errors', async () => {
      mockAgent.deleteCredential.mockRejectedValueOnce(new Error('Deletion failed'));

      const response = await request(app)
        .delete('/credentials/cred-1')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Deletion failed');
    });
  });

  describe('POST /credentials/request', () => {
    it('should request a credential from issuer', async () => {
      const mockAgent = createMockAgent();
      mockAgent.requestCredential = jest.fn().mockResolvedValue(undefined);
      app = express();
      app.use(express.json());
      app.use('/', createHolderRoutes(mockAgent as any));

      const response = await request(app)
        .post('/credentials/request')
        .send({
          issuerDid: 'did:peer:issuer123',
          credentialType: ['VerifiableCredential', 'DriversLicense'],
          claims: { name: 'John Doe' }
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Credential request sent');
      expect(mockAgent.requestCredential).toHaveBeenCalled();
    });

    it('should return 400 if issuerDid is missing', async () => {
      const response = await request(app)
        .post('/credentials/request')
        .send({ credentialType: ['VerifiableCredential'] })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'issuerDid is required');
    });

    it('should return 400 if credentialType is missing', async () => {
      const response = await request(app)
        .post('/credentials/request')
        .send({ issuerDid: 'did:peer:issuer123' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'credentialType array is required');
    });
  });

  describe('POST /presentations/create', () => {
    it('should create a presentation with credentials', async () => {
      const response = await request(app)
        .post('/presentations/create')
        .send({
          credentials: ['cred-hash-1'],
          verifierDid: 'did:peer:verifier789'
        })
        .expect(200);

      expect(response.body).toHaveProperty('presentation');
      expect(mockAgent.createPresentation).toHaveBeenCalled();
    });

    it('should return 400 if credentials is missing', async () => {
      const response = await request(app)
        .post('/presentations/create')
        .send({ verifierDid: 'did:peer:verifier789' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'credentials array is required');
    });

    it('should return 400 if no valid credentials found', async () => {
      mockAgent.getCredential.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/presentations/create')
        .send({
          credentials: ['non-existent-id'],
          verifierDid: 'did:peer:verifier789'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No valid credentials found');
    });

    it('should handle presentation creation errors', async () => {
      mockAgent.createPresentation.mockRejectedValueOnce(new Error('Creation failed'));

      const response = await request(app)
        .post('/presentations/create')
        .send({
          credentials: ['cred-hash-1'],
          verifierDid: 'did:peer:verifier789'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Creation failed');
    });
  });

  describe('POST /presentations/send', () => {
    it('should send a presentation to verifier', async () => {
      const mockAgent = createMockAgent();
      mockAgent.sendPresentation = jest.fn().mockResolvedValue(undefined);
      app = express();
      app.use(express.json());
      app.use('/', createHolderRoutes(mockAgent as any));

      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder456'
      };

      const response = await request(app)
        .post('/presentations/send')
        .send({
          verifierDid: 'did:peer:verifier789',
          presentation
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockAgent.sendPresentation).toHaveBeenCalled();
    });

    it('should return 400 if verifierDid is missing', async () => {
      const response = await request(app)
        .post('/presentations/send')
        .send({ presentation: {} })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'verifierDid is required');
    });

    it('should return 400 if presentation is missing', async () => {
      const response = await request(app)
        .post('/presentations/send')
        .send({ verifierDid: 'did:peer:verifier789' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'presentation is required');
    });
  });

  describe('POST /invitations/accept', () => {
    it('should return 400 if neither invitationUrl nor invitation provided', async () => {
      const response = await request(app)
        .post('/invitations/accept')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Either invitationUrl or invitation is required');
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

    it('should handle DIDComm message as JSON', async () => {
      const message = { protected: 'header', iv: 'iv', ciphertext: 'ct', tag: 'tag' };

      const response = await request(app)
        .post('/didcomm')
        .send(message)
        .expect(200);

      expect(response.body).toEqual({ success: true });
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

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'holder');
      expect(response.body).toHaveProperty('did', 'did:peer:holder456');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});

