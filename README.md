# DID:ethr Credential Manager
**Texas A&M University**\
**Computer Science**\
**Senior Capstone Project - Spring 2025**

**Developed by**: [Nathan Andrews](https://github.com/Nathan-Andrews), [Adin Tyger](https://github.com/AdinTyger), [Lance Hinton](https://github.com/hinton-lance), [Caleb Austin](https://github.com/EpicExplode).\
**In Collaboration with**: [Kyndryl](https://www.kyndryl.com/)

DID:ethr Credential Manager is a [MetaMask Snap](https://metamask.io/snaps) that enables users to create and manage `did:ethr` identities and verifiable credentials.  
This repository also includes two real-world demo applications that showcase how issuers and verifiers can interact with this Snap.

## About
DID:ethr Credential Manager empowers users to take control of their digital identity using decentralized identifiers and verifiable credentials, while keeping sensitive data secure inside the MetaMask Snap environment.

The Snap enables users to:
- Create a new `did:ethr` or import an existing one via the companion app.
- Receive [Verifiable Credentials](https://en.wikipedia.org/wiki/Verifiable_credentials) (VCs) from trusted issuers, such as a DMV.
- Securely store those credentials inside the Snap with user consent.
- Present credentials to verifiers (e.g., a bank) when requested — securely via Verifiable Presentations.

This repository includes:
- The MetaMask Snap for identity and credential management.
- A **DMV demo app** (issuer role).
- A **Bank demo app** (verifier role).

---

## Justification
This project demonstrates how decentralized identity (DID) systems can return control of personal data to individuals, while still meeting the trust and verification requirements of real-world digital services.

We aim to:
- Explore how Ethereum can serve as a foundation for **self-sovereign identity**.
- Align our implementation with **data privacy standards** like the [GDPR](https://gdpr.eu/), giving users the right to consent, view, and control their personal information.
- Showcase the potential of Verifiable Credentials to streamline secure, privacy-respecting digital interactions.

We chose:
- **Ethereum**, for its mature infrastructure and the existing `EthrDIDRegistry` smart contract standard.
- **MetaMask Flask**, for its trusted wallet interface and Snap extensibility — ideal for users already interested in digital sovereignty.


## Getting Started

### Clone Repo
  ```bash
  git clone https://github.com/Nathan-Andrews/Capstone-Kyndryl-project.git
  cd Capstone-Kyndryl-project
  ```
### Install Dependencies
```bash
./setup.sh
```

### Run
```bash
./run-all.sh
```

### More
More detailed setup info can be found [here](CONTRIBUTING.md#getting-started)

## API
The demo issuer and verifier provide some endpoints

### `POST localhost:5000/issuer/issue-vc`
Issues a Verifiable Credential (VC) with a claim about a subject
#### Usage
```
{
 "subjectDid": "did:ethr:0x5678...",
 "claim": { "age": 25 }
}
```
#### Response
```
{
 "vc": "eyJhbGciOiJI..."
}
```


### `GET localhost:5001/verifier/generate-challenge`
Generated a challenge string, for the user to include in the verifiable presentation.  Each challenge expires after a minute, and can only be used once, so this prevents replay attacks.
#### Response
```json
{
  "challenge": "PAdd2emrfP9AImxelCtfTJgGVQW6IckF9Wtf7cpo7HI"
}
```

### `POST localhost:5001/verifier/verify-vp`
Verify a verifiable presentation (VP), and verify the verifiable credential (VC) inside.
#### Usage
```json
{
  "vp": "eyJhbGciOiJI..."
}
```
####
Returns success:
```json
{
  "success": true,
}
```


More details on the API can be found at
  - [Issuer Documentation](demo/dmv-app/backend/docs/)
  - [Verifier Documentation](demo/bank-app/backend/docs/)

## RPC Methods
You can run Snap methods using wallet_invokeSnap. See [RPC Examples](snap/packages/snap/rpc-examples.md) for sample calls.

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

# Registering a did:ethr
This is for testing interacting with the [ethr-did-registry](github.com/uport-project/ethr-did-registry).  Since all ethereum addresses are already identifiers without needing to register, this isn't nessisary for using the other endpoints.
## Using
1. Create an ethereum wallet in metamask, or use an existing wallet.
2. Add at least 0.001 eth (1-3 usd) to that wallet (mininum needed to use faucet)
3. Use a sepola faucet like [alchemy](https://www.alchemy.com/faucets/ethereum-sepolia) to add testnet funds to your wallet
4. Go to the `register-did-ethr` directory in the project
5. Setting the enviroment variables
   1. Create `.env` file
   2. Fill .env
         ```
          WALLET_PRIVATE_KEY="your_wallet_key"
          INFURA_PROJECT_ID="your_infura_project_id"
   3. Get your wallet key from metamask (or other provider like coinbase)
   4. Get your infura project id from the infura provider link `https://sepolia.infura.io/v3/your_infura_project_id`
6. Register your did:ethr `npm start -- -r` (you need funds on the testnet for this)
7. Verify that your did is registered correctly `npm start -- -v`
