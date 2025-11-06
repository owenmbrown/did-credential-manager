/**
 * Tests for Credential and Presentation Verifier
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Verifier, VerificationPolicy } from './verifier.js';

describe('Verifier', () => {
  let verifier: Verifier;

  beforeEach(() => {
    verifier = new Verifier();
  });

  describe('constructor', () => {
    it('should create a verifier with default policy', () => {
      const policy = verifier.getPolicy();

      expect(policy.checkExpiration).toBe(true);
      expect(policy.checkProof).toBe(false);
      expect(policy.checkChallenge).toBe(true);
      expect(policy.checkDomain).toBe(false);
    });

    it('should create a verifier with custom policy', () => {
      const customPolicy: VerificationPolicy = {
        checkExpiration: false,
        checkProof: true,
        checkChallenge: false,
        checkDomain: true,
        trustedIssuers: ['did:peer:issuer1'],
        requiredCredentialTypes: ['UniversityDegree'],
      };

      const customVerifier = new Verifier(customPolicy);
      const policy = customVerifier.getPolicy();

      expect(policy.checkExpiration).toBe(false);
      expect(policy.checkProof).toBe(true);
      expect(policy.checkChallenge).toBe(false);
      expect(policy.checkDomain).toBe(true);
      expect(policy.trustedIssuers).toEqual(['did:peer:issuer1']);
      expect(policy.requiredCredentialTypes).toEqual(['UniversityDegree']);
    });

    it('should merge custom policy with defaults', () => {
      const partialPolicy: VerificationPolicy = {
        trustedIssuers: ['did:peer:issuer1'],
      };

      const customVerifier = new Verifier(partialPolicy);
      const policy = customVerifier.getPolicy();

      expect(policy.checkExpiration).toBe(true);
      expect(policy.trustedIssuers).toEqual(['did:peer:issuer1']);
    });
  });

  describe('verifyCredential', () => {
    const validCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'UniversityDegree'],
      issuer: 'did:peer:issuer123',
      issuanceDate: '2023-01-01T00:00:00Z',
      credentialSubject: {
        id: 'did:peer:holder123',
        degree: 'Bachelor of Science',
      },
    };

    it('should verify a valid credential', async () => {
      const result = await verifier.verifyCredential(validCredential);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null credential', async () => {
      const result = await verifier.verifyCredential(null);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Credential is null or undefined');
    });

    it('should reject undefined credential', async () => {
      const result = await verifier.verifyCredential(undefined);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Credential is null or undefined');
    });

    it('should reject credential missing @context', async () => {
      const credential = { ...validCredential };
      delete credential['@context'];

      const result = await verifier.verifyCredential(credential);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing @context');
    });

    it('should reject credential missing type', async () => {
      const credential = { ...validCredential };
      delete credential.type;

      const result = await verifier.verifyCredential(credential);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing or invalid type');
    });

    it('should reject credential with non-array type', async () => {
      const credential = { ...validCredential, type: 'VerifiableCredential' };

      const result = await verifier.verifyCredential(credential);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing or invalid type');
    });

    it('should reject credential without VerifiableCredential type', async () => {
      const credential = { ...validCredential, type: ['UniversityDegree'] };

      const result = await verifier.verifyCredential(credential);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Credential type must include VerifiableCredential');
    });

    it('should reject credential missing issuer', async () => {
      const credential = { ...validCredential };
      delete credential.issuer;

      const result = await verifier.verifyCredential(credential);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing issuer');
    });

    it('should reject credential missing credentialSubject', async () => {
      const credential = { ...validCredential };
      delete credential.credentialSubject;

      const result = await verifier.verifyCredential(credential);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing credentialSubject');
    });

    it('should reject credential missing issuanceDate', async () => {
      const credential = { ...validCredential };
      delete credential.issuanceDate;

      const result = await verifier.verifyCredential(credential);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing issuanceDate');
    });

    it('should reject expired credential when checkExpiration is enabled', async () => {
      const expiredCredential = {
        ...validCredential,
        expirationDate: '2020-01-01T00:00:00Z',
      };

      const result = await verifier.verifyCredential(expiredCredential);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Credential has expired');
    });

    it('should accept expired credential when checkExpiration is disabled', async () => {
      const customVerifier = new Verifier({ checkExpiration: false });
      const expiredCredential = {
        ...validCredential,
        expirationDate: '2020-01-01T00:00:00Z',
      };

      const result = await customVerifier.verifyCredential(expiredCredential);

      expect(result.verified).toBe(true);
    });

    it('should accept credential with future expiration date', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const credential = {
        ...validCredential,
        expirationDate: futureDate.toISOString(),
      };

      const result = await verifier.verifyCredential(credential);

      expect(result.verified).toBe(true);
    });

    it('should accept credential without expiration date', async () => {
      const result = await verifier.verifyCredential(validCredential);

      expect(result.verified).toBe(true);
    });

    it('should check trusted issuers with string issuer', async () => {
      const customVerifier = new Verifier({
        trustedIssuers: ['did:peer:trusted1', 'did:peer:trusted2'],
      });

      const result = await customVerifier.verifyCredential(validCredential);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Issuer did:peer:issuer123 is not in the trusted list');
    });

    it('should accept trusted issuer', async () => {
      const customVerifier = new Verifier({
        trustedIssuers: ['did:peer:issuer123'],
      });

      const result = await customVerifier.verifyCredential(validCredential);

      expect(result.verified).toBe(true);
    });

    it('should check trusted issuers with object issuer', async () => {
      const customVerifier = new Verifier({
        trustedIssuers: ['did:peer:trusted1'],
      });
      const credential = {
        ...validCredential,
        issuer: { id: 'did:peer:issuer123' },
      };

      const result = await customVerifier.verifyCredential(credential);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Issuer did:peer:issuer123 is not in the trusted list');
    });

    it('should accept object issuer when in trusted list', async () => {
      const customVerifier = new Verifier({
        trustedIssuers: ['did:peer:issuer123'],
      });
      const credential = {
        ...validCredential,
        issuer: { id: 'did:peer:issuer123' },
      };

      const result = await customVerifier.verifyCredential(credential);

      expect(result.verified).toBe(true);
    });

    it('should check required credential types', async () => {
      const customVerifier = new Verifier({
        requiredCredentialTypes: ['DriverLicense'],
      });

      const result = await customVerifier.verifyCredential(validCredential);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Credential does not have any of the required types: DriverLicense');
    });

    it('should accept credential with required type', async () => {
      const customVerifier = new Verifier({
        requiredCredentialTypes: ['UniversityDegree'],
      });

      const result = await customVerifier.verifyCredential(validCredential);

      expect(result.verified).toBe(true);
    });

    it('should accept credential with any of the required types', async () => {
      const customVerifier = new Verifier({
        requiredCredentialTypes: ['DriverLicense', 'UniversityDegree'],
      });

      const result = await customVerifier.verifyCredential(validCredential);

      expect(result.verified).toBe(true);
    });

    it('should add warning for proof when checkProof is enabled', async () => {
      const customVerifier = new Verifier({ checkProof: true });
      const credential = {
        ...validCredential,
        proof: {
          type: 'Ed25519Signature2020',
          created: '2023-01-01T00:00:00Z',
          proofPurpose: 'assertionMethod',
          verificationMethod: 'did:peer:issuer123#key-1',
          proofValue: 'z...',
        },
      };

      const result = await customVerifier.verifyCredential(credential);

      expect(result.warnings).toContain('Proof verification not yet implemented');
    });

    it('should accumulate multiple errors', async () => {
      const badCredential = {
        type: 'NotAnArray',
      };

      const result = await verifier.verifyCredential(badCredential);

      expect(result.verified).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Missing @context');
      expect(result.errors).toContain('Missing or invalid type');
      expect(result.errors).toContain('Missing issuer');
      expect(result.errors).toContain('Missing credentialSubject');
      expect(result.errors).toContain('Missing issuanceDate');
    });
  });

  describe('verifyPresentation', () => {
    const validCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      issuer: 'did:peer:issuer123',
      issuanceDate: '2023-01-01T00:00:00Z',
      credentialSubject: {
        id: 'did:peer:holder123',
        name: 'John Doe',
      },
    };

    const validPresentation = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      holder: 'did:peer:holder123',
      verifiableCredential: [validCredential],
    };

    it('should verify a valid presentation', async () => {
      const result = await verifier.verifyPresentation(validPresentation);

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null presentation', async () => {
      const result = await verifier.verifyPresentation(null);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Presentation is null or undefined');
    });

    it('should reject undefined presentation', async () => {
      const result = await verifier.verifyPresentation(undefined);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Presentation is null or undefined');
    });

    it('should reject presentation missing @context', async () => {
      const presentation = { ...validPresentation };
      delete presentation['@context'];

      const result = await verifier.verifyPresentation(presentation);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing @context');
    });

    it('should reject presentation missing type', async () => {
      const presentation = { ...validPresentation };
      delete presentation.type;

      const result = await verifier.verifyPresentation(presentation);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing or invalid type');
    });

    it('should reject presentation with non-array type', async () => {
      const presentation = { ...validPresentation, type: 'VerifiablePresentation' };

      const result = await verifier.verifyPresentation(presentation);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing or invalid type');
    });

    it('should reject presentation without VerifiablePresentation type', async () => {
      const presentation = { ...validPresentation, type: ['SomeOtherType'] };

      const result = await verifier.verifyPresentation(presentation);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Presentation type must include VerifiablePresentation');
    });

    it('should reject presentation missing holder', async () => {
      const presentation = { ...validPresentation };
      delete presentation.holder;

      const result = await verifier.verifyPresentation(presentation);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing holder');
    });

    it('should reject presentation missing verifiableCredential', async () => {
      const presentation = { ...validPresentation };
      delete presentation.verifiableCredential;

      const result = await verifier.verifyPresentation(presentation);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing or invalid verifiableCredential');
    });

    it('should reject presentation with non-array verifiableCredential', async () => {
      const presentation = {
        ...validPresentation,
        verifiableCredential: validCredential,
      };

      const result = await verifier.verifyPresentation(presentation);

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing or invalid verifiableCredential');
    });

    it('should verify challenge when checkChallenge is enabled', async () => {
      const challenge = 'test-challenge-123';
      const presentation = {
        ...validPresentation,
        proof: {
          type: 'Ed25519Signature2020',
          challenge,
          proofPurpose: 'authentication',
        },
      };

      const result = await verifier.verifyPresentation(presentation, { challenge });

      expect(result.verified).toBe(true);
    });

    it('should reject presentation with mismatched challenge', async () => {
      const presentation = {
        ...validPresentation,
        proof: {
          type: 'Ed25519Signature2020',
          challenge: 'wrong-challenge',
          proofPurpose: 'authentication',
        },
      };

      const result = await verifier.verifyPresentation(presentation, {
        challenge: 'expected-challenge',
      });

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Challenge mismatch');
    });

    it('should reject presentation without proof when challenge is provided', async () => {
      const result = await verifier.verifyPresentation(validPresentation, {
        challenge: 'some-challenge',
      });

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing proof for challenge verification');
    });

    it('should skip challenge check when checkChallenge is disabled', async () => {
      const customVerifier = new Verifier({ checkChallenge: false });
      const result = await customVerifier.verifyPresentation(validPresentation, {
        challenge: 'some-challenge',
      });

      expect(result.verified).toBe(true);
    });

    it('should verify domain when checkDomain is enabled', async () => {
      const customVerifier = new Verifier({ checkDomain: true });
      const domain = 'https://verifier.example.com';
      const presentation = {
        ...validPresentation,
        proof: {
          type: 'Ed25519Signature2020',
          domain,
          proofPurpose: 'authentication',
        },
      };

      const result = await customVerifier.verifyPresentation(presentation, { domain });

      expect(result.verified).toBe(true);
    });

    it('should reject presentation with mismatched domain', async () => {
      const customVerifier = new Verifier({ checkDomain: true });
      const presentation = {
        ...validPresentation,
        proof: {
          type: 'Ed25519Signature2020',
          domain: 'https://wrong-domain.com',
          proofPurpose: 'authentication',
        },
      };

      const result = await customVerifier.verifyPresentation(presentation, {
        domain: 'https://expected-domain.com',
      });

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Domain mismatch');
    });

    it('should reject presentation without proof when domain is provided and checkDomain is enabled', async () => {
      const customVerifier = new Verifier({ checkDomain: true });
      const result = await customVerifier.verifyPresentation(validPresentation, {
        domain: 'https://example.com',
      });

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Missing proof for domain verification');
    });

    it('should verify embedded credentials', async () => {
      const result = await verifier.verifyPresentation(validPresentation);

      expect(result.verified).toBe(true);
    });

    it('should fail if embedded credential is invalid', async () => {
      const invalidCredential = { ...validCredential };
      delete invalidCredential.issuer;

      const presentation = {
        ...validPresentation,
        verifiableCredential: [invalidCredential],
      };

      const result = await verifier.verifyPresentation(presentation);

      expect(result.verified).toBe(false);
      expect(result.errors.some(e => e.includes('Credential 1 verification failed'))).toBe(true);
    });

    it('should verify multiple credentials in presentation', async () => {
      const credential2 = {
        ...validCredential,
        credentialSubject: {
          id: 'did:peer:holder123',
          email: 'john@example.com',
        },
      };

      const presentation = {
        ...validPresentation,
        verifiableCredential: [validCredential, credential2],
      };

      const result = await verifier.verifyPresentation(presentation);

      expect(result.verified).toBe(true);
    });

    it('should accumulate warnings from embedded credentials', async () => {
      const customVerifier = new Verifier({ checkProof: true });
      const credentialWithProof = {
        ...validCredential,
        proof: { type: 'Ed25519Signature2020' },
      };

      const presentation = {
        ...validPresentation,
        verifiableCredential: [credentialWithProof],
      };

      const result = await customVerifier.verifyPresentation(presentation);

      expect(result.warnings.some(w => w.includes('Proof verification not yet implemented'))).toBe(true);
    });

    it('should add warning for presentation proof when checkProof is enabled', async () => {
      const customVerifier = new Verifier({ checkProof: true });
      const presentation = {
        ...validPresentation,
        proof: {
          type: 'Ed25519Signature2020',
          proofPurpose: 'authentication',
        },
      };

      const result = await customVerifier.verifyPresentation(presentation);

      expect(result.warnings).toContain('Proof verification not yet implemented');
    });

    it('should handle empty verifiableCredential array', async () => {
      const presentation = {
        ...validPresentation,
        verifiableCredential: [],
      };

      const result = await verifier.verifyPresentation(presentation);

      expect(result.verified).toBe(true);
    });
  });

  describe('verifyPresentationWithChallenge', () => {
    const validCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      issuer: 'did:peer:issuer123',
      issuanceDate: '2023-01-01T00:00:00Z',
      credentialSubject: {
        id: 'did:peer:holder123',
        name: 'John Doe',
      },
    };

    const validPresentation = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      holder: 'did:peer:holder123',
      verifiableCredential: [validCredential],
    };

    it('should verify presentation with correct challenge', async () => {
      const challenge = 'test-challenge-456';
      const presentation = {
        ...validPresentation,
        proof: {
          type: 'Ed25519Signature2020',
          challenge,
          proofPurpose: 'authentication',
        },
      };

      const result = await verifier.verifyPresentationWithChallenge(presentation, challenge);

      expect(result.verified).toBe(true);
    });

    it('should reject presentation with wrong challenge', async () => {
      const presentation = {
        ...validPresentation,
        proof: {
          type: 'Ed25519Signature2020',
          challenge: 'wrong-challenge',
          proofPurpose: 'authentication',
        },
      };

      const result = await verifier.verifyPresentationWithChallenge(
        presentation,
        'expected-challenge'
      );

      expect(result.verified).toBe(false);
      expect(result.errors).toContain('Challenge mismatch');
    });

    it('should verify presentation with challenge and domain', async () => {
      const challenge = 'test-challenge-789';
      const domain = 'https://verifier.example.com';
      const customVerifier = new Verifier({ checkDomain: true });
      const presentation = {
        ...validPresentation,
        proof: {
          type: 'Ed25519Signature2020',
          challenge,
          domain,
          proofPurpose: 'authentication',
        },
      };

      const result = await customVerifier.verifyPresentationWithChallenge(
        presentation,
        challenge,
        { domain }
      );

      expect(result.verified).toBe(true);
    });
  });

  describe('extractClaims', () => {
    it('should extract claims from single credential', () => {
      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder123',
        verifiableCredential: [
          {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiableCredential'],
            issuer: 'did:peer:issuer123',
            issuanceDate: '2023-01-01T00:00:00Z',
            credentialSubject: {
              id: 'did:peer:holder123',
              name: 'John Doe',
              age: 30,
            },
          },
        ],
      };

      const claims = verifier.extractClaims(presentation);

      expect(claims).toEqual({
        name: 'John Doe',
        age: 30,
      });
    });

    it('should merge claims from multiple credentials', () => {
      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder123',
        verifiableCredential: [
          {
            credentialSubject: {
              id: 'did:peer:holder123',
              name: 'John Doe',
            },
          },
          {
            credentialSubject: {
              id: 'did:peer:holder123',
              email: 'john@example.com',
            },
          },
        ],
      };

      const claims = verifier.extractClaims(presentation);

      expect(claims).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should return empty object when no verifiableCredential', () => {
      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder123',
      };

      const claims = verifier.extractClaims(presentation);

      expect(claims).toEqual({});
    });

    it('should return empty object when verifiableCredential is not an array', () => {
      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder123',
        verifiableCredential: 'not-an-array',
      };

      const claims = verifier.extractClaims(presentation);

      expect(claims).toEqual({});
    });

    it('should handle empty verifiableCredential array', () => {
      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder123',
        verifiableCredential: [],
      };

      const claims = verifier.extractClaims(presentation);

      expect(claims).toEqual({});
    });

    it('should skip credentials without credentialSubject', () => {
      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder123',
        verifiableCredential: [
          {
            type: ['VerifiableCredential'],
            issuer: 'did:peer:issuer123',
          },
        ],
      };

      const claims = verifier.extractClaims(presentation);

      expect(claims).toEqual({});
    });

    it('should remove id field from claims', () => {
      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder123',
        verifiableCredential: [
          {
            credentialSubject: {
              id: 'did:peer:holder123',
              name: 'John Doe',
              customId: '12345',
            },
          },
        ],
      };

      const claims = verifier.extractClaims(presentation);

      expect(claims.id).toBeUndefined();
      expect(claims.name).toBe('John Doe');
      expect(claims.customId).toBe('12345');
    });

    it('should handle complex nested claims', () => {
      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:holder123',
        verifiableCredential: [
          {
            credentialSubject: {
              id: 'did:peer:holder123',
              address: {
                street: '123 Main St',
                city: 'Boston',
                country: 'USA',
              },
              education: [
                { degree: 'BS', year: 2015 },
                { degree: 'MS', year: 2017 },
              ],
            },
          },
        ],
      };

      const claims = verifier.extractClaims(presentation);

      expect(claims.address).toEqual({
        street: '123 Main St',
        city: 'Boston',
        country: 'USA',
      });
      expect(claims.education).toHaveLength(2);
    });
  });

  describe('updatePolicy', () => {
    it('should update policy fields', () => {
      verifier.updatePolicy({
        checkExpiration: false,
        trustedIssuers: ['did:peer:issuer1'],
      });

      const policy = verifier.getPolicy();
      expect(policy.checkExpiration).toBe(false);
      expect(policy.trustedIssuers).toEqual(['did:peer:issuer1']);
      expect(policy.checkChallenge).toBe(true); // unchanged
    });

    it('should merge with existing policy', () => {
      verifier.updatePolicy({ trustedIssuers: ['did:peer:issuer1'] });
      verifier.updatePolicy({ checkExpiration: false });

      const policy = verifier.getPolicy();
      expect(policy.checkExpiration).toBe(false);
      expect(policy.trustedIssuers).toEqual(['did:peer:issuer1']);
    });

    it('should handle empty update', () => {
      const originalPolicy = verifier.getPolicy();
      verifier.updatePolicy({});

      const policy = verifier.getPolicy();
      expect(policy).toEqual(originalPolicy);
    });

    it('should update all policy fields', () => {
      const newPolicy: VerificationPolicy = {
        checkExpiration: false,
        checkProof: true,
        checkChallenge: false,
        checkDomain: true,
        trustedIssuers: ['did:peer:issuer1', 'did:peer:issuer2'],
        requiredCredentialTypes: ['UniversityDegree', 'DriverLicense'],
      };

      verifier.updatePolicy(newPolicy);

      const policy = verifier.getPolicy();
      expect(policy).toEqual(newPolicy);
    });
  });

  describe('getPolicy', () => {
    it('should return a copy of the policy', () => {
      const policy1 = verifier.getPolicy();
      const policy2 = verifier.getPolicy();

      expect(policy1).not.toBe(policy2); // different objects
      expect(policy1).toEqual(policy2); // same values
    });

    it('should not allow external modification of policy', () => {
      const policy = verifier.getPolicy();
      policy.checkExpiration = false;

      const actualPolicy = verifier.getPolicy();
      expect(actualPolicy.checkExpiration).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete verification workflow', async () => {
      // Setup
      const customVerifier = new Verifier({
        trustedIssuers: ['did:peer:university'],
        requiredCredentialTypes: ['UniversityDegree'],
      });

      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'UniversityDegree'],
        issuer: 'did:peer:university',
        issuanceDate: '2023-01-01T00:00:00Z',
        credentialSubject: {
          id: 'did:peer:student',
          degree: 'Bachelor of Science',
          gpa: 3.8,
        },
      };

      const challenge = 'challenge-xyz';
      const presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: 'did:peer:student',
        verifiableCredential: [credential],
        proof: {
          type: 'Ed25519Signature2020',
          challenge,
          proofPurpose: 'authentication',
        },
      };

      // Verify
      const result = await customVerifier.verifyPresentationWithChallenge(
        presentation,
        challenge
      );

      expect(result.verified).toBe(true);

      // Extract claims
      const claims = customVerifier.extractClaims(presentation);
      expect(claims.degree).toBe('Bachelor of Science');
      expect(claims.gpa).toBe(3.8);
    });

    it('should handle policy updates between verifications', async () => {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: 'did:peer:issuer1',
        issuanceDate: '2023-01-01T00:00:00Z',
        expirationDate: '2020-01-01T00:00:00Z',
        credentialSubject: {
          id: 'did:peer:holder',
          name: 'Test',
        },
      };

      // First verification with expiration check
      const result1 = await verifier.verifyCredential(credential);
      expect(result1.verified).toBe(false);
      expect(result1.errors).toContain('Credential has expired');

      // Update policy to skip expiration check
      verifier.updatePolicy({ checkExpiration: false });

      // Second verification without expiration check
      const result2 = await verifier.verifyCredential(credential);
      expect(result2.verified).toBe(true);
    });
  });
});

