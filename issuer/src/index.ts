/**
 * Issuer Package Entry Point
 * 
 * @module @did-edu/issuer
 */

export { IssuerAgent, createIssuerAgent, AgentConfig } from './agent';
export { DIDPeerProvider } from './did-peer-provider';
export { createCredentialRoutes } from './routes/credentials';

