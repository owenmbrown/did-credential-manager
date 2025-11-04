/**
 * E2E Tests for Toolkit Samples
 * 
 * Tests the complete flow: Publish → Submit → Validate
 * 
 * This test suite ensures that:
 * 1. Issuer can publish/issue credentials
 * 2. Holder can receive and store credentials
 * 3. Verifier can validate credentials and presentations
 */

import fetch from 'node-fetch';

// Service endpoints
const ISSUER_URL = process.env.ISSUER_URL || 'http://localhost:5001';
const HOLDER_URL = process.env.HOLDER_URL || 'http://localhost:5003';
const VERIFIER_URL = process.env.VERIFIER_URL || 'http://localhost:5002';

// Timeout for service startup
const SERVICE_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_INTERVAL = 2000; // 2 seconds

/**
 * Wait for a service to be healthy
 */
async function waitForService(url: string, serviceName: string): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < SERVICE_TIMEOUT) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'healthy') {
          console.log(`✓ ${serviceName} is healthy`);
          return;
        }
      }
    } catch (error) {
      // Service not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
  }
  
  throw new Error(`Timeout waiting for ${serviceName} to become healthy`);
}

/**
 * Test helper: Check service health
 */
async function checkServiceHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

describe('Toolkit Samples E2E Tests', () => {
  let issuerDid: string;
  let holderDid: string;
  let verifierDid: string;

  beforeAll(async () => {
    // Wait for all services to be healthy
    console.log('Waiting for services to start...');
    await Promise.all([
      waitForService(ISSUER_URL, 'Issuer'),
      waitForService(HOLDER_URL, 'Holder'),
      waitForService(VERIFIER_URL, 'Verifier'),
    ]);

    // Get DIDs from each service
    const [issuerRes, holderRes, verifierRes] = await Promise.all([
      fetch(`${ISSUER_URL}/did`),
      fetch(`${HOLDER_URL}/did`),
      fetch(`${VERIFIER_URL}/did`),
    ]);

    issuerDid = (await issuerRes.json()).did;
    holderDid = (await holderRes.json()).did;
    verifierDid = (await verifierRes.json()).did;

    console.log(`Issuer DID: ${issuerDid}`);
    console.log(`Holder DID: ${holderDid}`);
    console.log(`Verifier DID: ${verifierDid}`);

    expect(issuerDid).toBeTruthy();
    expect(holderDid).toBeTruthy();
    expect(verifierDid).toBeTruthy();
  });

  describe('Publish → Submit → Validate Flow', () => {
    let issuedCredential: any;

    it('Step 1: Issuer publishes/issues a credential', async () => {
      const credentialSubject = {
        id: holderDid,
        name: 'John Doe',
        age: 25,
        licenseNumber: 'DL-12345',
        issueDate: new Date().toISOString(),
      };

      const response = await fetch(`${ISSUER_URL}/credentials/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialSubject,
          type: ['VerifiableCredential', 'DriversLicense'],
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.credential).toBeDefined();
      issuedCredential = data.credential;

      // Verify credential structure
      expect(issuedCredential['@context']).toBeDefined();
      expect(issuedCredential.type).toContain('VerifiableCredential');
      expect(issuedCredential.type).toContain('DriversLicense');
      // Issuer can be a string or object with id property
      const issuerId = typeof issuedCredential.issuer === 'string' 
        ? issuedCredential.issuer 
        : issuedCredential.issuer?.id;
      expect(issuerId).toBe(issuerDid);
      expect(issuedCredential.credentialSubject.id).toBe(holderDid);
      expect(issuedCredential.credentialSubject.name).toBe('John Doe');
      expect(issuedCredential.proof).toBeDefined();

      console.log('✓ Credential issued successfully');
    });

    it('Step 2: Holder submits/stores the credential', async () => {
      expect(issuedCredential).toBeDefined();

      // Store credential via HTTP API
      const response = await fetch(`${HOLDER_URL}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: issuedCredential,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify credential was stored
      const getResponse = await fetch(`${HOLDER_URL}/credentials`);
      expect(getResponse.ok).toBe(true);
      const credentials = await getResponse.json();
      expect(credentials.credentials).toBeInstanceOf(Array);
      expect(credentials.credentials.length).toBeGreaterThan(0);

      // Find our credential
      const storedCredential = credentials.credentials.find(
        (c: any) => c.credential['@id'] === issuedCredential['@id'] ||
                  c.credential.credentialSubject.id === holderDid
      );
      expect(storedCredential).toBeDefined();

      console.log('✓ Credential stored successfully');
    });

    it('Step 3: Verifier validates the credential', async () => {
      expect(issuedCredential).toBeDefined();

      const response = await fetch(`${VERIFIER_URL}/verify/credential`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: issuedCredential,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.verified).toBe(true);
      if (data.errors) {
        expect(data.errors).toHaveLength(0);
      }

      console.log('✓ Credential validated successfully');
    });

    it('Step 4: Holder creates and sends presentation', async () => {
      // Get stored credentials
      const getResponse = await fetch(`${HOLDER_URL}/credentials`);
      expect(getResponse.ok).toBe(true);
      const credentials = await getResponse.json();
      expect(credentials.credentials.length).toBeGreaterThan(0);

      const credential = credentials.credentials[0].credential;

      // Generate challenge from verifier
      const challengeResponse = await fetch(`${VERIFIER_URL}/challenges/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holderDid,
          domain: 'test.example.com',
          ttlMinutes: 5,
        }),
      });

      expect(challengeResponse.ok).toBe(true);
      const challengeData = await challengeResponse.json();
      const challenge = challengeData.challenge;

      // Create presentation
      const presentationResponse = await fetch(`${HOLDER_URL}/presentations/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: [credential],
          challenge,
          domain: 'test.example.com',
          verifierDid,
        }),
      });

      expect(presentationResponse.ok).toBe(true);
      const presentationData = await presentationResponse.json();
      expect(presentationData.presentation).toBeDefined();
      const presentation = presentationData.presentation;

      // Verify presentation structure
      expect(presentation['@context']).toBeDefined();
      expect(presentation.type).toContain('VerifiablePresentation');
      expect(presentation.verifiableCredential).toBeDefined();
      expect(presentation.proof).toBeDefined();

      console.log('✓ Presentation created successfully');
    });

    it('Step 5: Verifier validates presentation', async () => {
      // Get stored credentials
      const getResponse = await fetch(`${HOLDER_URL}/credentials`);
      expect(getResponse.ok).toBe(true);
      const credentials = await getResponse.json();
      expect(credentials.credentials.length).toBeGreaterThan(0);

      const credential = credentials.credentials[0].credential;

      // Generate challenge
      const challengeResponse = await fetch(`${VERIFIER_URL}/challenges/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holderDid,
          domain: 'test.example.com',
          ttlMinutes: 5,
        }),
      });

      expect(challengeResponse.ok).toBe(true);
      const challengeData = await challengeResponse.json();
      const challenge = challengeData.challenge;
      const challengeId = challengeData.challengeId;

      // Create presentation
      const presentationResponse = await fetch(`${HOLDER_URL}/presentations/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: [credential],
          challenge,
          domain: 'test.example.com',
          verifierDid,
        }),
      });

      expect(presentationResponse.ok).toBe(true);
      const presentationData = await presentationResponse.json();
      const presentation = presentationData.presentation;

      // Verify presentation with challenge
      const verifyResponse = await fetch(`${VERIFIER_URL}/verify/presentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentation,
          challengeId,
          domain: 'test.example.com',
        }),
      });

      expect(verifyResponse.ok).toBe(true);
      const verifyData = await verifyResponse.json();
      expect(verifyData.verified).toBe(true);
      if (verifyData.errors) {
        expect(verifyData.errors).toHaveLength(0);
      }

      console.log('✓ Presentation validated successfully');
    });
  });

  describe('Interop Tests', () => {
    it('Should handle OOB invitation flow for credential offer', async () => {
      // Create credential offer invitation
      const invitationResponse = await fetch(`${ISSUER_URL}/invitations/credential-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialType: 'DriversLicense',
          credentialData: {
            name: 'Jane Smith',
            age: 30,
            licenseNumber: 'DL-67890',
          },
          ttl: 3600,
        }),
      });

      expect(invitationResponse.ok).toBe(true);
      const invitationData = await invitationResponse.json();
      expect(invitationData.invitation).toBeDefined();
      expect(invitationData.invitationUrl).toBeDefined();

      // Holder accepts invitation
      const acceptResponse = await fetch(`${HOLDER_URL}/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationUrl: invitationData.invitationUrl,
        }),
      });

      expect(acceptResponse.ok).toBe(true);
      const acceptData = await acceptResponse.json();
      expect(acceptData.success).toBe(true);

      console.log('✓ OOB invitation flow completed');
    });

    it('Should handle OOB invitation flow for presentation request', async () => {
      // Create presentation request invitation
      const invitationResponse = await fetch(`${VERIFIER_URL}/invitations/presentation-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedCredentials: ['DriversLicense'],
          requestedFields: ['name', 'age'],
          ttl: 3600,
        }),
      });

      expect(invitationResponse.ok).toBe(true);
      const invitationData = await invitationResponse.json();
      expect(invitationData.invitation).toBeDefined();
      expect(invitationData.challenge).toBeDefined();

      console.log('✓ Presentation request invitation created');
    });

    it('Should verify service health endpoints', async () => {
      const [issuerHealth, holderHealth, verifierHealth] = await Promise.all([
        checkServiceHealth(ISSUER_URL),
        checkServiceHealth(HOLDER_URL),
        checkServiceHealth(VERIFIER_URL),
      ]);

      expect(issuerHealth).toBe(true);
      expect(holderHealth).toBe(true);
      expect(verifierHealth).toBe(true);

      console.log('✓ All services healthy');
    });
  });
});

