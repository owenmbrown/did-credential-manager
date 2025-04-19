import express, { Request, Response } from 'express';
import { createVerifiableCredentialJwt, CredentialPayload, Issuer } from 'did-jwt-vc';
import { EthrDID } from 'ethr-did';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';


dotenv.config();
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
if (INFURA_PROJECT_ID == undefined) throw new Error("INFURA_PROJECT_ID not set in .env")
if (WALLET_PRIVATE_KEY == undefined) throw new Error("WALLET_PRIVATE_KEY not set in .env")

const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);

// Create an EthrDID object for the issuer
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
const issuerDid = new EthrDID({ identifier: wallet.address, privateKey: WALLET_PRIVATE_KEY }) as Issuer;

const router = express.Router();

router.get("/test", (req : Request, res : Response) => {
    res.send("Hello world!")
});

// Issue a Verifiable Credential (VC)
router.post("/issue-vc", async (req : Request, res : Response) => {
    const { subjectDid, claim } = req.body;

    // Validate inputs
    if (!subjectDid || typeof subjectDid !== "string" || !subjectDid.startsWith("did:ethr:")) {
        res.status(400).json({ error: "Invalid subject DID" });
        return;
    }

    if (!claim || typeof claim !== "object" || Object.keys(claim).length === 0) {
        res.status(400).json({ error: "Claim must be a non-empty object" });
        return
    }

    
    const vcPayload: CredentialPayload = {
        issuer: `did:ethr:${wallet.address}`,  // Issuer DID
        subject: subjectDid,  // The subject's DID
        issuanceDate: new Date().toISOString(), // Required field
        '@context':['https://www.w3.org/2018/credentials/v1'], // Required field
        type: ["VerifiableCredential"],
        credentialSubject: claim,
    };

    const vcJwt = await createVerifiableCredentialJwt(vcPayload, issuerDid);

    res.json({ vc: vcJwt });
});

export default router;
