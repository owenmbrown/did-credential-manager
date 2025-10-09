/**
 * Holder Server
 * 
 * Main Express server for the holder agent
 * 
 * @module server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createHolderAgent } from './agent';
import { createHolderRoutes } from './routes/holder-routes';
import { logger } from '@did-edu/common';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5003;
const SERVICE_ENDPOINT = process.env.SERVICE_ENDPOINT || `http://localhost:${PORT}/didcomm`;
const DB_PATH = process.env.DB_PATH || './holder-credentials.db';

/**
 * Start the holder server
 */
async function startServer() {
  try {
    logger.info('Starting holder server...');

    // Create Express app
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.text({ type: 'application/didcomm-encrypted+json' }));

    // Create and initialize agent
    logger.info('Initializing holder agent...');
    const agent = await createHolderAgent({
      serviceEndpoint: SERVICE_ENDPOINT,
      dbPath: DB_PATH,
    });
    logger.info(`Holder agent initialized with DID: ${agent.getDid()}`);

    // Routes
    app.use('/', createHolderRoutes(agent));

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        service: 'DID Education Toolkit - Holder',
        did: agent.getDid(),
        endpoints: {
          did: 'GET /did',
          health: 'GET /health',
          credentials: 'GET /credentials',
          getCredential: 'GET /credentials/:id',
          storeCredential: 'POST /credentials',
          deleteCredential: 'DELETE /credentials/:id',
          requestCredential: 'POST /credentials/request',
          createPresentation: 'POST /presentations/create',
          sendPresentation: 'POST /presentations/send',
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
      logger.info(`✅ Holder server running on port ${PORT}`);
      logger.info(`   DID: ${agent.getDid()}`);
      logger.info(`   Service Endpoint: ${SERVICE_ENDPOINT}`);
      logger.info(`   Database: ${DB_PATH}`);
      logger.info(`   Health: http://localhost:${PORT}/health`);
    });

    // Handle graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down holder server...');
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

