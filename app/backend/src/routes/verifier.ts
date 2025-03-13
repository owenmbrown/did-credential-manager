import express, { Request, Response } from 'express';
import { verifyCredential } from 'did-jwt-vc';
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import * as dotenv from 'dotenv';

dotenv.config();
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
if (!INFURA_PROJECT_ID) throw new Error("INFURA_PROJECT_ID not set in .env");

// Configure DID Resolver for `did:ethr`
const resolver = new Resolver({
    ...getEthrResolver({ infuraProjectId: INFURA_PROJECT_ID }),
});

const router = express.Router();

// Verify a Verifiable Credential
router.post("/verify-vc", async (req: Request, res: Response) => {
    try {
        const { vc } = req.body;

        if (!vc || typeof vc !== "string") {
            res.status(400).json({ error: "Missing or invalid VC JWT" });
            return
        }

        // Verify the VC JWT
        const verificationResult = await verifyCredential(vc, resolver);

        res.json({ verified: true, payload: verificationResult });
    } catch (error) {
        res.status(400).json({ verified: false, error: error });
    }
});

export default router;
