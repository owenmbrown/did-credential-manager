# MetaMask Snap RPC Usage Guide

## `create-did`
This method generates a new Decentralized Identifier (DID) of type `did:ethr` by creating a new Ethereum wallet. It stores the new DID (in the form of the wallet's address and private key) in the Snap's secure storage for future use. A dialog is displayed confirming the creation of the DID.

Note: This method is restricted to the companion app only.

### Usage
**companion app**
```ts
await invokeSnap({
    method: 'create-did'
});
```

### Response
Returns the address of the newly created DID.
```json
{
    "success": true,
    "did": "0x1234567890abcdef1234567890abcdef12345678"
}
```
Can fail if the user rejects the dialogue
```json
{
    "success": false,
    "message": "user rejected dialogue"
}
```

## `get-did`
This method retrieves the `did:ethr` stored in the Snap’s secure storage. If no DID has been created or stored yet, it returns a failure message.

### Usage
**companion app**
```ts
const result = await invokeSnap({
    method: 'get-did'
});
console.log(result.did);
```

**web app**
```ts
await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
        snapId: SNAP_ID,
        request: {
        method: 'get-did',
        },
    },
});
```

### Response
Returns the DID address
```json
{
    "success": true,
    "did": "0x1234567890abcdef1234567890abcdef12345678"
}
```
Can fail if the did isn't stored
```json
{
    "success": false,
    "message": "no did is stored"
}
```

## `store-vc`
This method stores a Verifiable Credential (VC) associated with the current DID in Snap's secure storage. The VC is passed as a parameter and is associated with the DID. If no DID is found in the storage, the method will display an alert informing the user that no DID exists.
### Usage
**companion app**
```ts
await invokeSnap({
    method: 'store-vc',
    params: {
        vc: "your-verifiable-credential",
        type: "credential-type",
        defaultName: "credential name"
    }
});
```

**web app**
```ts
await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
        snapId: SNAP_ID,
        request: {
            method: 'store-vc',
            params: {
                vc: "your-verifiable-credential",
                type: "credential-type",
                defaultName: "credential name"
            }
        },
    },
});

```
### Response
Returns success:
```json
{
  "success": true,
}
```
Can fail if required parameters are missing:
```json
{
  "success": false,
  "message": "missing params: [vc, type, defaultName]"
}
```
Can fail if no DID is stored:
```json
{
  "success": false,
  "message": "no did is stored"
}
```

## `get-vp`
This method generates a Verifiable Presentation (VP) by signing the stored Verifiable Credential (VC) with the DID’s private key. The method takes a `challenge` as a parameter and creates a VP containing the VC and the provided challenge. If the challenge is missing or no VC is stored in the Snap, an alert is shown to the user.

### Usage
**companion app**
```ts
await invokeSnap({
    method: 'get-vp',
    params: {
        challenge: "unique-challenge-string",
        validTypes: ["credential-type"]
    }
});
```

**web app**
```ts
await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
        snapId: SNAP_ID,
        request: {
            method: 'get-vp',
            params: {
                challenge: "unique-challenge-string",
                validTypes: ["credential-type"]
            }
        },
    },
});
```

### Response
Returns the signed JWT representing the Verifiable Presentation.
```json
{
    "success": true,
    "vp": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2cCI6eyJjYXRhbCI6Imh0dHBzOi8vZGVzY3JpcH..."
}
```
Can fail if the challenge or required valid types are missing, or if no VC is stored:
```json
{
    "success": false,
    "message": "missing params: [challenge, validTypes]"
}
```
Can fail if no DID is stored:
```json
{
    "success": false,
    "message": "no did is stored"
}
```

## `manage-vcs`
This method allows the user to manage their stored Verifiable Credentials (VCs), including editing, deleting, or recovering them. The user can interact with a list of credentials and perform actions such as editing the credential name or deleting a credential. The method also supports recovering deleted credentials.

Note: This method is restricted to the companion app only.

### Usage
**companion app**
```ts
await invokeSnap({
    method: 'manage-vcs'
});
```

### Response
Returns a success message when the management process is complete.
```json
{
    "success": true
}
```
Can fail if no DID is stored:
```json
{
    "success": false,
    "message": "no did is stored"
}
```
Can fail if the user rejects the dialog
```json
{
    "success": false,
    "message": "user rejected dialogue"
}
```

## `get-all-vc`
This method retrieves all Verifiable Credentials (VCs) stored in the Snap’s secure storage. It returns a list of credentials associated with the stored DID.

Note: This method is restricted to the companion app only.

### Usage
**companion app**
```ts
await invokeSnap({
    method: 'get-all-vc'
});
```

### Response
Returns a list of credentials.
```json
{
    "success": true
    "credentials": [
        {
        "vc": "credential-data",
        "name": "credential-name",
        "uuid": "credential-uuid",
        "type": "credential-type",
        "claim": "claim-data",
        "issuer": "issuer-info",
        "subject": "subject-info",
        "claimString": "claim-string"
        }
    ]
}
```
Can fail if no DID is stored:
```json
{
    "success": false,
    "message": "no did is stored"
}

```