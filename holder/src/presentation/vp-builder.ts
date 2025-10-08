/**
 * Verifiable Presentation Builder
 * 
 * Creates W3C Verifiable Presentations from credentials
 * 
 * @module presentation/vp-builder
 */

import { logger } from '@did-edu/common';

export interface PresentationOptions {
  holderDid: string;
  verifierDid?: string;
  challenge?: string;
  domain?: string;
  credentials: any[];
  type?: string[];
}

export interface SelectiveDisclosureOptions {
  fields?: string[];
  excludeFields?: string[];
}

/**
 * Verifiable Presentation Builder
 */
export class VPBuilder {
  /**
   * Create a Verifiable Presentation
   */
  static async createPresentation(options: PresentationOptions): Promise<any> {
    const {
      holderDid,
      verifierDid,
      challenge,
      domain,
      credentials,
      type = ['VerifiablePresentation'],
    } = options;

    // Validate inputs
    if (!holderDid) {
      throw new Error('holderDid is required');
    }

    if (!credentials || credentials.length === 0) {
      throw new Error('At least one credential is required');
    }

    // Build the VP
    const vp: any = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type,
      holder: holderDid,
      verifiableCredential: credentials,
    };

    // Add challenge and domain if provided
    if (challenge || domain) {
      vp.proof = {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        proofPurpose: 'authentication',
        verificationMethod: `${holderDid}#key-1`,
        ...(challenge && { challenge }),
        ...(domain && { domain }),
        // TODO: Add actual signature
      };
    }

    logger.info('Verifiable Presentation created', {
      holder: holderDid,
      credentialCount: credentials.length,
      challenge: challenge || 'none',
    });

    return vp;
  }

  /**
   * Apply selective disclosure to credentials
   */
  static applySelectiveDisclosure(
    credential: any,
    options: SelectiveDisclosureOptions
  ): any {
    const { fields, excludeFields } = options;

    // Deep clone the credential
    const disclosed = JSON.parse(JSON.stringify(credential));

    if (fields && fields.length > 0) {
      // Include only specified fields
      const filteredSubject: any = {};
      fields.forEach(field => {
        if (disclosed.credentialSubject && disclosed.credentialSubject[field] !== undefined) {
          filteredSubject[field] = disclosed.credentialSubject[field];
        }
      });
      disclosed.credentialSubject = {
        ...filteredSubject,
        id: disclosed.credentialSubject.id, // Always include ID
      };
    }

    if (excludeFields && excludeFields.length > 0) {
      // Exclude specified fields
      excludeFields.forEach(field => {
        if (disclosed.credentialSubject) {
          delete disclosed.credentialSubject[field];
        }
      });
    }

    logger.info('Selective disclosure applied', {
      originalFields: Object.keys(credential.credentialSubject || {}),
      disclosedFields: Object.keys(disclosed.credentialSubject || {}),
    });

    return disclosed;
  }

  /**
   * Create presentation with selective disclosure
   */
  static async createSelectivePresentation(
    options: PresentationOptions,
    disclosureOptions: SelectiveDisclosureOptions
  ): Promise<any> {
    // Apply selective disclosure to each credential
    const disclosedCredentials = options.credentials.map(vc =>
      this.applySelectiveDisclosure(vc, disclosureOptions)
    );

    // Create VP with disclosed credentials
    return this.createPresentation({
      ...options,
      credentials: disclosedCredentials,
    });
  }

  /**
   * Validate a presentation request
   */
  static validatePresentationRequest(request: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.type || request.type !== 'https://didcomm.org/present-proof/3.0/request-presentation') {
      errors.push('Invalid request type');
    }

    if (!request.body) {
      errors.push('Request body is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract credential requirements from presentation request
   */
  static extractRequirements(request: any): {
    credentialTypes?: string[];
    fields?: string[];
    issuers?: string[];
    challenge?: string;
    domain?: string;
  } {
    const body = request.body || {};
    
    return {
      credentialTypes: body.credential_types || body.credentialTypes,
      fields: body.fields || body.requested_attributes,
      issuers: body.trusted_issuers || body.issuers,
      challenge: body.challenge || request.challenge,
      domain: body.domain || request.domain,
    };
  }

  /**
   * Filter credentials that match requirements
   */
  static filterCredentialsByRequirements(
    credentials: any[],
    requirements: ReturnType<typeof VPBuilder.extractRequirements>
  ): any[] {
    let filtered = credentials;

    // Filter by credential type
    if (requirements.credentialTypes && requirements.credentialTypes.length > 0) {
      filtered = filtered.filter(vc => {
        const vcTypes = Array.isArray(vc.type) ? vc.type : [vc.type];
        return requirements.credentialTypes!.some(reqType => vcTypes.includes(reqType));
      });
    }

    // Filter by issuer
    if (requirements.issuers && requirements.issuers.length > 0) {
      filtered = filtered.filter(vc => {
        const issuer = typeof vc.issuer === 'string' ? vc.issuer : vc.issuer?.id;
        return requirements.issuers!.includes(issuer);
      });
    }

    // Filter by fields (check if credential has required fields)
    if (requirements.fields && requirements.fields.length > 0) {
      filtered = filtered.filter(vc => {
        const subjectFields = Object.keys(vc.credentialSubject || {});
        return requirements.fields!.every(field => 
          field === 'id' || subjectFields.includes(field)
        );
      });
    }

    return filtered;
  }

  /**
   * Create presentation from request
   */
  static async createPresentationFromRequest(
    holderDid: string,
    request: any,
    credentials: any[]
  ): Promise<any> {
    // Validate request
    const validation = this.validatePresentationRequest(request);
    if (!validation.valid) {
      throw new Error(`Invalid presentation request: ${validation.errors.join(', ')}`);
    }

    // Extract requirements
    const requirements = this.extractRequirements(request);

    // Filter credentials
    const matchingCredentials = this.filterCredentialsByRequirements(
      credentials,
      requirements
    );

    if (matchingCredentials.length === 0) {
      throw new Error('No credentials match the presentation requirements');
    }

    // Apply selective disclosure if fields specified
    const disclosureOptions: SelectiveDisclosureOptions = {};
    if (requirements.fields) {
      disclosureOptions.fields = requirements.fields;
    }

    // Create presentation
    if (requirements.fields) {
      return this.createSelectivePresentation(
        {
          holderDid,
          credentials: matchingCredentials,
          challenge: requirements.challenge,
          domain: requirements.domain,
        },
        disclosureOptions
      );
    } else {
      return this.createPresentation({
        holderDid,
        credentials: matchingCredentials,
        challenge: requirements.challenge,
        domain: requirements.domain,
      });
    }
  }
}

