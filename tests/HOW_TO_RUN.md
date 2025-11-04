# Quick Start: Running Tests

## Step-by-Step Instructions

### 1. Navigate to Project Root
```bash
cd /Users/faqiangmei/Desktop/Kyndryl/Cursor_project/did-credential-manager
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build Common Package
```bash
npm run build:common
```

### 4. Start Docker Services
```bash
# Build and start all services
npm run docker:up

# Or use docker-compose directly
docker-compose up -d
```

### 5. Wait for Services to be Healthy
```bash
# Check service status
npm run docker:ps

# Or check health endpoints manually
curl http://localhost:5001/health
curl http://localhost:5002/health
curl http://localhost:5003/health
```

Wait about 30-60 seconds for all services to start.

### 6. Run E2E Tests
```bash
# Run E2E tests from project root
npm run test:e2e

# Or run from tests directory
cd tests
npm run test:e2e
```

### 7. Verify Tests Pass
You should see output like:
```
✓ Issuer is healthy
✓ Holder is healthy
✓ Verifier is healthy
PASS  e2e/toolkit-samples.test.ts
  Toolkit Samples E2E Tests
    Publish → Submit → Validate Flow
      ✓ Step 1: Issuer publishes/issues a credential
      ✓ Step 2: Holder submits/stores the credential
      ✓ Step 3: Verifier validates the credential
      ✓ Step 4: Holder creates and sends presentation
      ✓ Step 5: Verifier validates presentation
    Interop Tests
      ✓ Should handle OOB invitation flow for credential offer
      ✓ Should handle OOB invitation flow for presentation request
      ✓ Should verify service health endpoints

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

## Alternative: One-Command Test Run

From project root:
```bash
# Install, build, start services, and run tests
npm run bootstrap && npm run docker:up && sleep 30 && npm run test:e2e
```

## Troubleshooting

### Services Not Starting
```bash
# Check logs
npm run docker:logs

# Or for specific service
docker-compose logs issuer
docker-compose logs holder
docker-compose logs verifier
```

### Tests Failing
```bash
# Check if services are actually running
curl http://localhost:5001/health
curl http://localhost:5002/health
curl http://localhost:5003/health

# Should return JSON with status: "healthy"
```

### Clean Restart
```bash
# Stop and remove everything
npm run docker:down

# Clean build
npm run docker:rebuild

# Start again
npm run docker:up
```

## Running All Tests

```bash
# All test types
npm run test

# Just E2E (what we care about)
npm run test:e2e

# Integration tests
npm run test:integration

# Unit tests
npm run test:unit
```

