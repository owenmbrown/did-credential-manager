/**
 * Tests for Verifiable Presentation Builder
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { VPBuilder, PresentationOptions, SelectiveDisclosureOptions } from './vp-builder.js';

// Mock @did-edu/common
jest.mock('@did-edu/common', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('VPBuilder', () => {
  const mockCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'UniversityDegree'],
    id: 'vc-123',
    issuer: {
      id: 'did:peer:issuer123'
    },
    credentialSubject: {
      id: 'did:peer:holder456',
      name: 'John Doe',
      degree: 'Bachelor of Science',
      gpa: '3.8',
      graduationDate: '2020-05-15'
    },
    issuanceDate: '2020-05-15T12:00:00Z'
  };

  describe('createPresentation', () => {
    it('should create a basic presentation', async () => {
      const options: PresentationOptions = {
        holderDid: 'did:peer:holder456',
        credentials: [mockCredential]
      };

      const vp = await VPBuilder.createPresentation(options);

      expect(vp).toHaveProperty('@context');
      expect(vp['@context']).toContain('https://www.w3.org/2018/credentials/v1');
      expect(vp.type).toContain('VerifiablePresentation');
      expect(vp.holder).toBe('did:peer:holder456');
      expect(vp.verifiableCredential).toHaveLength(1);
      expect(vp.verifiableCredential[0]).toEqual(mockCredential);
    });

    it('should create presentation with custom type', async () => {
      const options: PresentationOptions = {
        holderDid: 'did:peer:holder456',
        credentials: [mockCredential],
        type: ['VerifiablePresentation', 'CredentialResponse']
      };

      const vp = await VPBuilder.createPresentation(options);

      expect(vp.type).toEqual(['VerifiablePresentation', 'CredentialResponse']);
    });

    it('should create presentation with challenge', async () => {
      const options: PresentationOptions = {
        holderDid: 'did:peer:holder456',
        credentials: [mockCredential],
        challenge: 'challenge-123'
      };

      const vp = await VPBuilder.createPresentation(options);

      expect(vp).toHaveProperty('proof');
      expect(vp.proof.challenge).toBe('challenge-123');
      expect(vp.proof.type).toBe('Ed25519Signature2020');
      expect(vp.proof.proofPurpose).toBe('authentication');
      expect(vp.proof.verificationMethod).toBe('did:peer:holder456#key-1');
      expect(vp.proof).toHaveProperty('created');
    });

    it('should create presentation with domain', async () => {
      const options: PresentationOptions = {
        holderDid: 'did:peer:holder456',
        credentials: [mockCredential],
        domain: 'example.com'
      };

      const vp = await VPBuilder.createPresentation(options);

      expect(vp).toHaveProperty('proof');
      expect(vp.proof.domain).toBe('example.com');
    });

    it('should create presentation with both challenge and domain', async () => {
      const options: PresentationOptions = {
        holderDid: 'did:peer:holder456',
        credentials: [mockCredential],
        challenge: 'challenge-123',
        domain: 'example.com'
      };

      const vp = await VPBuilder.createPresentation(options);

      expect(vp.proof.challenge).toBe('challenge-123');
      expect(vp.proof.domain).toBe('example.com');
    });

    it('should throw error if holderDid is missing', async () => {
      const options: PresentationOptions = {
        holderDid: '',
        credentials: [mockCredential]
      };

      await expect(VPBuilder.createPresentation(options)).rejects.toThrow('holderDid is required');
    });

    it('should throw error if credentials array is empty', async () => {
      const options: PresentationOptions = {
        holderDid: 'did:peer:holder456',
        credentials: []
      };

      await expect(VPBuilder.createPresentation(options)).rejects.toThrow('At least one credential is required');
    });

    it('should throw error if credentials is null', async () => {
      const options: any = {
        holderDid: 'did:peer:holder456',
        credentials: null
      };

      await expect(VPBuilder.createPresentation(options)).rejects.toThrow('At least one credential is required');
    });

    it('should handle multiple credentials', async () => {
      const credential2 = {
        ...mockCredential,
        id: 'vc-456',
        type: ['VerifiableCredential', 'DriversLicense']
      };

      const options: PresentationOptions = {
        holderDid: 'did:peer:holder456',
        credentials: [mockCredential, credential2]
      };

      const vp = await VPBuilder.createPresentation(options);

      expect(vp.verifiableCredential).toHaveLength(2);
    });
  });

  describe('applySelectiveDisclosure', () => {
    it('should include only specified fields', () => {
      const options: SelectiveDisclosureOptions = {
        fields: ['name', 'degree']
      };

      const result = VPBuilder.applySelectiveDisclosure(mockCredential, options);

      expect(result.credentialSubject.name).toBe('John Doe');
      expect(result.credentialSubject.degree).toBe('Bachelor of Science');
      expect(result.credentialSubject.gpa).toBeUndefined();
      expect(result.credentialSubject.graduationDate).toBeUndefined();
      expect(result.credentialSubject.id).toBe('did:peer:holder456'); // ID should always be included
    });

    it('should exclude specified fields', () => {
      const options: SelectiveDisclosureOptions = {
        excludeFields: ['gpa', 'graduationDate']
      };

      const result = VPBuilder.applySelectiveDisclosure(mockCredential, options);

      expect(result.credentialSubject.name).toBe('John Doe');
      expect(result.credentialSubject.degree).toBe('Bachelor of Science');
      expect(result.credentialSubject.gpa).toBeUndefined();
      expect(result.credentialSubject.graduationDate).toBeUndefined();
    });

    it('should handle fields that do not exist', () => {
      const options: SelectiveDisclosureOptions = {
        fields: ['name', 'nonExistentField']
      };

      const result = VPBuilder.applySelectiveDisclosure(mockCredential, options);

      expect(result.credentialSubject.name).toBe('John Doe');
      expect(result.credentialSubject.nonExistentField).toBeUndefined();
      expect(result.credentialSubject.id).toBe('did:peer:holder456');
    });

    it('should not modify original credential', () => {
      const options: SelectiveDisclosureOptions = {
        fields: ['name']
      };

      const originalGpa = mockCredential.credentialSubject.gpa;
      VPBuilder.applySelectiveDisclosure(mockCredential, options);

      expect(mockCredential.credentialSubject.gpa).toBe(originalGpa);
    });

    it('should handle empty fields array', () => {
      const options: SelectiveDisclosureOptions = {
        fields: []
      };

      const result = VPBuilder.applySelectiveDisclosure(mockCredential, options);

      expect(result.credentialSubject.id).toBe('did:peer:holder456');
      // When fields is empty array, only ID should be included along with any fields not filtered
      // The implementation sets all non-matching fields to undefined but keeps ID
      const keys = Object.keys(result.credentialSubject);
      expect(keys).toContain('id');
    });

    it('should handle empty excludeFields array', () => {
      const options: SelectiveDisclosureOptions = {
        excludeFields: []
      };

      const result = VPBuilder.applySelectiveDisclosure(mockCredential, options);

      expect(result.credentialSubject).toEqual(mockCredential.credentialSubject);
    });

    it('should handle empty options', () => {
      const options: SelectiveDisclosureOptions = {};

      const result = VPBuilder.applySelectiveDisclosure(mockCredential, options);

      expect(result.credentialSubject).toEqual(mockCredential.credentialSubject);
    });
  });

  describe('createSelectivePresentation', () => {
    it('should create presentation with selective disclosure', async () => {
      const options: PresentationOptions = {
        holderDid: 'did:peer:holder456',
        credentials: [mockCredential]
      };

      const disclosureOptions: SelectiveDisclosureOptions = {
        fields: ['name', 'degree']
      };

      const vp = await VPBuilder.createSelectivePresentation(options, disclosureOptions);

      expect(vp.holder).toBe('did:peer:holder456');
      expect(vp.verifiableCredential).toHaveLength(1);
      expect(vp.verifiableCredential[0].credentialSubject.name).toBe('John Doe');
      expect(vp.verifiableCredential[0].credentialSubject.degree).toBe('Bachelor of Science');
      expect(vp.verifiableCredential[0].credentialSubject.gpa).toBeUndefined();
    });

    it('should apply selective disclosure to multiple credentials', async () => {
      const credential2 = {
        ...mockCredential,
        id: 'vc-456',
        credentialSubject: {
          ...mockCredential.credentialSubject,
          id: 'did:peer:holder789'
        }
      };

      const options: PresentationOptions = {
        holderDid: 'did:peer:holder456',
        credentials: [mockCredential, credential2]
      };

      const disclosureOptions: SelectiveDisclosureOptions = {
        fields: ['name']
      };

      const vp = await VPBuilder.createSelectivePresentation(options, disclosureOptions);

      expect(vp.verifiableCredential).toHaveLength(2);
      expect(vp.verifiableCredential[0].credentialSubject.name).toBe('John Doe');
      expect(vp.verifiableCredential[0].credentialSubject.gpa).toBeUndefined();
      expect(vp.verifiableCredential[1].credentialSubject.name).toBe('John Doe');
      expect(vp.verifiableCredential[1].credentialSubject.gpa).toBeUndefined();
    });
  });

  describe('validatePresentationRequest', () => {
    it('should validate a correct request', () => {
      const request = {
        type: 'https://didcomm.org/present-proof/3.0/request-presentation',
        body: {
          credential_types: ['UniversityDegree']
        }
      };

      const result = VPBuilder.validatePresentationRequest(request);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation if type is invalid', () => {
      const request = {
        type: 'invalid-type',
        body: {}
      };

      const result = VPBuilder.validatePresentationRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid request type');
    });

    it('should fail validation if type is missing', () => {
      const request = {
        body: {}
      };

      const result = VPBuilder.validatePresentationRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid request type');
    });

    it('should fail validation if body is missing', () => {
      const request = {
        type: 'https://didcomm.org/present-proof/3.0/request-presentation'
      };

      const result = VPBuilder.validatePresentationRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Request body is required');
    });

    it('should fail validation with multiple errors', () => {
      const request = {
        type: 'invalid-type'
      };

      const result = VPBuilder.validatePresentationRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('extractRequirements', () => {
    it('should extract credential types', () => {
      const request = {
        body: {
          credential_types: ['UniversityDegree', 'DriversLicense']
        }
      };

      const result = VPBuilder.extractRequirements(request);

      expect(result.credentialTypes).toEqual(['UniversityDegree', 'DriversLicense']);
    });

    it('should extract fields', () => {
      const request = {
        body: {
          fields: ['name', 'degree']
        }
      };

      const result = VPBuilder.extractRequirements(request);

      expect(result.fields).toEqual(['name', 'degree']);
    });

    it('should extract requested_attributes as fields', () => {
      const request = {
        body: {
          requested_attributes: ['name', 'degree']
        }
      };

      const result = VPBuilder.extractRequirements(request);

      expect(result.fields).toEqual(['name', 'degree']);
    });

    it('should extract trusted issuers', () => {
      const request = {
        body: {
          trusted_issuers: ['did:peer:issuer123']
        }
      };

      const result = VPBuilder.extractRequirements(request);

      expect(result.issuers).toEqual(['did:peer:issuer123']);
    });

    it('should extract challenge from body', () => {
      const request = {
        body: {
          challenge: 'challenge-123'
        }
      };

      const result = VPBuilder.extractRequirements(request);

      expect(result.challenge).toBe('challenge-123');
    });

    it('should extract challenge from root level', () => {
      const request = {
        challenge: 'challenge-456',
        body: {}
      };

      const result = VPBuilder.extractRequirements(request);

      expect(result.challenge).toBe('challenge-456');
    });

    it('should extract challenge from attachments', () => {
      const request = {
        body: {},
        attachments: [
          {
            data: {
              json: {
                options: {
                  challenge: 'challenge-789'
                }
              }
            }
          }
        ]
      };

      const result = VPBuilder.extractRequirements(request);

      expect(result.challenge).toBe('challenge-789');
    });

    it('should prioritize body challenge over attachment challenge', () => {
      const request = {
        body: {
          challenge: 'body-challenge'
        },
        attachments: [
          {
            data: {
              json: {
                options: {
                  challenge: 'attachment-challenge'
                }
              }
            }
          }
        ]
      };

      const result = VPBuilder.extractRequirements(request);

      expect(result.challenge).toBe('body-challenge');
    });

    it('should extract domain', () => {
      const request = {
        body: {
          domain: 'example.com'
        }
      };

      const result = VPBuilder.extractRequirements(request);

      expect(result.domain).toBe('example.com');
    });

    it('should handle alternative field names', () => {
      const request = {
        body: {
          credentialTypes: ['UniversityDegree'],
          issuers: ['did:peer:issuer123']
        }
      };

      const result = VPBuilder.extractRequirements(request);

      expect(result.credentialTypes).toEqual(['UniversityDegree']);
      expect(result.issuers).toEqual(['did:peer:issuer123']);
    });

    it('should handle empty request', () => {
      const request = {
        body: {}
      };

      const result = VPBuilder.extractRequirements(request);

      expect(result.credentialTypes).toBeUndefined();
      expect(result.fields).toBeUndefined();
      expect(result.issuers).toBeUndefined();
      expect(result.challenge).toBeUndefined();
      expect(result.domain).toBeUndefined();
    });
  });

  describe('filterCredentialsByRequirements', () => {
    const credentials = [
      {
        type: ['VerifiableCredential', 'UniversityDegree'],
        issuer: 'did:peer:issuer123',
        credentialSubject: {
          name: 'John Doe',
          degree: 'Bachelor'
        }
      },
      {
        type: ['VerifiableCredential', 'DriversLicense'],
        issuer: 'did:peer:issuer456',
        credentialSubject: {
          name: 'Jane Smith',
          licenseNumber: '123456'
        }
      },
      {
        type: ['VerifiableCredential', 'UniversityDegree'],
        issuer: { id: 'did:peer:issuer789' },
        credentialSubject: {
          name: 'Bob Johnson',
          degree: 'Master'
        }
      }
    ];

    it('should filter by credential type', () => {
      const requirements = {
        credentialTypes: ['UniversityDegree']
      };

      const result = VPBuilder.filterCredentialsByRequirements(credentials, requirements);

      expect(result).toHaveLength(2);
      expect(result[0].type).toContain('UniversityDegree');
      expect(result[1].type).toContain('UniversityDegree');
    });

    it('should filter by issuer (string)', () => {
      const requirements = {
        issuers: ['did:peer:issuer123']
      };

      const result = VPBuilder.filterCredentialsByRequirements(credentials, requirements);

      expect(result).toHaveLength(1);
      expect(result[0].issuer).toBe('did:peer:issuer123');
    });

    it('should filter by issuer (object)', () => {
      const requirements = {
        issuers: ['did:peer:issuer789']
      };

      const result = VPBuilder.filterCredentialsByRequirements(credentials, requirements);

      expect(result).toHaveLength(1);
      expect((result[0].issuer as any).id).toBe('did:peer:issuer789');
    });

    it('should filter by required fields', () => {
      const requirements = {
        fields: ['name', 'degree']
      };

      const result = VPBuilder.filterCredentialsByRequirements(credentials, requirements);

      expect(result).toHaveLength(2);
      expect(result.every(vc => vc.credentialSubject.degree !== undefined)).toBe(true);
    });

    it('should handle id field in requirements', () => {
      const requirements = {
        fields: ['id', 'name']
      };

      const result = VPBuilder.filterCredentialsByRequirements(credentials, requirements);

      expect(result).toHaveLength(3); // All have name
    });

    it('should filter by multiple criteria', () => {
      const requirements = {
        credentialTypes: ['UniversityDegree'],
        issuers: ['did:peer:issuer123']
      };

      const result = VPBuilder.filterCredentialsByRequirements(credentials, requirements);

      expect(result).toHaveLength(1);
      expect(result[0].issuer).toBe('did:peer:issuer123');
      expect(result[0].type).toContain('UniversityDegree');
    });

    it('should return all credentials if no requirements', () => {
      const requirements = {};

      const result = VPBuilder.filterCredentialsByRequirements(credentials, requirements);

      expect(result).toHaveLength(3);
    });

    it('should return empty array if no credentials match', () => {
      const requirements = {
        credentialTypes: ['NonExistentType']
      };

      const result = VPBuilder.filterCredentialsByRequirements(credentials, requirements);

      expect(result).toHaveLength(0);
    });

    it('should handle string type in credential', () => {
      const singleTypeCredentials = [
        {
          type: 'VerifiableCredential',
          issuer: 'did:peer:issuer123',
          credentialSubject: { name: 'Test' }
        }
      ];

      const requirements = {
        credentialTypes: ['VerifiableCredential']
      };

      const result = VPBuilder.filterCredentialsByRequirements(singleTypeCredentials, requirements);

      expect(result).toHaveLength(1);
    });
  });

  describe('createPresentationFromRequest', () => {
    const holderDid = 'did:peer:holder456';
    const credentials = [
      {
        type: ['VerifiableCredential', 'UniversityDegree'],
        issuer: 'did:peer:issuer123',
        credentialSubject: {
          id: holderDid,
          name: 'John Doe',
          degree: 'Bachelor'
        }
      }
    ];

    it('should create presentation from valid request', async () => {
      const request = {
        type: 'https://didcomm.org/present-proof/3.0/request-presentation',
        body: {
          credential_types: ['UniversityDegree'],
          challenge: 'challenge-123'
        }
      };

      const vp = await VPBuilder.createPresentationFromRequest(holderDid, request, credentials);

      expect(vp.holder).toBe(holderDid);
      expect(vp.verifiableCredential).toHaveLength(1);
      expect(vp.proof.challenge).toBe('challenge-123');
    });

    it('should throw error for invalid request', async () => {
      const request = {
        type: 'invalid-type',
        body: {}
      };

      await expect(
        VPBuilder.createPresentationFromRequest(holderDid, request, credentials)
      ).rejects.toThrow('Invalid presentation request');
    });

    it('should throw error if no matching credentials', async () => {
      const request = {
        type: 'https://didcomm.org/present-proof/3.0/request-presentation',
        body: {
          credential_types: ['NonExistentType']
        }
      };

      await expect(
        VPBuilder.createPresentationFromRequest(holderDid, request, credentials)
      ).rejects.toThrow('No credentials match the presentation requirements');
    });

    it('should create selective presentation if fields specified', async () => {
      const request = {
        type: 'https://didcomm.org/present-proof/3.0/request-presentation',
        body: {
          credential_types: ['UniversityDegree'],
          fields: ['name']
        }
      };

      const vp = await VPBuilder.createPresentationFromRequest(holderDid, request, credentials);

      expect(vp.verifiableCredential[0].credentialSubject.name).toBe('John Doe');
      expect(vp.verifiableCredential[0].credentialSubject.degree).toBeUndefined();
    });

    it('should create presentation without selective disclosure if no fields', async () => {
      const request = {
        type: 'https://didcomm.org/present-proof/3.0/request-presentation',
        body: {
          credential_types: ['UniversityDegree']
        }
      };

      const vp = await VPBuilder.createPresentationFromRequest(holderDid, request, credentials);

      expect(vp.verifiableCredential[0].credentialSubject.name).toBe('John Doe');
      expect(vp.verifiableCredential[0].credentialSubject.degree).toBe('Bachelor');
    });

    it('should include domain in presentation', async () => {
      const request = {
        type: 'https://didcomm.org/present-proof/3.0/request-presentation',
        body: {
          credential_types: ['UniversityDegree'],
          domain: 'example.com'
        }
      };

      const vp = await VPBuilder.createPresentationFromRequest(holderDid, request, credentials);

      expect(vp.proof.domain).toBe('example.com');
    });

    it('should filter credentials by issuer', async () => {
      const multipleCredentials = [
        ...credentials,
        {
          type: ['VerifiableCredential', 'UniversityDegree'],
          issuer: 'did:peer:other-issuer',
          credentialSubject: {
            id: holderDid,
            name: 'Jane Doe',
            degree: 'Master'
          }
        }
      ];

      const request = {
        type: 'https://didcomm.org/present-proof/3.0/request-presentation',
        body: {
          credential_types: ['UniversityDegree'],
          trusted_issuers: ['did:peer:issuer123']
        }
      };

      const vp = await VPBuilder.createPresentationFromRequest(holderDid, request, multipleCredentials);

      expect(vp.verifiableCredential).toHaveLength(1);
      expect(vp.verifiableCredential[0].issuer).toBe('did:peer:issuer123');
    });
  });
});

