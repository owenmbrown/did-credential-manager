/**
 * Verifier Server
 * 
 * Main Express server for the verifier agent
 * 
 * @module server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createVerifierAgent } from './agent';
import { createVerifierRoutes } from './routes/verifier-routes';
import { logger } from '@did-edu/common';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5002;
const SERVICE_ENDPOINT = process.env.SERVICE_ENDPOINT || `http://localhost:${PORT}/didcomm`;
const CHALLENGE_TTL = parseInt(process.env.CHALLENGE_TTL || '5');

// Parse trusted issuers from environment
const TRUSTED_ISSUERS = process.env.TRUSTED_ISSUERS 
  ? process.env.TRUSTED_ISSUERS.split(',').map(s => s.trim())
  : undefined;

/**
 * Start the verifier server
 */
async function startServer() {
  try {
    logger.info('Starting verifier server...');

    // Create Express app
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.text({ type: 'application/didcomm-encrypted+json' }));

    // Create and initialize agent
    logger.info('Initializing verifier agent...');
    const agent = await createVerifierAgent({
      serviceEndpoint: SERVICE_ENDPOINT,
      challengeTTL: CHALLENGE_TTL,
      policy: {
        trustedIssuers: TRUSTED_ISSUERS,
        checkExpiration: true,
        checkProof: false, // TODO: Enable in Phase 3
        checkChallenge: true,
        checkDomain: false,
      },
    });
    logger.info(`Verifier agent initialized with DID: ${agent.getDid()}`);

    // Routes
    app.use('/', createVerifierRoutes(agent));

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        service: 'DID Education Toolkit - Verifier',
        did: agent.getDid(),
        endpoints: {
          did: 'GET /did',
          health: 'GET /health',
          generateChallenge: 'POST /challenges/generate',
          getChallenge: 'GET /challenges/:id',
          verifyCredential: 'POST /verify/credential',
          verifyPresentation: 'POST /verify/presentation',
          requestPresentation: 'POST /presentations/request',
          getPolicy: 'GET /policy',
          updatePolicy: 'PUT /policy',
          didcomm: 'POST /didcomm',
        },
      });
    });

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    });

    // Start server
    app.listen(PORT, () => {
      logger.info(`✅ Verifier server running on port ${PORT}`);
      logger.info(`   DID: ${agent.getDid()}`);
      logger.info(`   Service Endpoint: ${SERVICE_ENDPOINT}`);
      logger.info(`   Challenge TTL: ${CHALLENGE_TTL} minutes`);
      if (TRUSTED_ISSUERS) {
        logger.info(`   Trusted Issuers: ${TRUSTED_ISSUERS.length}`);
      }
      logger.info(`   Health: http://localhost:${PORT}/health`);
    });

    // Handle graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down verifier server...');
      agent.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

