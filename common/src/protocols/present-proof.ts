/**
 * Present Proof Protocol 3.0 Implementation
 * 
 * This module implements the DIDComm Present Proof protocol v3.0 for
 * requesting and presenting verifiable credentials.
 * 
 * Spec: https://didcomm.org/present-proof/3.0/
 * 
 * @module protocols/present-proof
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Base message interface for Present Proof protocol
 */
interface BasePresentProofMessage {
  '@type': string;
  '@id': string;
  thid?: string; // Thread ID
  from?: string;
  to?: string[];
  created_time?: number;
}

/**
 * Presentation attachment format
 */
export interface PresentationFormat {
  attach_id: string;
  format: 'dif/presentation-exchange/definitions@v1.0' | 'aries/ld-proof-vp@v1.0' | string;
}

/**
 * Input descriptor for presentation request
 */
export interface InputDescriptor {
  id: string;
  name?: string;
  purpose?: string;
  constraints: {
    fields: Array<{
      path: string[];
      filter?: {
        type?: string;
        pattern?: string;
        const?: any;
      };
    }>;
    limit_disclosure?: 'required' | 'preferred';
  };
}

/**
 * Presentation Definition (DIF PE)
 */
export interface PresentationDefinition {
  id: string;
  name?: string;
  purpose?: string;
  input_descriptors: InputDescriptor[];
}

/**
 * Propose Presentation Message
 * 
 * Holder proposes to present credentials to verifier
 */
export interface ProposePresentationMessage extends BasePresentProofMessage {
  '@type': 'https://didcomm.org/present-proof/3.0/propose-presentation';
  body: {
    goal_code?: string;
    comment?: string;
  };
  attachments?: Array<{
    id: string;
    media_type: string;
    format: string;
    data: {
      json?: any;
    };
  }>;
}

/**
 * Request Presentation Message
 * 
 * Verifier requests presentation from holder
 */
export interface RequestPresentationMessage extends BasePresentProofMessage {
  '@type': 'https://didcomm.org/present-proof/3.0/request-presentation';
  body: {
    goal_code?: string;
    comment?: string;
    will_confirm?: boolean; // Whether verifier will send ack
  };
  attachments: Array<{
    id: string;
    media_type: string;
    format: string;
    data: {
      json?: {
        options?: {
          challenge?: string;
          domain?: string;
        };
        presentation_definition?: PresentationDefinition;
      };
    };
  }>;
}

/**
 * Present Proof Message
 * 
 * Holder presents credentials to verifier
 */
export interface PresentProofMessage extends BasePresentProofMessage {
  '@type': 'https://didcomm.org/present-proof/3.0/presentation';
  body: {
    goal_code?: string;
    comment?: string;
  };
  attachments: Array<{
    id: string;
    media_type: string;
    format: string;
    data: {
      json?: any; // W3C VP
      base64?: string;
    };
  }>;
}

/**
 * Acknowledgment Message
 */
export interface PresentProofAckMessage extends BasePresentProofMessage {
  '@type': 'https://didcomm.org/present-proof/3.0/ack';
  body: {
    status: 'OK' | 'FAIL' | 'PENDING';
    comment?: string;
  };
}

/**
 * Problem Report Message
 */
export interface PresentProofProblemReportMessage extends BasePresentProofMessage {
  '@type': 'https://didcomm.org/present-proof/3.0/problem-report';
  body: {
    code: string;
    comment?: string;
    args?: string[];
    escalate_to?: string;
  };
}

/**
 * Present Proof Protocol Handler
 */
export class PresentProofProtocol {
  /**
   * Create a Propose Presentation message
   */
  static createPropose(options: {
    from: string;
    to: string;
    comment?: string;
  }): ProposePresentationMessage {
    return {
      '@type': 'https://didcomm.org/present-proof/3.0/propose-presentation',
      '@id': uuidv4(),
      from: options.from,
      to: [options.to],
      created_time: Date.now(),
      body: {
        goal_code: 'verify-credentials',
        comment: options.comment || 'I would like to present my credentials',
      },
    };
  }

  /**
   * Create a Request Presentation message
   */
  static createRequest(options: {
    from: string;
    to: string;
    challenge: string;
    presentationDefinition: PresentationDefinition;
    comment?: string;
    threadId?: string;
    willConfirm?: boolean;
  }): RequestPresentationMessage {
    const attachId = uuidv4();

    return {
      '@type': 'https://didcomm.org/present-proof/3.0/request-presentation',
      '@id': uuidv4(),
      thid: options.threadId,
      from: options.from,
      to: [options.to],
      created_time: Date.now(),
      body: {
        goal_code: 'verify-credentials',
        comment: options.comment || 'Please present the requested credentials',
        will_confirm: options.willConfirm !== false,
      },
      attachments: [{
        id: attachId,
        media_type: 'application/json',
        format: 'dif/presentation-exchange/definitions@v1.0',
        data: {
          json: {
            options: {
              challenge: options.challenge,
              domain: options.from,
            },
            presentation_definition: options.presentationDefinition,
          },
        },
      }],
    };
  }

  /**
   * Create a simple Request Presentation message with credential types
   */
  static createSimpleRequest(options: {
    from: string;
    to: string;
    challenge: string;
    requestedTypes: string[];
    comment?: string;
    threadId?: string;
  }): RequestPresentationMessage {
    const presentationDefinition: PresentationDefinition = {
      id: uuidv4(),
      name: 'Credential Verification Request',
      purpose: 'Verify identity credentials',
      input_descriptors: options.requestedTypes.map(type => ({
        id: uuidv4(),
        name: type,
        purpose: `Verify ${type} credential`,
        constraints: {
          fields: [{
            path: ['$.type'],
            filter: {
              type: 'string',
              pattern: type,
            },
          }],
        },
      })),
    };

    return this.createRequest({
      ...options,
      presentationDefinition,
    });
  }

  /**
   * Create a Presentation message with VP
   */
  static createPresentation(options: {
    from: string;
    to: string;
    threadId: string;
    verifiablePresentation: any; // W3C VP
    comment?: string;
  }): PresentProofMessage {
    const attachId = uuidv4();

    return {
      '@type': 'https://didcomm.org/present-proof/3.0/presentation',
      '@id': uuidv4(),
      thid: options.threadId,
      from: options.from,
      to: [options.to],
      created_time: Date.now(),
      body: {
        goal_code: 'verify-credentials',
        comment: options.comment || 'Here is my presentation',
      },
      attachments: [{
        id: attachId,
        media_type: 'application/json',
        format: 'dif/presentation-exchange/submission@v1.0',
        data: {
          json: options.verifiablePresentation,
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
    comment?: string;
  }): PresentProofAckMessage {
    return {
      '@type': 'https://didcomm.org/present-proof/3.0/ack',
      '@id': uuidv4(),
      thid: options.threadId,
      from: options.from,
      to: [options.to],
      created_time: Date.now(),
      body: {
        status: options.status,
        comment: options.comment,
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
  }): PresentProofProblemReportMessage {
    return {
      '@type': 'https://didcomm.org/present-proof/3.0/problem-report',
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
   * Extract presentation definition from request
   */
  static extractPresentationDefinition(
    message: RequestPresentationMessage
  ): PresentationDefinition | null {
    if (!message.attachments || message.attachments.length === 0) {
      return null;
    }

    const attachment = message.attachments[0];
    return attachment.data.json?.presentation_definition || null;
  }

  /**
   * Extract challenge from request
   */
  static extractChallenge(message: RequestPresentationMessage): string | null {
    if (!message.attachments || message.attachments.length === 0) {
      return null;
    }

    const attachment = message.attachments[0];
    return attachment.data.json?.options?.challenge || null;
  }

  /**
   * Extract VP from presentation
   */
  static extractPresentation(message: PresentProofMessage): any | null {
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
    if (!parsed || parsed.protocol !== 'present-proof' || parsed.version !== '3.0') {
      throw new Error('Invalid message: not a Present Proof 3.0 message');
    }

    return true;
  }

  /**
   * Build a simple presentation definition for specific credential types
   */
  static buildPresentationDefinition(
    credentialTypes: string[],
    options?: {
      name?: string;
      purpose?: string;
      limitDisclosure?: boolean;
    }
  ): PresentationDefinition {
    return {
      id: uuidv4(),
      name: options?.name || 'Credential Request',
      purpose: options?.purpose || 'Verify your credentials',
      input_descriptors: credentialTypes.map(type => ({
        id: uuidv4(),
        name: type,
        purpose: `Verify ${type}`,
        constraints: {
          fields: [{
            path: ['$.type'],
            filter: {
              type: 'string',
              pattern: type,
            },
          }],
          limit_disclosure: options?.limitDisclosure ? 'required' : undefined,
        },
      })),
    };
  }
}

