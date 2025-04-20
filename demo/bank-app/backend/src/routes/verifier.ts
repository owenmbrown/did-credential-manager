import express, { Request, Response } from 'express';
import { verifyCredential, verifyPresentation} from 'did-jwt-vc';
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import * as dotenv from 'dotenv';
import { ChallengeManager } from '../challenge-manager.ts';

dotenv.config();
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
if (!INFURA_PROJECT_ID) throw new Error("INFURA_PROJECT_ID not set in .env");

/**
 * Configures a DID resolver using Infura and `ethr-did`.
 */
const resolver = new Resolver({
    ...getEthrResolver({ infuraProjectId: INFURA_PROJECT_ID }),
});

/**
 * Singleton used to manage challenge strings for preventing VP replay attacks.
 */
const challengeManager = new ChallengeManager();

const router = express.Router();

/**
 * POST /verifier/verify-vc
 *
 * Verifies a single Verifiable Credential (VC) JWT.
 *
 * @deprecated Use `/verifier/verify-vp` instead for verifying both the VC and its associated Verifiable Presentation (VP).
 *
 * @requestBody { vc: string } - The VC JWT to verify.
 * @response { verified: boolean, payload?: any } - Returns verification result and decoded payload.
 */
export const verifyVC =async (req: Request, res: Response) => {
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
};
router.post("/verify-vc", verifyVC);

/**
 * GET /verifier/generate-challenge
 *
 * Generates a one-time-use challenge string for Verifiable Presentations.
 * The challenge is stored temporarily and expires after 60 seconds.
 *
 * @response { challenge: string } - A unique challenge string to be included in the VP.
 */
export const generateChallenge = async (_req: Request, res: Response) => {
    try {
      const challenge = challengeManager.createChallenge();
      res.json({ challenge });
    } catch (error) {
      res.status(400).json({ error: "Failed to generate challenge" });
    }
};
router.get("/generate-challenge", generateChallenge);

/**
 * POST /verifier/verify-vp
 *
 * Verifies a Verifiable Presentation (VP) along with the enclosed Verifiable Credential (VC).
 * Enforces holder binding (subject of VC must match issuer of VP) and challenge freshness to prevent replay attacks.
 *
 * @requestBody { vp: string } - The Verifiable Presentation JWT to verify.
 * @response { verified: boolean, error?: string, ...vcPayload } - Returns verification status and parsed VC data if valid.
 */
export const verifyVP = async (req : Request, res: Response) => { 
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
};
router.post('/verify-vp', verifyVP);

export default router;
