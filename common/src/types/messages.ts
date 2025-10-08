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
 * Out-of-Band invitation
 */
export interface OOBInvitation {
  type: string;
  id: string;
  from: string;
  body: {
    goal_code?: string;
    goal?: string;
    accept?: string[];
  };
  attachments?: Attachment[];
}

/**
 * Issue Credential 3.0 - Offer Credential
 */
export interface OfferCredentialMessage extends BaseDIDCommMessage {
  type: 'https://didcomm.org/issue-credential/3.0/offer-credential';
  body: {
    goal_code?: string;
    comment?: string;
    credential_preview: {
      type: string;
      attributes: Array<{
        name: string;
        value: any;
      }>;
    };
    formats: Array<{
      attach_id: string;
      format: string;
    }>;
  };
}

/**
 * Issue Credential 3.0 - Request Credential
 */
export interface RequestCredentialMessage extends BaseDIDCommMessage {
  type: 'https://didcomm.org/issue-credential/3.0/request-credential';
  body: {
    goal_code?: string;
    comment?: string;
    formats: Array<{
      attach_id: string;
      format: string;
    }>;
  };
}

/**
 * Issue Credential 3.0 - Issue Credential
 */
export interface IssueCredentialMessage extends BaseDIDCommMessage {
  type: 'https://didcomm.org/issue-credential/3.0/issue-credential';
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
 * Present Proof 3.0 - Request Presentation
 */
export interface RequestPresentationMessage extends BaseDIDCommMessage {
  type: 'https://didcomm.org/present-proof/3.0/request-presentation';
  body: {
    goal_code?: string;
    comment?: string;
    will_confirm?: boolean;
    formats: Array<{
      attach_id: string;
      format: string;
    }>;
  };
  attachments: Array<{
    id: string;
    data: {
      json: {
        challenge: string;
        domain?: string;
        presentation_definition?: any;
      };
    };
  }>;
}

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
 * Basic Message 2.0
 */
export interface BasicMessage extends BaseDIDCommMessage {
  type: 'https://didcomm.org/basicmessage/2.0/message';
  body: {
    content: string;
    sent_time?: string;
    locale?: string;
  };
}

/**
 * Protocol message types union
 */
export type ProtocolMessage =
  | OfferCredentialMessage
  | RequestCredentialMessage
  | IssueCredentialMessage
  | RequestPresentationMessage
  | PresentationMessage
  | AckMessage
  | ProblemReportMessage
  | TrustPingMessage
  | TrustPingResponseMessage
  | DiscoverFeaturesQueryMessage
  | DiscoverFeaturesDiscloseMessage
  | BasicMessage;

