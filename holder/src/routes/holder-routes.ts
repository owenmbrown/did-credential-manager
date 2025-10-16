/**
 * Holder Routes
 * 
 * HTTP endpoints for holder operations
 * 
 * @module routes/holder-routes
 */

import express, { Request, Response, Router } from 'express';
import { HolderAgent } from '../agent.js';
import { logger } from '@did-edu/common';

/**
 * Create holder routes
 */
export function createHolderRoutes(agent: HolderAgent): Router {
  const router = express.Router();

  /**
   * GET /did
   * Get the holder's DID
   */
  router.get('/did', (req: Request, res: Response) => {
    try {
      const did = agent.getDid();
      res.json({ did });
    } catch (error: any) {
      logger.error('Error getting DID:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /credentials
   * Get all stored credentials
   */
  router.get('/credentials', async (req: Request, res: Response) => {
    try {
      const credentials = await agent.getCredentials();
      res.json({
        credentials,
        count: credentials.length,
      });
    } catch (error: any) {
      logger.error('Error getting credentials:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /credentials/:id
   * Get a specific credential
   */
  router.get('/credentials/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const credential = await agent.getCredential(id);

      if (!credential) {
        res.status(404).json({ error: 'Credential not found' });
        return;
      }

      res.json(credential);
    } catch (error: any) {
      logger.error('Error getting credential:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /credentials
   * Store a credential manually (for testing)
   * 
   * Body: { credential: {...} }
   */
  router.post('/credentials', async (req: Request, res: Response) => {
    try {
      const { credential } = req.body;

      if (!credential) {
        res.status(400).json({ error: 'credential is required' });
        return;
      }

      await agent.storeCredential(credential);

      res.json({
        success: true,
        message: 'Credential stored successfully',
      });
    } catch (error: any) {
      logger.error('Error storing credential:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /credentials/:id
   * Delete a credential
   */
  router.delete('/credentials/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await agent.deleteCredential(id);

      if (!deleted) {
        res.status(404).json({ error: 'Credential not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Credential deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting credential:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /credentials/request
   * Request a credential from an issuer via DIDComm
   * 
   * Body:
   * {
   *   "issuerDid": "did:peer:...",
   *   "credentialType": ["VerifiableCredential", "DriversLicense"],
   *   "claims": { ... }
   * }
   */
  router.post('/credentials/request', async (req: Request, res: Response) => {
    try {
      const { issuerDid, credentialType, claims } = req.body;

      if (!issuerDid) {
        res.status(400).json({ error: 'issuerDid is required' });
        return;
      }

      if (!credentialType || !Array.isArray(credentialType)) {
        res.status(400).json({ error: 'credentialType array is required' });
        return;
      }

      await agent.requestCredential({
        issuerDid,
        credentialType,
        claims,
      });

      res.json({
        success: true,
        message: 'Credential request sent',
        issuerDid,
      });
    } catch (error: any) {
      logger.error('Error requesting credential:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /presentations/create
   * Create a Verifiable Presentation
   * 
   * Body:
   * {
   *   "credentials": [...], // Array of credential IDs or full credentials
   *   "challenge": "...",
   *   "domain": "...",
   *   "verifierDid": "did:peer:..."
   * }
   */
  router.post('/presentations/create', async (req: Request, res: Response) => {
    try {
      const { credentials, challenge, domain, verifierDid } = req.body;

      if (!credentials || !Array.isArray(credentials)) {
        res.status(400).json({ error: 'credentials array is required' });
        return;
      }

      // If credentials are IDs, fetch them from storage
      const fullCredentials = [];
      for (const credOrId of credentials) {
        if (typeof credOrId === 'string') {
          const stored = await agent.getCredential(credOrId);
          if (stored) {
            fullCredentials.push(stored.credential);
          }
        } else {
          fullCredentials.push(credOrId);
        }
      }

      if (fullCredentials.length === 0) {
        res.status(400).json({ error: 'No valid credentials found' });
        return;
      }

      const presentation = await agent.createPresentation({
        credentials: fullCredentials,
        challenge,
        domain,
        verifierDid,
      });

      res.json({ presentation });
    } catch (error: any) {
      logger.error('Error creating presentation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /presentations/send
   * Send a presentation to a verifier via DIDComm
   * 
   * Body:
   * {
   *   "verifierDid": "did:peer:...",
   *   "presentation": {...},
   *   "threadId": "..." // optional
   * }
   */
  router.post('/presentations/send', async (req: Request, res: Response) => {
    try {
      const { verifierDid, presentation, threadId } = req.body;

      if (!verifierDid) {
        res.status(400).json({ error: 'verifierDid is required' });
        return;
      }

      if (!presentation) {
        res.status(400).json({ error: 'presentation is required' });
        return;
      }

      await agent.sendPresentation({
        verifierDid,
        presentation,
        threadId,
      });

      res.json({
        success: true,
        message: 'Presentation sent',
        verifierDid,
      });
    } catch (error: any) {
      logger.error('Error sending presentation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /didcomm
   * Receive DIDComm messages
   */
  router.post('/didcomm', async (req: Request, res: Response) => {
    try {
      const packedMessage = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      await agent.handleMessage(packedMessage);

      res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error('Error handling DIDComm message:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /health
   * Health check endpoint
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const credentials = await agent.getCredentials();
      res.json({
        status: 'healthy',
        service: 'holder',
        did: agent.getDid(),
        credentialCount: credentials.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
      });
    }
  });

  return router;
}

