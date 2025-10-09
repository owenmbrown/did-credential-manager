/**
 * Verifier Package Entry Point
 * 
 * @module @did-edu/verifier
 */

export { VerifierAgent, createVerifierAgent, VerifierAgentConfig, PresentationRequestOptions } from './agent.js';
export { ChallengeManager, Challenge } from './challenge/challenge-manager.js';
export { Verifier, VerificationResult, VerificationPolicy } from './verification/verifier.js';
export { createVerifierRoutes } from './routes/verifier-routes.js';


