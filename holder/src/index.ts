/**
 * Holder Package Entry Point
 * 
 * @module @did-edu/holder
 */

export { HolderAgent, createHolderAgent, HolderAgentConfig } from './agent';
export { CredentialStore, StoredCredential, CredentialQuery } from './storage/credential-store';
export { VPBuilder, PresentationOptions, SelectiveDisclosureOptions } from './presentation/vp-builder';
export { createHolderRoutes } from './routes/holder-routes';

