/**
 * Issue Credential Protocol 3.0 Implementation
 * 
 * This module implements the DIDComm Issue Credential protocol v3.0 for
 * issuing verifiable credentials between agents.
 * 
 * Spec: https://didcomm.org/issue-credential/3.0/
 * 
 * @module protocols/issue-credential
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Base message interface for Issue Credential protocol
 */
interface BaseIssueCredentialMessage {
  '@type': string;
  '@id': string;
  thid?: string; // Thread ID
  from?: string;
  to?: string[];
  created_time?: number;
}

/**
 * Credential format specification
 */
export interface CredentialFormat {
  attach_id: string;
  format: 'vc+jwt' | 'vc+sd-jwt' | 'aries/ld-proof-vc@v1.0' | string;
}

/**
 * Credential preview structure
 */
export interface CredentialPreview {
  '@type': 'https://didcomm.org/issue-credential/3.0/credential-preview';
  attributes: Record<string, any>;
}

/**
 * Propose Credential Message
 * 
 * Holder proposes credential requirements to issuer
 */
export interface ProposeCredentialMessage extends BaseIssueCredentialMessage {
  '@type': 'https://didcomm.org/issue-credential/3.0/propose-credential';
  body: {
    goal_code?: string;
    comment?: string;
    credential_preview?: CredentialPreview;
  };
  attachments?: Array<{
    id: string;
    media_type: string;
    data: {
      json?: any;
    };
  }>;
}

/**
 * Offer Credential Message
 * 
 * Issuer offers a credential to holder
 */
export interface OfferCredentialMessage extends BaseIssueCredentialMessage {
  '@type': 'https://didcomm.org/issue-credential/3.0/offer-credential';
  body: {
    goal_code?: string;
    comment?: string;
    replacement_id?: string; // ID of credential being replaced
    credential_preview: CredentialPreview;
  };
  attachments: Array<{
    id: string;
    media_type: string;
    format: string;
    data: {
      json?: any;
      base64?: string;
    };
  }>;
}

/**
 * Request Credential Message
 * 
 * Holder requests credential from issuer (in response to offer)
 */
export interface RequestCredentialMessage extends BaseIssueCredentialMessage {
  '@type': 'https://didcomm.org/issue-credential/3.0/request-credential';
  body: {
    goal_code?: string;
    comment?: string;
  };
  attachments?: Array<{
    id: string;
    media_type: string;
    data: {
      json?: any;
    };
  }>;
}

/**
 * Issue Credential Message
 * 
 * Issuer issues the credential to holder
 */
export interface IssueCredentialMessage extends BaseIssueCredentialMessage {
  '@type': 'https://didcomm.org/issue-credential/3.0/issue-credential';
  body: {
    goal_code?: string;
    comment?: string;
    replacement_id?: string;
  };
  attachments: Array<{
    id: string;
    media_type: string;
    format: string;
    data: {
      json?: any;
      base64?: string;
    };
  }>;
}

/**
 * Acknowledgment Message
 */
export interface AckMessage extends BaseIssueCredentialMessage {
  '@type': 'https://didcomm.org/issue-credential/3.0/ack';
  body: {
    status: 'OK' | 'FAIL' | 'PENDING';
  };
}

/**
 * Problem Report Message
 */
export interface ProblemReportMessage extends BaseIssueCredentialMessage {
  '@type': 'https://didcomm.org/issue-credential/3.0/problem-report';
  body: {
    code: string;
    comment?: string;
    args?: string[];
    escalate_to?: string;
  };
}

/**
 * Issue Credential Protocol Handler
 */
export class IssueCredentialProtocol {
  /**
   * Create a Propose Credential message
   */
  static createPropose(options: {
    from: string;
    to: string;
    credentialType: string;
    attributes?: Record<string, any>;
    comment?: string;
  }): ProposeCredentialMessage {
    return {
      '@type': 'https://didcomm.org/issue-credential/3.0/propose-credential',
      '@id': uuidv4(),
      from: options.from,
      to: [options.to],
      created_time: Date.now(),
      body: {
        goal_code: 'issue-vc',
        comment: options.comment || `Requesting ${options.credentialType} credential`,
        credential_preview: options.attributes ? {
          '@type': 'https://didcomm.org/issue-credential/3.0/credential-preview',
          attributes: options.attributes,
        } : undefined,
      },
    };
  }

  /**
   * Create an Offer Credential message
   */
  static createOffer(options: {
    from: string;
    to: string;
    credentialPreview: CredentialPreview;
    format?: string;
    comment?: string;
    threadId?: string;
  }): OfferCredentialMessage {
    const attachId = uuidv4();

    return {
      '@type': 'https://didcomm.org/issue-credential/3.0/offer-credential',
      '@id': uuidv4(),
      thid: options.threadId,
      from: options.from,
      to: [options.to],
      created_time: Date.now(),
      body: {
        goal_code: 'issue-vc',
        comment: options.comment,
        credential_preview: options.credentialPreview,
      },
      attachments: [{
        id: attachId,
        media_type: 'application/json',
        format: options.format || 'vc+jwt',
        data: {
          json: {
            credential_format: options.format || 'vc+jwt',
          },
        },
      }],
    };
  }

  /**
   * Create a Request Credential message
   */
  static createRequest(options: {
    from: string;
    to: string;
    threadId: string;
    comment?: string;
  }): RequestCredentialMessage {
    return {
      '@type': 'https://didcomm.org/issue-credential/3.0/request-credential',
      '@id': uuidv4(),
      thid: options.threadId,
      from: options.from,
      to: [options.to],
      created_time: Date.now(),
      body: {
        goal_code: 'issue-vc',
        comment: options.comment || 'Accepting credential offer',
      },
    };
  }

  /**
   * Create an Issue Credential message with the actual VC
   */
  static createIssue(options: {
    from: string;
    to: string;
    threadId: string;
    credential: any; // The actual W3C VC
    format?: string;
    comment?: string;
  }): IssueCredentialMessage {
    const attachId = uuidv4();

    return {
      '@type': 'https://didcomm.org/issue-credential/3.0/issue-credential',
      '@id': uuidv4(),
      thid: options.threadId,
      from: options.from,
      to: [options.to],
      created_time: Date.now(),
      body: {
        goal_code: 'issue-vc',
        comment: options.comment || 'Your credential is ready',
      },
      attachments: [{
        id: attachId,
        media_type: 'application/json',
        format: options.format || 'vc+jwt',
        data: {
          json: options.credential,
        },
      }],
    };
  }

  /**
   * Create an Acknowledgment message
   */
  static createAck(options: {
    from: string;
    to: string;
    threadId: string;
    status: 'OK' | 'FAIL' | 'PENDING';
  }): AckMessage {
    return {
      '@type': 'https://didcomm.org/issue-credential/3.0/ack',
      '@id': uuidv4(),
      thid: options.threadId,
      from: options.from,
      to: [options.to],
      created_time: Date.now(),
      body: {
        status: options.status,
      },
    };
  }

  /**
   * Create a Problem Report message
   */
  static createProblemReport(options: {
    from: string;
    to: string;
    threadId: string;
    code: string;
    comment?: string;
  }): ProblemReportMessage {
    return {
      '@type': 'https://didcomm.org/issue-credential/3.0/problem-report',
      '@id': uuidv4(),
      thid: options.threadId,
      from: options.from,
      to: [options.to],
      created_time: Date.now(),
      body: {
        code: options.code,
        comment: options.comment,
      },
    };
  }

  /**
   * Extract credential from Issue Credential message
   */
  static extractCredential(message: IssueCredentialMessage): any | null {
    if (!message.attachments || message.attachments.length === 0) {
      return null;
    }

    const attachment = message.attachments[0];
    return attachment.data.json || null;
  }

  /**
   * Parse message type and return handler hint
   */
  static parseMessageType(type: string): {
    protocol: string;
    version: string;
    messageType: string;
  } | null {
    const match = type.match(/https:\/\/didcomm\.org\/([^/]+)\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    return {
      protocol: match[1],
      version: match[2],
      messageType: match[3],
    };
  }

  /**
   * Validate message structure
   */
  static validateMessage(message: any): boolean {
    if (!message['@type'] || !message['@id']) {
      throw new Error('Invalid message: missing @type or @id');
    }

    const parsed = this.parseMessageType(message['@type']);
    if (!parsed || parsed.protocol !== 'issue-credential' || parsed.version !== '3.0') {
      throw new Error('Invalid message: not an Issue Credential 3.0 message');
    }

    return true;
  }
}

