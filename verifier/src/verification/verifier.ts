/**
 * Credential and Presentation Verifier
 * 
 * Verifies Verifiable Credentials and Presentations
 * 
 * @module verification/verifier
 */

import { logger } from '@did-edu/common';

export interface VerificationResult {
  verified: boolean;
  errors: string[];
  warnings: string[];
  details?: any;
}

export interface VerificationPolicy {
  trustedIssuers?: string[];
  requiredCredentialTypes?: string[];
  checkExpiration?: boolean;
  checkProof?: boolean;
  checkChallenge?: boolean;
  checkDomain?: boolean;
}

/**
 * Credential and Presentation Verifier
 */
export class Verifier {
  private policy: VerificationPolicy;

  constructor(policy?: VerificationPolicy) {
    this.policy = {
      checkExpiration: true,
      checkProof: false, // TODO: Implement proof verification in Phase 3
      checkChallenge: true,
      checkDomain: false,
      ...policy,
    };
  }

  /**
   * Verify a Verifiable Credential
   */
  async verifyCredential(credential: any): Promise<VerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    if (!credential) {
      errors.push('Credential is null or undefined');
      return { verified: false, errors, warnings };
    }

    if (!credential['@context']) {
      errors.push('Missing @context');
    }

    if (!credential.type || !Array.isArray(credential.type)) {
      errors.push('Missing or invalid type');
    } else if (!credential.type.includes('VerifiableCredential')) {
      errors.push('Credential type must include VerifiableCredential');
    }

    if (!credential.issuer) {
      errors.push('Missing issuer');
    }

    if (!credential.credentialSubject) {
      errors.push('Missing credentialSubject');
    }

    if (!credential.issuanceDate) {
      errors.push('Missing issuanceDate');
    }

    // Check expiration if enabled
    if (this.policy.checkExpiration && credential.expirationDate) {
      const expirationDate = new Date(credential.expirationDate);
      if (expirationDate < new Date()) {
        errors.push('Credential has expired');
      }
    }

    // Check trusted issuers if configured
    if (this.policy.trustedIssuers && this.policy.trustedIssuers.length > 0) {
      const issuer = typeof credential.issuer === 'string' 
        ? credential.issuer 
        : credential.issuer?.id;
      
      if (!this.policy.trustedIssuers.includes(issuer)) {
        errors.push(`Issuer ${issuer} is not in the trusted list`);
      }
    }

    // Check required credential types if configured
    if (this.policy.requiredCredentialTypes && this.policy.requiredCredentialTypes.length > 0) {
      const hasRequiredType = this.policy.requiredCredentialTypes.some(reqType =>
        credential.type.includes(reqType)
      );
      if (!hasRequiredType) {
        errors.push(`Credential does not have any of the required types: ${this.policy.requiredCredentialTypes.join(', ')}`);
      }
    }

    // TODO: Implement proof verification
    if (this.policy.checkProof && credential.proof) {
      warnings.push('Proof verification not yet implemented');
    }

    const verified = errors.length === 0;
    
    logger.info('Credential verification complete', {
      verified,
      issuer: credential.issuer,
      type: credential.type,
      errors: errors.length,
      warnings: warnings.length,
    });

    return { verified, errors, warnings };
  }

  /**
   * Verify a Verifiable Presentation
   */
  async verifyPresentation(
    presentation: any,
    options?: {
      challenge?: string;
      domain?: string;
    }
  ): Promise<VerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    if (!presentation) {
      errors.push('Presentation is null or undefined');
      return { verified: false, errors, warnings };
    }

    if (!presentation['@context']) {
      errors.push('Missing @context');
    }

    if (!presentation.type || !Array.isArray(presentation.type)) {
      errors.push('Missing or invalid type');
    } else if (!presentation.type.includes('VerifiablePresentation')) {
      errors.push('Presentation type must include VerifiablePresentation');
    }

    if (!presentation.holder) {
      errors.push('Missing holder');
    }

    if (!presentation.verifiableCredential || !Array.isArray(presentation.verifiableCredential)) {
      errors.push('Missing or invalid verifiableCredential');
    }

    // Check challenge if enabled and provided
    if (this.policy.checkChallenge && options?.challenge) {
      if (!presentation.proof) {
        errors.push('Missing proof for challenge verification');
      } else if (presentation.proof.challenge !== options.challenge) {
        errors.push('Challenge mismatch');
      }
    }

    // Check domain if enabled and provided
    if (this.policy.checkDomain && options?.domain) {
      if (!presentation.proof) {
        errors.push('Missing proof for domain verification');
      } else if (presentation.proof.domain !== options.domain) {
        errors.push('Domain mismatch');
      }
    }

    // Verify each credential in the presentation
    if (presentation.verifiableCredential && Array.isArray(presentation.verifiableCredential)) {
      for (const [index, credential] of presentation.verifiableCredential.entries()) {
        const result = await this.verifyCredential(credential);
        if (!result.verified) {
          errors.push(`Credential ${index + 1} verification failed: ${result.errors.join(', ')}`);
        }
        warnings.push(...result.warnings.map(w => `Credential ${index + 1}: ${w}`));
      }
    }

    // TODO: Implement proof verification
    if (this.policy.checkProof && presentation.proof) {
      warnings.push('Proof verification not yet implemented');
    }

    const verified = errors.length === 0;
    
    logger.info('Presentation verification complete', {
      verified,
      holder: presentation.holder,
      credentialCount: presentation.verifiableCredential?.length || 0,
      errors: errors.length,
      warnings: warnings.length,
    });

    return { verified, errors, warnings };
  }

  /**
   * Verify presentation with challenge validation
   */
  async verifyPresentationWithChallenge(
    presentation: any,
    expectedChallenge: string,
    options?: {
      domain?: string;
    }
  ): Promise<VerificationResult> {
    return this.verifyPresentation(presentation, {
      challenge: expectedChallenge,
      domain: options?.domain,
    });
  }

  /**
   * Extract claims from a presentation
   */
  extractClaims(presentation: any): { [key: string]: any } {
    const claims: { [key: string]: any } = {};

    if (!presentation.verifiableCredential || !Array.isArray(presentation.verifiableCredential)) {
      return claims;
    }

    for (const credential of presentation.verifiableCredential) {
      if (credential.credentialSubject) {
        // Merge all claims from all credentials
        Object.assign(claims, credential.credentialSubject);
      }
    }

    // Remove the 'id' field as it's the holder DID, not a claim
    delete claims.id;

    return claims;
  }

  /**
   * Update verification policy
   */
  updatePolicy(policy: Partial<VerificationPolicy>): void {
    this.policy = { ...this.policy, ...policy };
    logger.info('Verification policy updated', { policy: this.policy });
  }

  /**
   * Get current policy
   */
  getPolicy(): VerificationPolicy {
    return { ...this.policy };
  }
}

