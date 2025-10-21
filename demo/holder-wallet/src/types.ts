/**
 * Type definitions for the Holder Wallet
 */

export interface Credential {
  id: string;
  credential: VerifiableCredential;
  storedAt: number;
}

export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  issuer: string | { id: string; [key: string]: any };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    [key: string]: any;
  };
  proof?: any;
}

export interface VerifiablePresentation {
  '@context': string[];
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential[];
  proof?: {
    type: string;
    challenge: string;
    domain?: string;
    created: string;
    [key: string]: any;
  };
}

export interface OOBInvitation {
  '@type': string;
  '@id': string;
  from: string;
  body: {
    goal_code?: string;
    goal?: string;
    accept?: string[];
  };
  attachments?: Array<{
    id: string;
    media_type: string;
    data: {
      json?: any;
      base64?: string;
    };
  }>;
  created_time?: number;
  expires_time?: number;
}

export interface ParsedOOBInvitation {
  invitation: OOBInvitation;
  from: string;
  goal?: string;
  goalCode?: string;
  isExpired: boolean;
  credentialOffer?: any;
  presentationRequest?: any;
}

export interface PresentationRequest {
  verifierDid: string;
  challenge: string;
  requestedTypes?: string[];
  presentationDefinition?: any;
}

export interface WalletSettings {
  autoAcceptCredentials: boolean;
  showTechnicalDetails: boolean;
  theme: 'light' | 'dark';
}

