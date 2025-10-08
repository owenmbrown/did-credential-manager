# @did-edu/common

Shared utilities and DIDComm v2.1 implementation for the DID Education Toolkit.

## Features

- **did:peer** - Generation and resolution for did:peer:2 and did:peer:4
- **DIDComm v2.1** - Message packing, unpacking, routing, and forwarding
- **Protocols** - Out-of-Band, Issue Credential, Present Proof implementations
- **Utilities** - Shared types, logger, error handling

## Installation

```bash
npm install
npm run build
```

## Usage

```typescript
import { DIDComm, generateDid } from '@did-edu/common';

// Generate a did:peer
const { did, secrets } = await generateDid(routingDid);

// Create DIDComm agent
const agent = new DIDComm(did, secrets);

// Send a message
await agent.sendMessage(recipientDid, message);
```

## Development

```bash
npm run dev      # Watch mode
npm run test     # Run tests
npm run build    # Build for production
```

## Documentation

See [main documentation](../docs/) for complete API reference and tutorials.

