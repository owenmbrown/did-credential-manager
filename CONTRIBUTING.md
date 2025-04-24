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
`/dev/identify-snap` -> Credential manager UI using Identify Snap (research artifact)

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
- **Database**
```bash
sudo apt install mysql-server       # Linux
sudo service mysql start            # Linux

brew install mysql                  # macOS
brew services start mysql           # macOS

# Login and create DB
mysql -u root -p
> CREATE DATABASE demo;
> exit;

cd demo/bank-app/frontend
mysql -u root -p demo < ./populate-bank.sql
```

- **Environment**
```bash
./setup.sh    # installs dependencies and sets up the environment
./run-all.sh  # runs snap + demo frontend + backend apps
```

#### Option B. Manual Setup:
*if you want to have control over your keys, or want to only use certain parts of the project*
- **Snap**
    1. Install dependencies
        ```bash
        cd snap
        yarn install
        ```
    2. Add `.env` to `snap/packages/snap/`
        ```
        INFURA_PROJECT_ID="your_infura_project_id"
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
    1. Setup Database
        ```bash
        sudo apt install mysql-server       # Linux
        sudo service mysql start            # Linux

        brew install mysql                  # macOS
        brew services start mysql           # macOS

        # Login and create DB
        mysql -u root -p
        > CREATE DATABASE demo;
        > exit;

        # populate database with sample data
        cd demo/bank-app/frontend
        mysql -u root -p demo < ./populate-bank.sql
        ```
    2. Add `.env` to `demo/bank-app/backend`
        ```
        WALLET_PRIVATE_KEY="your_wallet_key"
        INFURA_PROJECT_ID="your_infura_project_id"
        ```
    3. Add `.env` to `demo/bank-app/frontend`
        ```
        DB_HOST="127.0.0.1"
        DB_PORT="3306"                  # optional.  Defaults to 3306
        DB_USER="root"
        DB_PASSWORD="your_db_password"  # optional
        DB_NAME="demo"
        ```
    4. Run frontend
        ```bash
        cd demo/bank-app/frontend
        npm install
        npm run dev
        ```
    5. Run backend
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

## Running Tests
add info about tests


## Coding Style
- Use **TypeScript** for all files.
- Add **JSDoc/TypeDoc annotations** to all exported functions, types, and classes.
- Design **UI components using Snap-compatible primitives** like `<Box>`, `<Text>`, `<Button>`, etc.
- Restrict **Snap methods to the companion app only** whenever possible (`origin` check).
- Always provide **explicit user consent prompts** for any action involving sensitive identity or data.
- Keep **sensitive logic and data isolated within the Snap** runtime and UI — avoid exposing it to external sites.
- Handle personal data in accordance with **[GDPR principles](https://gdpr-info.eu/)**, including:
  - Data minimization
  - Right to access and erasure
  - Explicit consent for processing


## Documentation
- [Snap API](snap/packages/snap/docs/)
- [Snap Companion App](snap/packages/site/docs/)
- [DMV App Frontend](demo/dmv-app/frontend/docs/)
- [DMV App Backend](demo/dmv-app/backend/docs/)
- [Bank App Frontend](demo/bank-app/frontend/docs/)
- [Bank App Backend](demo/bank-app/backend/docs/)

You can read the documentation by opening any `docs/index.html` in your browser

Regeneate developer documentation
```bash
npx typedoc
```
Outputs documentation to `/docs`


## Future Direction
- Export/import identity features are currently stubbed for security reasons.
- See `snapExportIdentity()` and `snapImportIdentity()` for notes on future implementation.
- Improve the snap companion app to be more user 
