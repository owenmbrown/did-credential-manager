/**
 * Out-of-Band (OOB) 2.0 Protocol Implementation
 * 
 * This module implements the DIDComm Out-of-Band protocol v2.0 for establishing
 * initial connections and sharing invitations.
 * 
 * Spec: https://identity.foundation/didcomm-messaging/spec/#out-of-band-messages
 * 
 * @module protocols/oob
 */

import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { Message } from 'didcomm';

/**
 * OOB Invitation attachment format
 */
export interface OOBAttachment {
  id: string;
  media_type: string;
  data: {
    json?: any;
    base64?: string;
    links?: string[];
  };
}

/**
 * OOB Invitation Message structure
 */
export interface OOBInvitation {
  '@type': 'https://didcomm.org/out-of-band/2.0/invitation';
  '@id': string;
  from: string;
  body: {
    goal_code?: string;
    goal?: string;
    accept?: string[];
  };
  attachments?: OOBAttachment[];
  created_time?: number;
  expires_time?: number;
}

/**
 * Options for creating an OOB invitation
 */
export interface CreateOOBInvitationOptions {
  /** The DID of the inviter */
  from: string;
  
  /** Goal code (machine-readable purpose) */
  goalCode?: string;
  
  /** Goal description (human-readable purpose) */
  goal?: string;
  
  /** Accepted protocol versions */
  accept?: string[];
  
  /** Time-to-live in seconds */
  ttl?: number;
  
  /** Attachments (e.g., credential offers) */
  attachments?: OOBAttachment[];
}

/**
 * Parsed OOB invitation with metadata
 */
export interface ParsedOOBInvitation {
  invitation: OOBInvitation;
  from: string;
  goal?: string;
  goalCode?: string;
  isExpired: boolean;
  attachments: OOBAttachment[];
}

/**
 * OOB Protocol Handler
 * 
 * Handles creation, parsing, and validation of Out-of-Band invitations.
 */
export class OOBProtocol {
  /**
   * Create a new OOB invitation
   * 
   * @param options - Invitation options
   * @returns OOB invitation message
   */
  static createInvitation(options: CreateOOBInvitationOptions): OOBInvitation {
    const now = Date.now();
    const expiresTime = options.ttl ? now + (options.ttl * 1000) : undefined;

    const invitation: OOBInvitation = {
      '@type': 'https://didcomm.org/out-of-band/2.0/invitation',
      '@id': uuidv4(),
      from: options.from,
      body: {
        goal_code: options.goalCode,
        goal: options.goal,
        accept: options.accept || [
          'didcomm/v2',
          'didcomm/aip2;env=rfc587',
        ],
      },
      created_time: now,
      expires_time: expiresTime,
    };

    if (options.attachments && options.attachments.length > 0) {
      invitation.attachments = options.attachments;
    }

    return invitation;
  }

  /**
   * Create an invitation URL from an OOB invitation
   * 
   * @param invitation - The OOB invitation
   * @param baseUrl - Base URL for the invitation endpoint (e.g., 'http://localhost:3001')
   * @returns Invitation URL
   */
  static createInvitationUrl(invitation: OOBInvitation, baseUrl: string): string {
    const encodedInvitation = Buffer.from(JSON.stringify(invitation)).toString('base64url');
    return `${baseUrl}?oob=${encodedInvitation}`;
  }

  /**
   * Generate a QR code for an OOB invitation
   * 
   * @param invitation - The OOB invitation
   * @param urlOrBaseUrl - Either a complete URL (short URL) or base URL for encoding
   * @returns QR code as data URL
   */
  static async generateQRCode(
    invitation: OOBInvitation,
    urlOrBaseUrl: string
  ): Promise<string> {
    // If URL already contains the invitation ID/path, use it directly
    // Otherwise, create the full encoded URL
    let invitationUrl: string;
    if (urlOrBaseUrl.includes('/invitations/') && !urlOrBaseUrl.includes('?oob=')) {
      // Short URL format - use as-is
      invitationUrl = urlOrBaseUrl;
    } else {
      // Base URL - encode the invitation
      invitationUrl = this.createInvitationUrl(invitation, urlOrBaseUrl);
    }
    
    return await QRCode.toDataURL(invitationUrl, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
    });
  }

  /**
   * Parse an OOB invitation from a URL
   * 
   * @param url - The invitation URL
   * @returns Parsed invitation
   * @throws Error if URL is invalid or invitation cannot be parsed
   */
  static parseInvitationUrl(url: string): ParsedOOBInvitation {
    try {
      const parsedUrl = new URL(url);
      const oobParam = parsedUrl.searchParams.get('oob');
      
      if (!oobParam) {
        throw new Error('Missing oob parameter in URL');
      }

      const invitationJson = Buffer.from(oobParam, 'base64url').toString('utf-8');
      const invitation: OOBInvitation = JSON.parse(invitationJson);

      return this.parseInvitation(invitation);
    } catch (error) {
      throw new Error(`Failed to parse OOB invitation URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse an OOB invitation object
   * 
   * @param invitation - The invitation object
   * @returns Parsed invitation with metadata
   */
  static parseInvitation(invitation: OOBInvitation): ParsedOOBInvitation {
    // Validate invitation structure
    if (invitation['@type'] !== 'https://didcomm.org/out-of-band/2.0/invitation') {
      throw new Error('Invalid invitation type');
    }

    if (!invitation['@id'] || !invitation.from) {
      throw new Error('Invalid invitation: missing required fields');
    }

    // Check expiration
    const isExpired = invitation.expires_time
      ? Date.now() > invitation.expires_time
      : false;

    return {
      invitation,
      from: invitation.from,
      goal: invitation.body.goal,
      goalCode: invitation.body.goal_code,
      isExpired,
      attachments: invitation.attachments || [],
    };
  }

  /**
   * Create an OOB invitation with a credential offer attachment
   * 
   * @param from - The issuer's DID
   * @param credentialType - Type of credential being offered
   * @param credentialData - The credential data
   * @param options - Additional options
   * @returns OOB invitation with credential offer
   */
  static createCredentialOfferInvitation(
    from: string,
    credentialType: string,
    credentialData: any,
    options: Partial<CreateOOBInvitationOptions> = {}
  ): OOBInvitation {
    const attachment: OOBAttachment = {
      id: uuidv4(),
      media_type: 'application/json',
      data: {
        json: {
          '@type': 'https://didcomm.org/issue-credential/3.0/offer-credential',
          '@id': uuidv4(),
          body: {
            credential_preview: {
              '@type': 'https://didcomm.org/issue-credential/3.0/credential-preview',
              attributes: credentialData,
            },
            formats: [{
              attach_id: uuidv4(),
              format: 'vc+jwt',
            }],
          },
        },
      },
    };

    return this.createInvitation({
      from,
      goalCode: 'issue-vc',
      goal: `Receive ${credentialType} credential`,
      attachments: [attachment],
      ...options,
    });
  }

  /**
   * Create an OOB invitation with a presentation request attachment
   * 
   * @param from - The verifier's DID
   * @param requestedCredentials - Types of credentials requested
   * @param challenge - Verification challenge
   * @param options - Additional options including:
   *   - requestedFields: Specific fields to request from credentials
   *   - ttl: Time to live
   * @returns OOB invitation with presentation request
   */
  static createPresentationRequestInvitation(
    from: string,
    requestedCredentials: string[],
    challenge: string,
    options: Partial<CreateOOBInvitationOptions & {
      requestedFields?: string[];
    }> = {}
  ): OOBInvitation {
    const { requestedFields } = options;
    
    const attachment: OOBAttachment = {
      id: uuidv4(),
      media_type: 'application/json',
      data: {
        json: {
          '@type': 'https://didcomm.org/present-proof/3.0/request-presentation',
          '@id': uuidv4(),
          body: {
            will_confirm: true,
            goal_code: 'Verify Identity',
            comment: requestedFields && requestedFields.length > 0
              ? `Please present ${requestedFields.join(', ')} from the requested credentials`
              : 'Please present the requested credentials',
          },
          attachments: [{
            id: uuidv4(),
            media_type: 'application/json',
            data: {
              json: {
                options: {
                  challenge,
                  domain: from,
                },
                presentation_definition: {
                  id: uuidv4(),
                  input_descriptors: requestedCredentials.map(type => {
                    // Build field constraints
                    const fieldConstraints: any[] = [
                      {
                        path: ['$.type'],
                        filter: {
                          type: 'string',
                          pattern: type,
                        },
                      }
                    ];

                    // Add requested fields constraints if specified
                    if (requestedFields && requestedFields.length > 0) {
                      requestedFields.forEach(field => {
                        fieldConstraints.push({
                          path: [`$.credentialSubject.${field}`],
                          filter: {
                            type: 'string',
                            const: field,
                          },
                          optional: false,
                        });
                      });
                    }

                    return {
                      id: uuidv4(),
                      name: type,
                      purpose: requestedFields && requestedFields.length > 0
                        ? `Verify ${type} (fields: ${requestedFields.join(', ')})`
                        : `Verify ${type}`,
                      constraints: {
                        fields: fieldConstraints,
                      },
                    };
                  }),
                },
                // Include requested fields in the attachment metadata for wallet parsing
                requestedFields,
              },
            },
          }],
        },
      },
    };

    const { ttl, goalCode, goal, accept } = options;
    return this.createInvitation({
      from,
      goalCode: goalCode || 'verify-credentials',
      goal: goal || 'Verify your credentials',
      attachments: [attachment],
      ttl,
      accept,
    });
  }

  /**
   * Validate an OOB invitation
   * 
   * @param invitation - The invitation to validate
   * @returns True if valid
   * @throws Error if invalid
   */
  static validateInvitation(invitation: OOBInvitation): boolean {
    const parsed = this.parseInvitation(invitation);

    if (parsed.isExpired) {
      throw new Error('Invitation has expired');
    }

    // Additional validation can be added here
    return true;
  }

  /**
   * Extract credential offer from OOB invitation
   * 
   * @param invitation - The invitation
   * @returns Credential offer or null
   */
  static extractCredentialOffer(invitation: OOBInvitation): any | null {
    if (!invitation.attachments) {
      return null;
    }

    for (const attachment of invitation.attachments) {
      if (attachment.data.json?.['@type']?.includes('offer-credential')) {
        return attachment.data.json;
      }
    }

    return null;
  }

  /**
   * Extract presentation request from OOB invitation
   * 
   * @param invitation - The invitation
   * @returns Presentation request or null
   */
  static extractPresentationRequest(invitation: OOBInvitation): any | null {
    if (!invitation.attachments) {
      return null;
    }

    for (const attachment of invitation.attachments) {
      if (attachment.data.json?.['@type']?.includes('request-presentation')) {
        return attachment.data.json;
      }
    }

    return null;
  }
}

