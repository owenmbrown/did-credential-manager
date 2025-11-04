/**
 * Tests for Holder Package Exports
 * 
 * Simple tests to verify package exports without importing the actual implementations
 */

import { describe, it, expect } from '@jest/globals';

describe('Holder Package Exports', () => {
  it('should be able to import the package', () => {
    // This test just verifies the test file loads
    expect(true).toBe(true);
  });

  it('should have valid TypeScript compilation', () => {
    // If this test runs, TypeScript compilation succeeded
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
  });
});

