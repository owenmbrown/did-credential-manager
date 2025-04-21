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