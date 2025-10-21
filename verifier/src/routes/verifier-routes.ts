/**
 * Verifier Routes
 * 
 * HTTP endpoints for verification operations
 * 
 * @module routes/verifier-routes
 */

import express, { Request, Response, Router } from 'express';
import { VerifierAgent } from '../agent.js';
import { logger, OOBProtocol } from '@did-edu/common';

/**
 * Create verifier routes
 */
export function createVerifierRoutes(agent: VerifierAgent): Router {
  const router = express.Router();

  /**
   * GET /did
   * Get the verifier's DID
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
   * POST /challenges/generate
   * Generate a new challenge
   * 
   * Body:
   * {
   *   "holderDid": "did:peer:...", // optional
   *   "domain": "verifier.example.com", // optional
   *   "ttlMinutes": 5 // optional
   * }
   */
  router.post('/challenges/generate', (req: Request, res: Response) => {
    try {
      const { holderDid, domain, ttlMinutes } = req.body;

      const challenge = agent.generateChallenge({
        holderDid,
        domain,
        ttlMinutes,
      });

      res.json({
        challengeId: challenge.id,
        challenge: challenge.challenge,
        expiresAt: challenge.expiresAt,
        ...(holderDid && { holderDid }),
        ...(domain && { domain }),
      });
    } catch (error: any) {
      logger.error('Error generating challenge:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /challenges/:id
   * Get a challenge by ID
   */
  router.get('/challenges/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const challenge = agent.getChallengeManager().getChallenge(id);

      if (!challenge) {
        res.status(404).json({ error: 'Challenge not found or expired' });
        return;
      }

      res.json(challenge);
    } catch (error: any) {
      logger.error('Error getting challenge:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /verify/credential
   * Verify a Verifiable Credential
   * 
   * Body:
   * {
   *   "credential": {...}
   * }
   */
  router.post('/verify/credential', async (req: Request, res: Response) => {
    try {
      const { credential } = req.body;

      if (!credential) {
        res.status(400).json({ error: 'credential is required' });
        return;
      }

      const result = await agent.verifyCredential(credential);

      res.json(result);
    } catch (error: any) {
      logger.error('Error verifying credential:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /verify/presentation
   * Verify a Verifiable Presentation
   * 
   * Body:
   * {
   *   "presentation": {...},
   *   "challenge": "...", // optional
   *   "challengeId": "...", // optional (will lookup challenge)
   *   "domain": "..." // optional
   * }
   */
  router.post('/verify/presentation', async (req: Request, res: Response) => {
    try {
      const { presentation, challenge, challengeId, domain } = req.body;

      if (!presentation) {
        res.status(400).json({ error: 'presentation is required' });
        return;
      }

      let result;

      if (challengeId) {
        // Verify with challenge ID (will also consume the challenge)
        result = await agent.verifyPresentationWithChallenge(presentation, challengeId);
      } else {
        // Verify with optional challenge and domain
        result = await agent.verifyPresentation(presentation, {
          challenge,
          domain,
        });
      }

      res.json(result);
    } catch (error: any) {
      logger.error('Error verifying presentation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /presentations/request
   * Request a presentation from a holder via DIDComm
   * 
   * Body:
   * {
   *   "holderDid": "did:peer:...",
   *   "credentialTypes": ["VerifiableCredential", "DriversLicense"], // optional
   *   "fields": ["name", "age"], // optional
   *   "trustedIssuers": ["did:peer:..."], // optional
   *   "domain": "verifier.example.com" // optional
   * }
   */
  router.post('/presentations/request', async (req: Request, res: Response) => {
    try {
      const { holderDid, credentialTypes, fields, trustedIssuers, domain } = req.body;

      if (!holderDid) {
        res.status(400).json({ error: 'holderDid is required' });
        return;
      }

      const challenge = await agent.requestPresentation({
        holderDid,
        credentialTypes,
        fields,
        trustedIssuers,
        domain,
      });

      res.json({
        success: true,
        message: 'Presentation request sent',
        challengeId: challenge.id,
        challenge: challenge.challenge,
        expiresAt: challenge.expiresAt,
      });
    } catch (error: any) {
      logger.error('Error requesting presentation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /invitations/presentation-request
   * Generate an OOB invitation with a presentation request
   * 
   * Body:
   * {
   *   "requestedCredentials": ["DriversLicense", "UniversityDegree"], // array of credential types
   *   "ttl": 3600 // optional, time-to-live in seconds
   * }
   * 
   * Returns invitation with QR code
   */
  router.post('/invitations/presentation-request', async (req: Request, res: Response) => {
    try {
      const { requestedCredentials, ttl } = req.body;

      // Validate input
      if (!requestedCredentials || !Array.isArray(requestedCredentials) || requestedCredentials.length === 0) {
        res.status(400).json({ error: 'requestedCredentials array is required' });
        return;
      }

      const verifierDid = agent.getDid();

      // Generate a challenge for this request
      const { challenge } = agent.generateChallenge({
        domain: verifierDid,
        ttlMinutes: ttl ? Math.floor(ttl / 60) : 5,
      });

      // Create OOB invitation with presentation request
      const invitation = OOBProtocol.createPresentationRequestInvitation(
        verifierDid,
        requestedCredentials,
        challenge,
        { ttl }
      );

      // Get base URL for this service
      const baseUrl = `${req.protocol}://${req.get('host')}/didcomm`;
      
      // Generate invitation URL
      const invitationUrl = OOBProtocol.createInvitationUrl(invitation, baseUrl);
      
      // Generate QR code
      const qrCode = await OOBProtocol.generateQRCode(invitation, baseUrl);

      logger.info('OOB presentation request invitation created', {
        requestedCredentials,
        invitationId: invitation['@id'],
        challenge,
      });

      res.json({
        invitation,
        invitationUrl,
        qrCode, // Base64 data URL
        challenge, // Include challenge for reference
      });
    } catch (error: any) {
      logger.error('Error creating OOB invitation:', error);
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

      const result = await agent.handleMessage(packedMessage);

      res.status(200).json({
        success: true,
        result,
      });
    } catch (error: any) {
      logger.error('Error handling DIDComm message:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /policy
   * Get current verification policy
   */
  router.get('/policy', (req: Request, res: Response) => {
    try {
      const policy = agent.getPolicy();
      res.json(policy);
    } catch (error: any) {
      logger.error('Error getting policy:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /policy
   * Update verification policy
   * 
   * Body:
   * {
   *   "trustedIssuers": ["did:peer:..."],
   *   "requiredCredentialTypes": ["DriversLicense"],
   *   "checkExpiration": true,
   *   "checkProof": false,
   *   "checkChallenge": true,
   *   "checkDomain": false
   * }
   */
  router.put('/policy', (req: Request, res: Response) => {
    try {
      const policy = req.body;
      agent.updatePolicy(policy);

      res.json({
        success: true,
        message: 'Policy updated',
        policy: agent.getPolicy(),
      });
    } catch (error: any) {
      logger.error('Error updating policy:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /health
   * Health check endpoint
   */
  router.get('/health', (req: Request, res: Response) => {
    try {
      const challengeManager = agent.getChallengeManager();
      res.json({
        status: 'healthy',
        service: 'verifier',
        did: agent.getDid(),
        activeChallenges: challengeManager.getActiveChallengeCount(),
        policy: agent.getPolicy(),
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


