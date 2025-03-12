# Capstone-Kyndryl-project

# Issuer
Creates and signs Verifiable Credentials (VCs). Stores DID documents in MongoDB (for now). Provides VCs to users.
## Running
1. [Install](https://www.mongodb.com/docs/manual/installation/) and run mongodb locally.  Or run it on [Atlas](https://www.mongodb.com/cloud/atlas/register) (or similar) and update the mongo uri
2. Go to the isssuer/backend directory
3. Install packages `npm install`
4. Run with nodemon `npx nodemon`
## Endpoints
 * POST `localhost:5000/issuer/register-did`
     - Creates a new DID & store it in MongoDB
     - Returns a the did document
       ```
       {
           "did": "did:ethr:0x5678...",
           "privateKey": "SOME_PRIVATE_KEY"
       }
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

# Registering a did:ethr
Any ethereum wallet that wants to issue verifiable credentials needs to register as a did:ethr on the ethrDidRegistry on the blockchain.  This is so that the did of the issuer can be resolved
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
8. You only need to register once
9. Now this ethereum wallet can be used as an issuer for verifiable credentials
