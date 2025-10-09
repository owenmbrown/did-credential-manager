/**
 * Issuer Package Entry Point
 * 
 * @module @did-edu/issuer
 */

export { IssuerAgent, createIssuerAgent, AgentConfig } from './agent.js';
export { DIDPeerProvider } from './did-peer-provider.js';
export { createCredentialRoutes } from './routes/credentials.js';

