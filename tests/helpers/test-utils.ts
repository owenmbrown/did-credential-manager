/**
 * Test Helper Utilities
 * 
 * Common utilities for E2E and integration tests
 */

import fetch from 'node-fetch';

/**
 * Service configuration
 */
export interface ServiceConfig {
  issuerUrl: string;
  holderUrl: string;
  verifierUrl: string;
}

/**
 * Wait for a service to be healthy
 */
export async function waitForService(
  url: string,
  serviceName: string,
  timeout: number = 30000
): Promise<void> {
  const startTime = Date.now();
  const interval = 2000;

  while (Date.now() - startTime < timeout) {
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

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for ${serviceName} to become healthy`);
}

/**
 * Check if a service is healthy
 */
export async function checkServiceHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get DID from a service
 */
export async function getServiceDID(url: string): Promise<string> {
  const response = await fetch(`${url}/did`);
  if (!response.ok) {
    throw new Error(`Failed to get DID from ${url}`);
  }
  const data = await response.json();
  return data.did;
}

/**
 * Create a test credential
 */
export function createTestCredential(
  issuerDid: string,
  holderDid: string,
  additionalClaims: Record<string, any> = {}
): any {
  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'DriversLicense'],
    issuer: issuerDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: holderDid,
      name: 'Test User',
      age: 25,
      licenseNumber: 'DL-TEST-12345',
      ...additionalClaims,
    },
  };
}

/**
 * Wait for all services to be healthy
 */
export async function waitForAllServices(
  config: ServiceConfig
): Promise<void> {
  await Promise.all([
    waitForService(config.issuerUrl, 'Issuer'),
    waitForService(config.holderUrl, 'Holder'),
    waitForService(config.verifierUrl, 'Verifier'),
  ]);
}

/**
 * Get DIDs from all services
 */
export async function getAllServiceDIDs(
  config: ServiceConfig
): Promise<{ issuerDid: string; holderDid: string; verifierDid: string }> {
  const [issuerDid, holderDid, verifierDid] = await Promise.all([
    getServiceDID(config.issuerUrl),
    getServiceDID(config.holderUrl),
    getServiceDID(config.verifierUrl),
  ]);

  return { issuerDid, holderDid, verifierDid };
}

/**
 * Test fixture: Full credential flow
 */
export async function testCredentialFlow(config: ServiceConfig) {
  // Get DIDs
  const { issuerDid, holderDid, verifierDid } = await getAllServiceDIDs(config);

  // Step 1: Issue credential
  const credentialResponse = await fetch(`${config.issuerUrl}/credentials/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      credentialSubject: {
        id: holderDid,
        name: 'Test User',
        age: 25,
      },
      type: ['VerifiableCredential', 'DriversLicense'],
    }),
  });

  if (!credentialResponse.ok) {
    throw new Error('Failed to issue credential');
  }

  const { credential } = await credentialResponse.json();

  // Step 2: Store credential
  const storeResponse = await fetch(`${config.holderUrl}/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  if (!storeResponse.ok) {
    throw new Error('Failed to store credential');
  }

  // Step 3: Verify credential
  const verifyResponse = await fetch(`${config.verifierUrl}/verify/credential`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  if (!verifyResponse.ok) {
    throw new Error('Failed to verify credential');
  }

  const verifyResult = await verifyResponse.json();

  return {
    credential,
    verifyResult,
    issuerDid,
    holderDid,
    verifierDid,
  };
}

