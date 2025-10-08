/**
 * Issuer Server
 * 
 * Main Express server for the issuer agent
 * 
 * @module server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createIssuerAgent } from './agent';
import { createCredentialRoutes } from './routes/credentials';
import { logger } from '@did-edu/common';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const SERVICE_ENDPOINT = process.env.SERVICE_ENDPOINT || `http://localhost:${PORT}/didcomm`;

/**
 * Start the issuer server
 */
async function startServer() {
  try {
    logger.info('Starting issuer server...');

    // Create Express app
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.text({ type: 'application/didcomm-encrypted+json' }));

    // Create and initialize agent
    logger.info('Initializing issuer agent...');
    const agent = await createIssuerAgent({
      serviceEndpoint: SERVICE_ENDPOINT,
    });
    logger.info(`Issuer agent initialized with DID: ${agent.getDid()}`);

    // Routes
    app.use('/', createCredentialRoutes(agent));

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        service: 'DID Education Toolkit - Issuer',
        did: agent.getDid(),
        endpoints: {
          did: 'GET /',
          health: 'GET /health',
          issueCredential: 'POST /credentials/issue',
          offerCredential: 'POST /credentials/offer',
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
      logger.info(`✅ Issuer server running on port ${PORT}`);
      logger.info(`   DID: ${agent.getDid()}`);
      logger.info(`   Service Endpoint: ${SERVICE_ENDPOINT}`);
      logger.info(`   Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

