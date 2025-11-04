/**
 * Test Setup
 * 
 * Global setup for Jest tests including crypto polyfill for Node.js
 */

import { webcrypto } from 'node:crypto';

// Polyfill crypto for tests
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}

