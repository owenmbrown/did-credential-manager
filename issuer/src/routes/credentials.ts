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
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory store for OOB invitations (for QR code short URLs)
 * In production, use Redis or a database
 */
const invitationStore = new Map<string, any>();

/**
 * Store an invitation and return a short ID
 */
function storeInvitation(invitation: any, ttlSeconds: number = 3600): string {
  const shortId = uuidv4().split('-')[0]; // Use first segment for shorter URL
  invitationStore.set(shortId, {
    invitation,
    expiresAt: Date.now() + (ttlSeconds * 1000),
  });
  
  // Clean up expired invitations
  setTimeout(() => {
    invitationStore.delete(shortId);
  }, ttlSeconds * 1000);
  
  return shortId;
}

/**
 * Retrieve an invitation by short ID
 */
function getInvitation(shortId: string): any | null {
  const stored = invitationStore.get(shortId);
  if (!stored) return null;
  
  // Check expiration
  if (Date.now() > stored.expiresAt) {
    invitationStore.delete(shortId);
    return null;
  }
  
  return stored.invitation;
}

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
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}/didcomm`;
      
      // Generate full invitation URL (for manual sharing)
      const invitationUrl = OOBProtocol.createInvitationUrl(invitation, baseUrl);
      
      // For QR code: Store invitation and create short URL
      const shortId = storeInvitation(invitation, ttl || 3600);
      const shortUrl = `${protocol}://${host}/invitations/${shortId}`;
      
      // Generate QR code with short URL
      const qrCode = await OOBProtocol.generateQRCode(invitation, shortUrl);

      logger.info('OOB credential offer invitation created', {
        credentialType,
        invitationId: invitation['@id'],
        shortId,
      });

      res.json({
        invitation,
        invitationUrl,     // Full URL for manual sharing
        qrCodeUrl: shortUrl, // Short URL in QR code
        qrCode,            // Base64 data URL
      });
    } catch (error: any) {
      logger.error('Error creating OOB invitation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /invitations/accept
   * Accept OOB invitation (for testing via browser)
   * 
   * Query params:
   *   oob: Base64-encoded invitation
   * 
   * Note: This must come before /invitations/:shortId to avoid route conflict
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
   * GET /invitations/:shortId
   * Retrieve an invitation by short ID (for QR code scans)
   */
  router.get('/invitations/:shortId', async (req: Request, res: Response) => {
    try {
      const { shortId } = req.params;
      
      const invitation = getInvitation(shortId);
      
      if (!invitation) {
        res.status(404).json({ 
          error: 'Invitation not found or expired',
          shortId,
        });
        return;
      }
      
      logger.info('Invitation retrieved via short URL', {
        shortId,
        invitationId: invitation['@id'],
      });
      
      // Return the full invitation object
      res.json({
        invitation,
        from: invitation.from,
        goalCode: invitation.body?.goal_code,
        goal: invitation.body?.goal,
      });
    } catch (error: any) {
      logger.error('Error retrieving invitation:', error);
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

