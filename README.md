# Capstone-Kyndryl-project

# Issuer
Creates and signs Verifiable Credentials (VCs). Stores DID documents in MongoDB (for now). Provides VCs to users.
## Running
1. Go to the isssuer/backend directory
2. Install packages `npm install`
3. Run with nodemon `npx nodemon`
## Endpoints
 * POST `localhost:5000/issuer/issue-vc`
     -  Issue a Verifiable Credential (VC)
     -  Include subject's did and the claim that is being made about them in the request body
         ```
         {
           "subjectDid": "did:ethr:0x5678...",
           "claim": { "age": 25 }
         }
     -  Returns the VC payload in the response body
         ```
         {
           "vc": "eyJhbGciOiJI..."
         }
  
# MetaMask Snap RPC Methods
This MetaMask Snap provides several RPC methods that interact with a decentralized identity (DID) and verifiable credentials (VC):

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
  "did": "0x1234567890abcdef1234567890abcdef12345678"
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
Returns the DID address if available, otherwise returns an empty string.
```
{
  "did": "0x1234567890abcdef1234567890abcdef12345678"
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
  "vp": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2cCI6eyJjYXRhbCI6Imh0dHBzOi8vZGVzY3JpcH..."} 
}
```


# App (Verifier)
Requests the user's VC and verifies it.
Resolves the user's DID using ethereum did registry.
## Backend
 * POST localhost:5001/verifier/verify-vc
      - Depriciated: use `verifier/verify-vp` instead
      - Verify a verifiable credential
      - Include the verifiable credential in the request body
          ```
          {
            "vc": "eyJhbGciOiJI..."
          } 
      - Verifies the credendial, and returns the data
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
             "didResolutionResult": {
                 "didDocumentMetadata": {},
                 "didResolutionMetadata": {
                     "contentType": "application/did+json"
                 },
                 "didDocument": {
                     "id": "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3",
                     "verificationMethod": [
                         {
                             "id": "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3#controller",
                             "type": "EcdsaSecp256k1RecoveryMethod2020",
                             "controller": "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3",
                             "blockchainAccountId": "eip155:1:0xfe4568038759b739D6ebE05a03453b6c989D71e3"
                         }
                     ],
                     "authentication": [
                         "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3#controller"
                     ],
                     "assertionMethod": [
                         "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3#controller"
                     ]
                 }
             },
             "issuer": "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3",
             "signer": {
                 "id": "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3#controller",
                 "type": "EcdsaSecp256k1RecoveryMethod2020",
                 "controller": "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3",
                 "blockchainAccountId": "eip155:1:0xfe4568038759b739D6ebE05a03453b6c989D71e3"
             },
             "jwt": "eyJhbGciOiJFUzI1NkstUiIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImFnZSI6MjV9fSwic3ViamVjdCI6ImRpZDpldGhyOjB4ZmU0NTY4MDM4NzU5YjczOUQ2ZWJFMDVhMDM0NTNiNmM5ODlENzFlMyIsIm5iZiI6MTc0MTgyOTAyMSwiaXNzIjoiZGlkOmV0aHI6MHhmZTQ1NjgwMzg3NTliNzM5RDZlYkUwNWEwMzQ1M2I2Yzk4OUQ3MWUzIn0.ENIG65J_gAbbWoH7qgqwjT6hs5Fe1teITAmYr1Fs_fc66jQZlQ4a6RyDVX37hFgMEpS5ZV8vzA_e92QwU1H6BQA",
             "policies": {},
             "verifiableCredential": {
                 "subject": "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3",
                 "credentialSubject": {
                     "age": 25
                 },
                 "issuer": {
                     "id": "did:ethr:0xfe4568038759b739D6ebE05a03453b6c989D71e3"
                 },
                 "type": [
                     "VerifiableCredential"
                 ],
                 "@context": [
                     "https://www.w3.org/2018/credentials/v1"
                 ],
                 "issuanceDate": "2025-03-13T01:23:41.000Z",
                 "proof": {
                     "type": "JwtProof2020",
                     "jwt": "eyJhbGciOiJFUzI1NkstUiIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImFnZSI6MjV9fSwic3ViamVjdCI6ImRpZDpldGhyOjB4ZmU0NTY4MDM4NzU5YjczOUQ2ZWJFMDVhMDM0NTNiNmM5ODlENzFlMyIsIm5iZiI6MTc0MTgyOTAyMSwiaXNzIjoiZGlkOmV0aHI6MHhmZTQ1NjgwMzg3NTliNzM5RDZlYkUwNWEwMzQ1M2I2Yzk4OUQ3MWUzIn0.ENIG65J_gAbbWoH7qgqwjT6hs5Fe1teITAmYr1Fs_fc66jQZlQ4a6RyDVX37hFgMEpS5ZV8vzA_e92QwU1H6BQA"
                 }
             }
         }
     } 

* GET localhost:5001/verifier/generate-challenge
     - Generated a challenge string, for the user to include in the verifiable presentation.
     - Each challenge expires after a minute, and can only be used once, so this prevents replay attacks.
     - Returns the challenge in the response body
     ```
     {
         "challenge": "PAdd2emrfP9AImxelCtfTJgGVQW6IckF9Wtf7cpo7HI"
     }

* POST localhost:5001/verifier/verify-vp
     - Verify a verifiable presentation (VP), and verify the verifiable credential (VC) inside.
     - Include the verifiable presentation in the request body
          ```
          {
            "vp": "eyJhbGciOiJI..."
          } 
     - Will return an error the challange is incorrect or expired
     - Will return an error if the issuer of the VP and the subject of the VC don't match
     - Will return an error if either the VP or the VC is invalid
       ```
       {
            "verified": false,
            "error": "..."
       }
               
     - If successful, will return the VC contained in the VP
       ```
       {
            "verified": true,
            "payload": {
                 ...
            }
       }

# Registering a did:ethr
This is for testing storage on the [ethr-did-registry](github.com/uport-project/ethr-did-registry).  Since all ethereum addresses are already identifiers without needing to register, this isn't nessisary for using the other endpoints.
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
   5. Warning: It's important to never commit these keys github
6. Register your did:ethr `npm start -- -r` (you need funds on the testnet for this)
7. Verify that your did is registered correctly `npm start -- -v`
