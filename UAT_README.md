# User Acceptance Testing (UAT) Guide

## Overview

This guide will help you test the DID Credential Manager system from start to finish. The system demonstrates decentralized identity management with three main components:

- **Issuer (DMV):** Issues driver's license credentials
- **Holder (Wallet):** Stores and manages credentials
- **Verifier (SecureBank):** Requests and verifies credentials for account opening

## Quick Links

### Web Interfaces (After Setup)

- Issuer (DMV): http://localhost:5171
- Holder Wallet: http://localhost:5173
- Verifier (SecureBank): http://localhost:5172

### Backend APIs (After Setup)

- Issuer API: http://localhost:5001
- Holder API: http://localhost:5003
- Verifier API: http://localhost:5002

## Testing Documentation

Complete the guides in this order:

### 1. Setup Guide

**File:** `UAT_SETUP.md`

**Purpose:** Get all services running with Docker

**Duration:** 10-15 minutes (including Docker image download)

**What you'll do:**
- Install prerequisites (Docker Desktop)
- Start all services using docker-compose
- Verify all services are running and healthy
- Learn useful Docker commands for managing services

**Start here:** [UAT_SETUP.md](./UAT_SETUP.md)

---

### 2. End-to-End Flow Guide

**File:** `UAT_END_TO_END_FLOW.md`

**Purpose:** Test complete credential issuance and verification workflow

**Duration:** 15-20 minutes

**What you'll do:**
- Create a driver's license application at the DMV (Issuer)
- Accept and store the credential in your wallet (Holder)
- Request identity verification for bank account opening (Verifier)
- Present your credential to the bank (Holder)
- Verify the credential and complete identity check (Verifier)

**Prerequisites:**
- Complete UAT_SETUP.md first
- All services must be running

**Start here:** [UAT_END_TO_END_FLOW.md](./UAT_END_TO_END_FLOW.md)

---

## Testing Checklist

Use this checklist to track your progress:

- [ ] Prerequisites installed (Docker Desktop)
- [ ] All services started successfully
- [ ] All health checks passing
- [ ] All web interfaces accessible
- [ ] Driver's license application created
- [ ] Credential offer generated
- [ ] Credential accepted in wallet
- [ ] Credential stored and visible
- [ ] Verification request created
- [ ] Presentation sent to verifier
- [ ] Verification successful
- [ ] All steps documented

## Expected Time Investment

- **First-time setup:** 10-15 minutes
- **End-to-end flow:** 15-20 minutes
- **Additional testing scenarios:** 10-30 minutes
- **Total:** 35-65 minutes

## What You'll Learn

By completing this UAT, you will understand:

1. **Decentralized Identity (DID)**
   - How DIDs work without central authorities
   - Peer-to-peer identity verification
   - Self-sovereign identity principles

2. **Verifiable Credentials**
   - How credentials are issued and signed
   - How credentials are stored securely
   - How credentials can be presented selectively

3. **DIDComm Protocol**
   - Encrypted peer-to-peer messaging
   - Out-of-Band (OOB) invitations
   - Issue-credential protocol flow
   - Present-proof protocol flow

4. **Cryptographic Verification**
   - Digital signatures
   - Multi-party verification
   - Tamper-evident credentials

## Troubleshooting Quick Reference

### Services Won't Start

```bash
# Check Docker is running
docker --version

# View logs
npm run docker:logs

# Restart services
npm run docker:restart
```

### Cannot Access Web Interfaces

1. Verify services are healthy: `docker-compose ps`
2. Check health endpoints:
   - http://localhost:5001/health
   - http://localhost:5003/health
   - http://localhost:5002/health
3. Clear browser cache
4. Try a different browser

### Invitation URLs Not Working

1. Ensure you copied the entire URL (they are very long)
2. Check for extra spaces at the beginning or end
3. Verify the issuer/verifier service is running
4. Try generating a new invitation

### Credential Not Appearing

1. Check holder service logs: `docker-compose logs holder`
2. Refresh the browser page
3. Verify the credential was accepted successfully
4. Check the Credentials tab in the holder wallet

## Clean Up After Testing

When you're done testing:

```bash
# Stop all services
npm run docker:down

# Remove all data (optional)
npm run docker:clean
```

## Support and Additional Resources

### Documentation

- **Technical Details:** See `docs/full_msg_flow.md` for detailed protocol documentation
- **API Documentation:** See `docs/api/` for API specifications
- **Architecture:** See `docs/architecture/` for system design

### Common Issues

- Port conflicts: Ensure ports 5001-5003 and 5171-5173 are available
- Docker out of space: Run `docker system prune -a`
- Services unhealthy: Wait 60-90 seconds after starting
- Browser issues: Try incognito/private mode

### Getting Help

If you encounter issues:

1. Review the troubleshooting sections in both guides
2. Check Docker logs: `npm run docker:logs`
3. Verify all prerequisites are installed correctly
4. Try restarting Docker Desktop
5. Create an issue with log details

## Testing Scenarios

After completing the basic end-to-end flow, try these scenarios:

### Scenario 1: Multiple Credentials
- Create multiple credential offers with different data
- Store multiple credentials in the wallet
- Present different credentials to different verifiers

### Scenario 2: Selective Disclosure
- Request only specific fields in the presentation request
- Verify that only requested fields are shared
- Check that other fields remain private

### Scenario 3: Different Credential Types
- Modify the credential type in the issuer
- Create different types of credentials
- Test verification with different credential types

### Scenario 4: Error Handling
- Try processing an expired invitation
- Test with invalid credential data
- Verify error messages are clear and helpful

## Success Criteria

Your UAT is successful if:

- All services start and show healthy status
- DMV can issue driver's license credentials
- Wallet can receive and store credentials
- Bank can request identity verification
- Wallet can present credentials to the bank
- Bank can verify credentials successfully
- No central authority was involved in the process
- All verification checks pass

## Next Steps

After completing the UAT:

1. Review the technical documentation for deeper understanding
2. Explore the codebase to see implementation details
3. Try modifying credential schemas
4. Experiment with different use cases
5. Consider integration scenarios for your use case

---

**Ready to begin?** Start with [UAT_SETUP.md](./UAT_SETUP.md)

