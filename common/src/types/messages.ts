/**
 * Shared types for DIDComm messages and protocols
 * 
 * @module types/messages
 */

/**
 * Base DIDComm message structure
 */
export interface BaseDIDCommMessage {
  id: string;
  type: string;
  from?: string;
  to: string[];
  created_time?: number;
  expires_time?: number;
  body: Record<string, any>;
  attachments?: Attachment[];
  thid?: string; // Thread ID
  pthid?: string; // Parent Thread ID
}

/**
 * DIDComm attachment
 */
export interface Attachment {
  id: string;
  description?: string;
  filename?: string;
  media_type?: string;
  format?: string;
  lastmod_time?: number;
  byte_count?: number;
  data: AttachmentData;
}

/**
 * Attachment data
 */
export interface AttachmentData {
  base64?: string;
  json?: any;
  links?: string[];
  jws?: any;
  hash?: string;
}

/**
 * Note: OOB, Issue Credential, Present Proof, and Basic Message types
 * are now defined in their respective protocol files:
 * - protocols/oob.ts
 * - protocols/issue-credential.ts
 * - protocols/present-proof.ts
 * - protocols/basic-message.ts
 * 
 * Import from those files or from the main index.
 */

/**
 * Present Proof 3.0 - Presentation
 */
export interface PresentationMessage extends BaseDIDCommMessage {
  type: 'https://didcomm.org/present-proof/3.0/presentation';
  body: {
    goal_code?: string;
    comment?: string;
    formats: Array<{
      attach_id: string;
      format: string;
    }>;
  };
  attachments: Array<{
    id: string;
    format: string;
    data: {
      json?: any;
      base64?: string;
    };
  }>;
}

/**
 * Acknowledge message
 */
export interface AckMessage extends BaseDIDCommMessage {
  type: string; // e.g., 'https://didcomm.org/issue-credential/3.0/ack'
  body: {
    status: 'OK' | 'PENDING' | 'FAIL';
  };
}

/**
 * Problem Report message
 */
export interface ProblemReportMessage extends BaseDIDCommMessage {
  type: string; // e.g., 'https://didcomm.org/issue-credential/3.0/problem-report'
  body: {
    code: string;
    comment?: string;
    args?: string[];
    escalate_to?: string;
  };
}

/**
 * Trust Ping 2.0 - Ping
 */
export interface TrustPingMessage extends BaseDIDCommMessage {
  type: 'https://didcomm.org/trust-ping/2.0/ping';
  body: {
    response_requested?: boolean;
  };
}

/**
 * Trust Ping 2.0 - Ping Response
 */
export interface TrustPingResponseMessage extends BaseDIDCommMessage {
  type: 'https://didcomm.org/trust-ping/2.0/ping-response';
  body: {};
}

/**
 * Discover Features 2.0 - Query
 */
export interface DiscoverFeaturesQueryMessage extends BaseDIDCommMessage {
  type: 'https://didcomm.org/discover-features/2.0/queries';
  body: {
    queries: Array<{
      feature_type: 'protocol' | 'goal-code' | string;
      match?: string;
    }>;
  };
}

/**
 * Discover Features 2.0 - Disclose
 */
export interface DiscoverFeaturesDiscloseMessage extends BaseDIDCommMessage {
  type: 'https://didcomm.org/discover-features/2.0/disclose';
  body: {
    disclosures: Array<{
      feature_type: 'protocol' | 'goal-code' | string;
      id: string;
      roles?: string[];
    }>;
  };
}

/**
 * Protocol message types union
 * Note: Some types are now defined in protocol files
 */
export type ProtocolMessage =
  | PresentationMessage
  | AckMessage
  | ProblemReportMessage
  | TrustPingMessage
  | TrustPingResponseMessage
  | DiscoverFeaturesQueryMessage
  | DiscoverFeaturesDiscloseMessage;

