# Capstone-Kyndryl-project

# Issuer
Creates and signs Verifiable Credentials (VCs). Stores DID documents in MongoDB (for now). Provides VCs to users.
## Running
1. Go to the isssuer/backend directory
2. Install packages `npm install`
3. Run with nodemon `npx nodemon`
4. Use endpoints
    * POST `localhost:5000/issuer/register-did`
        - Creates a new DID & store it in MongoDB
        - Returns a the did document
          ```
          {
              "did": "did:ethr:0x5678...",
              "privateKey": "SOME_PRIVATE_KEY"
          }
    * POST localhost:5000/issuer/issue-vc
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
  
# User
Stores the issued VC in MetaMask via snap.

# App (Verifier)
Requests the user's VC and verifies it.
Resolves the user's DID using MongoDB (later replace with Ethereum).

# Database (MongoDB)
Temporarily stores DID documents.
Allows easy transition to Ethereum by keeping the same DID resolution interface.

# Transition to Ethereum
When the Ethereum node is ready, update verifier to use veramo to resolve DID documents from the EthrDIDRegistry contract instead of MongoDB.
Update the Issuer to register DIDs on-chain instead of storing them in MongoDB.
