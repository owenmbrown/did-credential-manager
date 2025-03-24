import express, { Request, Response } from 'express';
import { verifyCredential, verifyPresentation} from 'did-jwt-vc';
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import * as dotenv from 'dotenv';
import { ChallengeManager } from '../challenge-manager.ts';

dotenv.config();
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
if (!INFURA_PROJECT_ID) throw new Error("INFURA_PROJECT_ID not set in .env");

// Configure DID Resolver for `did:ethr`
const resolver = new Resolver({
    ...getEthrResolver({ infuraProjectId: INFURA_PROJECT_ID }),
});

const challengeManager = new ChallengeManager();

const router = express.Router();

// verify a Verifiable Credential
// depreciated: use /verify-vp
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

router.get("/generate-challenge", async (req: Request, res: Response) => {
    try {
        const challenge = challengeManager.createChallenge()
        
        res.json({ challenge });
    } catch (error) {
        res.status(400);
    }
});

// verify a verifiable presentation as well as the verifiable credential inside
// returns the decoded VC in the response body
router.post('/verify-vp', async (req : Request, res: Response) => { 
    try {
        const { vp } = req.body;
        // verify if the verifiable presentation is valid
        const vpPayload = await verifyPresentation(vp, resolver);

        // return error if the verification failed
        if (!vpPayload.verified) {
            res.status(400).json({ verified: false, error: "VP verification failed" });
            return
        }

        // the credential holder issues the VP
        // this should match with the subject in the VC
        const vpIssuerDID = vpPayload.payload.iss;
        
        // challenge string included in the VP
        const challenge = vpPayload.payload.vp.challenge;
        
        // check if the challenge in the payload matches a live challenge
        // this is to prevent replay attacks
        if (!challengeManager.verifyChallenge(challenge)) {
            res.status(400).json({ verified: false, error: "expired or incorrect challenge in presentation" });
            return
        }
        
        // get the vc from the payload
        const vc = vpPayload.payload.vp.verifiableCredential[0];

        // verify if the verifiable credential is valid
        const vcPayload = await verifyCredential(vc, resolver);

        // return error if the verification failed
        if (!vcPayload.verified) {
            res.status(400).json({ verified: false, error: "VC verification failed" });
            return
        }

        // check if the subject of the credential, and the issuer of the presentation match
        // makes sure the holder controls the DID that the credential is about
        const vcSubjectDID = vcPayload.payload.subject;
        if (vcSubjectDID != vpIssuerDID) {
            res.status(400).json({ verified: false, error: `did:ethr of credential subject and presentation issuer don't match. vc subject:${vcSubjectDID} != vp issuer ${vpIssuerDID}` });
            return
        }
        
        // TODO check if vc issuer is in trusted list
        const vcIssuerDID = vcPayload.issuer;

        res.json(vcPayload)
    } catch (error) {
        // some error occured
        console.log(error);
        res.status(400).json({ verified: false, error: error });
    }
})

export default router;
