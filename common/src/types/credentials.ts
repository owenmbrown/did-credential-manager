/**
 * Shared types for Verifiable Credentials and Presentations
 * 
 * @module types/credentials
 */

/**
 * W3C Verifiable Credential interface
 */
export interface VerifiableCredential {
  '@context': string[];
  id?: string;
  type: string[];
  issuer: string | { id: string; [key: string]: any };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id?: string;
    [key: string]: any;
  };
  credentialStatus?: {
    id: string;
    type: string;
    [key: string]: any;
  };
  proof?: Proof | Proof[];
  [key: string]: any;
}

/**
 * W3C Verifiable Presentation interface
 */
export interface VerifiablePresentation {
  '@context': string[];
  id?: string;
  type: string[];
  holder?: string;
  verifiableCredential: VerifiableCredential[];
  proof?: Proof | Proof[];
  [key: string]: any;
}

/**
 * Proof interface
 */
export interface Proof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  [key: string]: any;
}

/**
 * Credential payload for JWT-based credentials
 */
export interface CredentialPayload {
  '@context': string[];
  type: string[];
  issuer: string;
  subject?: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    [key: string]: any;
  };
}

/**
 * Presentation payload for JWT-based presentations
 */
export interface PresentationPayload {
  '@context': string[];
  type: string[];
  holder?: string;
  verifiableCredential: string[];
  vp?: {
    challenge?: string;
    domain?: string;
  };
}

/**
 * Credential offer structure
 */
export interface CredentialOffer {
  type: string;
  credentialType: string[];
  issuer: string;
  claims?: {
    [key: string]: any;
  };
}

/**
 * Presentation request structure
 */
export interface PresentationRequest {
  challenge: string;
  domain?: string;
  credentialType?: string[];
  trustedIssuers?: string[];
  requiredClaims?: string[];
}

/**
 * Verification result
 */
export interface VerificationResult {
  verified: boolean;
  error?: string;
  issuer?: string;
  holder?: string;
  claims?: {
    [key: string]: any;
  };
}

