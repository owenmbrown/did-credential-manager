import express, { Request, Response } from 'express';
import { createVerifiableCredentialJwt, CredentialPayload, Issuer } from 'did-jwt-vc';
import { EthrDID } from 'ethr-did';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';


dotenv.config();

// Load environment variables
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

let latestVC: string | null = null;

if (INFURA_PROJECT_ID == undefined) throw new Error("INFURA_PROJECT_ID not set in .env");
if (WALLET_PRIVATE_KEY == undefined) throw new Error("WALLET_PRIVATE_KEY not set in .env");

    
// Initialize Ethereum provider and wallet
const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

// Create a DID-based issuer from the wallet
const issuerDid = new EthrDID({ identifier: wallet.address, privateKey: WALLET_PRIVATE_KEY }) as Issuer;

const router = express.Router();

/**
 * GET issuer/test
 *
 * Simple test route to confirm the backend is running.
 */
export const test =  (req : Request, res : Response) => {
    res.send("Hello world!")
};
router.get("/test", test);

/**
 * POST issuer/issue-vc
 *
 * Issues a Verifiable Credential (VC) signed by the server's DID.
 *
 * Request body:
 * - subjectDid: string — the DID of the credential subject
 * - claim: object — the claims to embed in the credential
 *
 * Response:
 * - vc: string — the signed Verifiable Credential JWT
 */
export const issueVC = async (req : Request, res : Response) => {
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
};
router.post("/issue-vc", issueVC);


/**
 * POST issuer/issue-vc-test
 *
 * Issues a Verifiable Credential (VC) signed by the server's DID. stores in a temporary variable to be accessed later by the client.
 *
 * Request body:
 * - subjectDid: string — the DID of the credential subject
 * - claim: object — the claims to embed in the credential
 *
 * Response:
 * - 
 */
export const issueVCTest = async (req : Request, res : Response) => {
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
    latestVC = vcJwt; // Store the VC in a temporary variable
    res.json({ vc: vcJwt });
    
};
router.post("/issue-vc-test", issueVCTest);

/**
 * POST issuer/set-latest-vc
 *
 * Used for testing purposes to set the latest VC in a temporary variable
 *
 * Response:
 * - vc: string — the latest Verifiable Credential JWT
 */
export const setLatestVC = (req: Request, res: Response) => {
    const { vc } = req.body;
    if (!vc || typeof vc !== "string") {
        res.status(400).json({ error: "Invalid VC" });
        return;
    }
    latestVC = vc;
    res.json({ message: "Latest VC set successfully" });
};
router.post("/set-latest-vc", setLatestVC);

export const getLatestVC = (req: Request, res: Response) => {
    if (!latestVC) {
        res.status(404).json({ error: "No VC available yet" });
        return;
    }

    res.json({ vc: latestVC });
};

router.get("/latest-vc", getLatestVC);



export default router;
