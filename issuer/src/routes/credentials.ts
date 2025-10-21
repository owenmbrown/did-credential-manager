/**
 * Credential Issuance Routes
 * 
 * HTTP endpoints for credential issuance
 * 
 * @module routes/credentials
 */

import express, { Request, Response, Router } from 'express';
import { IssuerAgent } from '../agent.js';
import { logger, OOBProtocol } from '@did-edu/common';

/**
 * Create credential routes
 */
export function createCredentialRoutes(agent: IssuerAgent): Router {
  const router = express.Router();

  /**
   * GET /did
   * Get the issuer's DID
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
   * POST /credentials/issue
   * Issue a credential directly (HTTP API)
   * 
   * Body:
   * {
   *   "credentialSubject": {
   *     "id": "did:peer:...",
   *     "name": "John Doe",
   *     "age": 25,
   *     ...
   *   },
   *   "type": ["DriversLicense"], // optional, additional types
   *   "expirationDate": "2025-12-31T23:59:59Z" // optional
   * }
   */
  router.post('/credentials/issue', async (req: Request, res: Response) => {
    try {
      const { credentialSubject, type, expirationDate } = req.body;

      // Validate input
      if (!credentialSubject || !credentialSubject.id) {
        res.status(400).json({ error: 'credentialSubject with id is required' });
        return;
      }

      // Issue the credential
      const credential = await agent.issueCredential({
        credentialSubject,
        type,
        expirationDate,
      });

      logger.info('Credential issued via HTTP', {
        subject: credentialSubject.id,
        type: credential.type,
      });

      res.json({ credential });
    } catch (error: any) {
      logger.error('Error issuing credential:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /credentials/offer
   * Send a credential offer via DIDComm
   * 
   * Body:
   * {
   *   "holderDid": "did:peer:...",
   *   "credentialType": ["VerifiableCredential", "DriversLicense"],
   *   "claims": {
   *     "name": "John Doe",
   *     "age": 25,
   *     ...
   *   }
   * }
   */
  router.post('/credentials/offer', async (req: Request, res: Response) => {
    try {
      const { holderDid, credentialType, claims } = req.body;

      // Validate input
      if (!holderDid) {
        res.status(400).json({ error: 'holderDid is required' });
        return;
      }

      if (!credentialType || !Array.isArray(credentialType)) {
        res.status(400).json({ error: 'credentialType array is required' });
        return;
      }

      if (!claims || typeof claims !== 'object') {
        res.status(400).json({ error: 'claims object is required' });
        return;
      }

      // Send credential offer
      await agent.sendCredentialOffer({
        holderDid,
        credentialType,
        claims,
      });

      logger.info('Credential offer sent via DIDComm', {
        holderDid,
        credentialType,
      });

      res.json({
        success: true,
        message: 'Credential offer sent',
        holderDid,
      });
    } catch (error: any) {
      logger.error('Error sending credential offer:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /invitations/credential-offer
   * Generate an OOB invitation with a credential offer
   * 
   * Body:
   * {
   *   "credentialType": "DriversLicense",
   *   "credentialData": {
   *     "name": "John Doe",
   *     "age": 25,
   *     ...
   *   },
   *   "ttl": 3600 // optional, time-to-live in seconds
   * }
   * 
   * Returns invitation with QR code
   */
  router.post('/invitations/credential-offer', async (req: Request, res: Response) => {
    try {
      const { credentialType, credentialData, ttl } = req.body;

      // Validate input
      if (!credentialType) {
        res.status(400).json({ error: 'credentialType is required' });
        return;
      }

      if (!credentialData || typeof credentialData !== 'object') {
        res.status(400).json({ error: 'credentialData object is required' });
        return;
      }

      const issuerDid = agent.getDid();

      // Create OOB invitation with credential offer
      const invitation = OOBProtocol.createCredentialOfferInvitation(
        issuerDid,
        credentialType,
        credentialData,
        { ttl }
      );

      // Get base URL for this service
      const baseUrl = `${req.protocol}://${req.get('host')}/didcomm`;
      
      // Generate invitation URL
      const invitationUrl = OOBProtocol.createInvitationUrl(invitation, baseUrl);
      
      // Generate QR code
      const qrCode = await OOBProtocol.generateQRCode(invitation, baseUrl);

      logger.info('OOB credential offer invitation created', {
        credentialType,
        invitationId: invitation['@id'],
      });

      res.json({
        invitation,
        invitationUrl,
        qrCode, // Base64 data URL
      });
    } catch (error: any) {
      logger.error('Error creating OOB invitation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /invitations/:invitationId
   * Accept OOB invitation (for testing via browser)
   * 
   * Query params:
   *   oob: Base64-encoded invitation
   */
  router.get('/invitations/accept', async (req: Request, res: Response) => {
    try {
      const oobParam = req.query.oob as string;

      if (!oobParam) {
        res.status(400).json({ error: 'Missing oob query parameter' });
        return;
      }

      // Parse the invitation
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const parsed = OOBProtocol.parseInvitationUrl(fullUrl);

      logger.info('OOB invitation received', {
        from: parsed.from,
        goal: parsed.goal,
        isExpired: parsed.isExpired,
      });

      res.json({
        invitation: parsed.invitation,
        from: parsed.from,
        goal: parsed.goal,
        goalCode: parsed.goalCode,
        isExpired: parsed.isExpired,
        attachments: parsed.attachments,
      });
    } catch (error: any) {
      logger.error('Error accepting OOB invitation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /didcomm
   * Receive DIDComm messages
   * 
   * Body: Encrypted DIDComm message (string)
   */
  router.post('/didcomm', async (req: Request, res: Response) => {
    try {
      const packedMessage = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      // Handle the message
      const result = await agent.handleMessage(packedMessage);

      logger.info('DIDComm message processed');

      // Return empty response or acknowledgment
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
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'issuer',
      did: agent.getDid(),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

