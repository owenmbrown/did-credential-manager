# DID Credential Manager
**Texas A&M University**\
**Computer Science**\
**Senior Capstone Project - Fall 2025**

**Developed by**: Owen Brown, Joshua Lass, Micah Mei, Jone Zhu\
**In Collaboration with**: [Kyndryl](https://www.kyndryl.com/)

---

## Overview

A decentralized identity (DID) credential management system demonstrating issuance, holding, and verification of verifiable credentials using DID:peer and DIDComm v2.

## Quick Start

```bash
# Start all services
npm run docker

# Or with docker-compose directly
docker-compose up --build
```

Services will be available at:
- **Issuer**: http://localhost:5001
- **Verifier**: http://localhost:5002
- **Holder**: http://localhost:5003

**Docker Commands:**
```bash
npm run docker:up      # Start services in background
npm run docker:logs    # View logs
npm run docker:down    # Stop services
npm run docker:ps      # Check status
npm run test:docker    # Run automated tests
```
