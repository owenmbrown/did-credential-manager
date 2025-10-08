# @did-edu/holder

Standalone holder agent with local key management for storing and presenting Verifiable Credentials.

## Features

- **Veramo Agent** - Full credential holder with local KMS
- **SQLite Storage** - Secure credential storage
- **Present Proof 3.0** - DIDComm protocol implementation
- **CLI & Web UI** - Both interfaces available

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## CLI Commands

```bash
# List credentials
holder list

# Accept credential offer
holder accept <offer-url>

# Create presentation
holder present --credential <id> --challenge <challenge>
```

## Web UI

Access at `http://localhost:5001` to:
- View stored credentials
- Accept credential offers
- Create presentations
- View DIDComm messages

## Configuration

Create a `.env` file:

```env
PORT=5001
DB_PATH=./holder-data/credentials.sqlite
KMS_SECRET=<your-secret-key>
```

## Documentation

See [API documentation](../docs/api/holder.md) for complete reference.

