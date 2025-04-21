import { createVerifiablePresentationJwt, JwtPresentationPayload, Issuer } from 'did-jwt-vc';
import { EthrDID } from 'ethr-did';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

import { verifyPresentation } from 'did-jwt-vc'
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';

dotenv.config();
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
if (INFURA_PROJECT_ID == undefined) throw new Error("INFURA_PROJECT_ID not set in .env")
if (WALLET_PRIVATE_KEY == undefined) throw new Error("WALLET_PRIVATE_KEY not set in .env")

const resolver = new Resolver({
    ...getEthrResolver({ infuraProjectId: INFURA_PROJECT_ID }),
});

const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);

// Create an EthrDID object for the issuer
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
const holderDid = new EthrDID({ identifier: wallet.address, privateKey: WALLET_PRIVATE_KEY }) as Issuer;

const verifiableCredential = "eyJhbGciOiJFUzI1NkstUiIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImFnZSI6MjV9fSwic3ViamVjdCI6ImRpZDpldGhyOjB4ZmU0NTY4MDM4NzU5YjczOUQ2ZWJFMDVhMDM0NTNiNmM5ODlENzFlMyIsIm5iZiI6MTc0MjQyNDcyMywiaXNzIjoiZGlkOmV0aHI6MHhmZTQ1NjgwMzg3NTliNzM5RDZlYkUwNWEwMzQ1M2I2Yzk4OUQ3MWUzIn0.dko-li1KduwZ2FUPP4wqb3WDCB6nefgKny8WtwXp8rB6sK4xXHd2pGJCjGvrbFT2yaVEMjw-DMrJUf9xW7sFBAA"
  
  // Create a function to sign the presentation using the holder's private key
async function createSignedPresentation(vc: string, challenge: string) {

    // Create the Verifiable Presentation payload (this is where you define the claim you want to prove)
    const presentationPayload: JwtPresentationPayload = {
        vp: {
            '@context':['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiablePresentation'],
            verifiableCredential: [vc],
            challenge
        }
    };
  
    // Sign the presentation with the holder's private key
    const signedPresentationJwt = await createVerifiablePresentationJwt(
      presentationPayload,
      holderDid
    );
  
    return signedPresentationJwt;
}
  
// Example usage
async function main() {
    await fetch('http://localhost:5001/verifier/generate-challenge').then(response => response.json())
    .then(async data => {
        const challenge = data.challenge;

        const signedPresentation = await createSignedPresentation(verifiableCredential, challenge);
        console.log("Signed Verifiable Presentation:", signedPresentation);

        console.log()

        const vpPayload = await verifyPresentation(signedPresentation, resolver)
        console.log("Payload:", vpPayload)
    });
}

main().catch((error) => console.error("Error creating signed presentation:", error));
