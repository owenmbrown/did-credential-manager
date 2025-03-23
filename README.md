# Capstone-Kyndryl-project

# Issuer
Creates and signs Verifiable Credentials (VCs).
## Running
1. Go to the isssuer/backend directory
2. Install packages `npm install`
3. Run with nodemon `npx nodemon`
## Endpoints
## `POST localhost:5000/issuer/issue-vc`
Issues a Verifiable Credential (VC) with a claim about a subject
### Usage
```
{
 "subjectDid": "did:ethr:0x5678...",
 "claim": { "age": 25 }
}
```
### Response
```
{
 "vc": "eyJhbGciOiJI..."
}
```

# MetaMask Snap RPC Methods
This MetaMask Snap provides several RPC methods that interact with a decentralized identity (DID) and verifiable credentials (VC):

## Running
### Running snap & example frontend
This will start the snap and the example frontend implementation to interact with it
1. `cd snap`
2. `yarn start`
### Running snap
This will start just the snap
1. `cd snap/packages/snap`
2. `yarn start`

## `create-did`
This method generates a new Decentralized Identifier (DID) of type `did:ethr` by creating a new Ethereum wallet. It stores the new DID (in the form of the wallet's address and private key) in the Snap's secure storage for future use. A dialog is displayed confirming the creation of the DID.
### Usage
```
await invokeSnap({
  method: 'create-did'
});
```
### Response
Returns the address of the newly created DID.
```
{
  "success": true,
  "did": "0x1234567890abcdef1234567890abcdef12345678"
}
```
Can fail if the user rejects the dialogue
```
{
  "success": false,
  "message": "some message about the failure"
 }
```

## `get-did`
This method retrieves the `did:ethr` stored in Snap’s secure storage. If no DID has been created or stored yet, it returns an empty string
### Usage
```
const result = await invokeSnap({
  method: 'get-did'
});
console.log(result.did);
```
### Response
Returns the DID address
```
{
  "success": true,
  "did": "0x1234567890abcdef1234567890abcdef12345678"
}
```
Can fail if the did isn't stored
```
{
  "success": false,
  "message": "some message about the failure"
 }
```

## `store-vc`
This method stores a Verifiable Credential (VC) associated with the current DID in Snap's secure storage. The VC is passed as a parameter and is associated with the DID. If no DID is found in the storage, the method will display an alert informing the user that no DID exists. A confirmation dialog is shown upon successfully storing the VC.
### Usage
```
await invokeSnap({
  method: 'store-vc',
  params: { vc: "your-verifiable-credential" }
});
```
### Response
Doesn't return anything.

## `get-vp`
This method generates a Verifiable Presentation (VP) by signing the stored Verifiable Credential (VC) with the DID’s private key. The method takes a `challenge` as a parameter and creates a VP containing the VC and the provided challenge. If the challenge is missing or no VC is stored in the Snap, an alert is shown to the user.
### Usage
```
await invokeSnap({
  method: 'get-vp',
  params: { challenge: "unique-challenge-string" }
});
```
### Response
Returns the signed JWT representing the Verifiable Presentation. If any issue occurs (e.g., missing challenge or missing VC), an alert is shown.
```
{
  "success": true,
  "vp": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2cCI6eyJjYXRhbCI6Imh0dHBzOi8vZGVzY3JpcH..."} 
}
```
Can fail if the user rejects the dialogue, or if no challenge is included, or if the vc isn't stored
```
{
  "success": false,
  "message": "some message about the failure"
 }
```


# App (Verifier)
Requests the user's VC and verifies it.
Resolves the user's DID using ethereum did registry.
## Backend
## `POST localhost:5001/verifier/verify-vc`
Depriciated: use `verifier/verify-vp` instead

Verifies a verifiable credential
### Usage
```
{
  "vc": "eyJhbGciOiJI..."
}
```
### Response
If verification succeeds
```
{
    "verified": true,
    "payload": {
        "verified": true,
        "payload": {
            "vc": {
                "@context": [
                    "https://www.w3.org/2018/credentials/v1"
                ],
                "type": [
                    "VerifiableCredential"
                ],
                "credentialSubject": {
                    "age": 25
                }
            },
            "subject": "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3",
            "nbf": 1741829021,
            "iss": "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3"
        },
        .......
     }
}
```
If verification fails
```
{
     "verified": false,
     "error": "some error

}
```

## `GET localhost:5001/verifier/generate-challenge`
Generated a challenge string, for the user to include in the verifiable presentation.  Each challenge expires after a minute, and can only be used once, so this prevents replay attacks.
### Usage
### Response
```
{
    "challenge": "PAdd2emrfP9AImxelCtfTJgGVQW6IckF9Wtf7cpo7HI"
}
```

## `POST localhost:5001/verifier/verify-vp`
Verify a verifiable presentation (VP), and verify the verifiable credential (VC) inside.
### Usage
```
{
  "vp": "eyJhbGciOiJI..."
}
```
### Response
Will return an error the challange is incorrect or expired
Will return an error if the issuer of the VP and the subject of the VC don't match
Will return an error if either the VP or the VC is invalid
```
{
  "verified": false,
  "error": "..."
}
```
If successful, will return the VC contained in the VP
```
{
  "verified": true,
  "payload": {
       ...
  }
}
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
