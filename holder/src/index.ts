/**
 * Holder Package Entry Point
 * 
 * @module @did-edu/holder
 */

export { HolderAgent, createHolderAgent, HolderAgentConfig } from './agent.js';
export { CredentialStore, StoredCredential, CredentialQuery } from './storage/credential-store.js';
export { VPBuilder, PresentationOptions, SelectiveDisclosureOptions } from './presentation/vp-builder.js';
export { createHolderRoutes } from './routes/holder-routes.js';


