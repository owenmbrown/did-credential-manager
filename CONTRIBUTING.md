# Contributing to DID Credential Snap

This project provides a MetaMask Snap for managing decentralized identifiers (DIDs) and verifiable credentials. Below are guidelines to help you get started.

---

## Project Structure

### Snap (Core)
`/snap/packages/snap` -> MetaMask Snap core logic\
`/snap/packages/site` -> MetaMask Snap companion app (for interacting with the snap)

### Demo
Example apps that show how a real-world issuer and verifier might use this Snap.

#### DMV App (Issuer)
`/demo/dmv-app` -> Full-stack demo for an issuer (DMV)\
`/demo/dmv-app/frontend` -> Frontend interface for DMV\
`/demo/dmv-app/backend` -> Backend service to issue credentials

#### Bank App (Verfier)
`/demo/bank-app` -> Full-stack demo for a verifier (bank)\
`/demo/bank-app/frontend` -> Frontend interface for bank\
`/demo/bank-app/backend` -> Backend service to verify credentials

### Development Utilities
Tools/scripts that support development or were used during research.

`/dev/presentation-creation` -> Script to generate a Verifiable Presentation\
`/dev/register-did-ethr` -> Script to interact with EthrDIDRegistry for key updates\
`/dev/veramo-test` -> Veramo-based test for VC creation/resolution (exploratory)\
`/dev/wallet-setup` -> Credential manager UI using Identify Snap (research artifact)

### Testing

`/tests` -> Unit and integration tests

## Getting Started

### Clone Repo
    ```bash
    git clone https://github.com/Nathan-Andrews/Capstone-Kyndryl-project.git
    cd Capstone-Kyndryl-project
    ```

### Install Dependencies

#### Option A. Use the Setup Scripts *(easiest)*
```bash
./setup.sh
./run-all.sh
```

#### Option B. Manual Setup:
*if you want to have control over your keys, or want to only use certain parts of the project*
- **Snap**
    1. Install dependencies
        ```bash
        cd snap       # installs dependencies and sets up the environment
        yarn install  # runs snap + demo frontend + backend apps
        ```
    2. Add `.env` to `snap/packages/snap/`
        ```
        INFURA_PROJECT_ID="..."
        COMPANION_APP_ORIGIN="http://localhost:8000"
        ```
    3. Start the snap
        ```
        cd snap
        yarn start
        ```
- **DMV Demo App**
    1. Add `.env` to `demo/dmv-app/backend`
        ```
        WALLET_PRIVATE_KEY="your_wallet_key"
        INFURA_PROJECT_ID="your_infura_project_id"
        ```
    2. Run frontend
        ```bash
        cd demo/dmv-app/frontend
        npm install
        npm run dev
        ```
    3. Run backend
        ```bash
        cd demo/dmv-app/backend
        npm install
        npm start
        ```

- **Bank Demo App**
    1. Add `.env` to `demo/bank-app/backend`
        ```
        WALLET_PRIVATE_KEY="your_wallet_key"
        INFURA_PROJECT_ID="your_infura_project_id"
        ```
    2. Run frontend
        ```bash
        cd demo/bank-app/frontend
        npm install
        npm run dev
        ```
    3. Run backend
        ```bash
        cd demo/bank-app/backend
        npm install
        npm start
        ```

## Calling RPC Methods
You can test Snap methods using wallet_invokeSnap. See [RPC Examples](snap/packages/snap/rpc-examples.md) for sample calls.

Example:
```ts
await window.ethereum.request({
  method: 'wallet_invokeSnap',
  params: {
    snapId: 'local:http://localhost:8080',
    request: {
      method: 'create-did',
    },
  },
});
```