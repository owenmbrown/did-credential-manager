/**
 * Verifier Package Entry Point
 * 
 * @module @did-edu/verifier
 */

export { VerifierAgent, createVerifierAgent, VerifierAgentConfig, PresentationRequestOptions } from './agent';
export { ChallengeManager, Challenge } from './challenge/challenge-manager';
export { Verifier, VerificationResult, VerificationPolicy } from './verification/verifier';
export { createVerifierRoutes } from './routes/verifier-routes';

