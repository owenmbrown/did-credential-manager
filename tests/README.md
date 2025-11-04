# CI/CD Test Suite

This directory contains the E2E and interop test suite for the DID Credential Manager toolkit.

## Test Structure

- **`e2e/`** - End-to-end tests covering the complete toolkit sample flows
- **`integration/`** - Integration tests for component interactions
- **`unit/`** - Unit tests for individual components
- **`helpers/`** - Test utilities and fixtures

## Running Tests

### Prerequisites

1. All services must be running (via Docker or locally):
   ```bash
   npm run docker:up
   ```

2. Services should be accessible at:
   - Issuer: http://localhost:5001
   - Holder: http://localhost:5003
   - Verifier: http://localhost:5002

### Run All Tests

```bash
npm run test
```

### Run Specific Test Suites

```bash
# E2E tests only
npm run test:e2e

# Integration tests only
npm run test:integration

# Unit tests only
npm run test:unit
```

## Test Coverage

### Toolkit Samples Flow (Publish → Submit → Validate)

The E2E tests verify the complete toolkit sample flow:

1. **Publish**: Issuer creates and issues a credential
2. **Submit**: Holder receives and stores the credential
3. **Validate**: Verifier validates the credential and presentation

### Interop Tests

- OOB invitation flows (credential offers and presentation requests)
- Service health checks
- DID resolution and communication

### DID On-Chain Registration

Tests for DID registration on-chain using:
- Alchemy provider
- Infura provider

**Note**: Requires API keys set as environment variables:
- `ALCHEMY_API_KEY` for Alchemy
- `INFURA_PROJECT_ID` for Infura
- `NETWORK` (optional, defaults to 'sepolia')

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. **Lint & Type Check**: Ensures code quality
2. **Build**: Compiles all packages
3. **E2E Tests**: Runs toolkit samples flow tests
4. **Interop Tests**: Verifies compatibility across services

### CI Environment Variables

The CI workflow uses GitHub Secrets for:
- `ALCHEMY_API_KEY` - Alchemy API key for on-chain tests
- `INFURA_PROJECT_ID` - Infura project ID for on-chain tests
- `NETWORK` - Blockchain network (default: 'sepolia')

## Test Configuration

See `jest.config.js` for test configuration:
- Test timeout: 60 seconds (for E2E tests)
- Module resolution: Supports ES modules
- Coverage thresholds: 60% minimum

## Troubleshooting

### Services Not Starting

If services fail to start in CI:
1. Check Docker logs: `docker-compose logs`
2. Verify service health endpoints are accessible
3. Ensure ports are not already in use

### Tests Timing Out

- Increase timeout in `jest.config.js`
- Check service health before running tests
- Verify network connectivity between services

### On-Chain Tests Skipped

If DID on-chain tests are skipped:
- Ensure API keys are set in environment variables
- Check network configuration (sepolia, goerli, mainnet)
- Verify API key permissions

