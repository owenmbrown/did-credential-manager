import express, { Request, Response } from 'express';
import jwt from "jsonwebtoken";
import DidDocument from "../models/DidDocument";
import { ethers } from "ethers";

const router = express.Router();

router.get("/test", (req : Request, res : Response) => {
    res.send("Hello world!")
});

// Create a new DID & store it in MongoDB
router.post("/register-did", async (req : Request, res : Response) => {
    const wallet = ethers.Wallet.createRandom();  // Generate a random Ethereum key
    const did = `did:ethr:${wallet.address}`;
    
    const newDid = new DidDocument({
        did,
        publicKey: wallet.publicKey
    });

    await newDid.save();
    res.json({ did, privateKey: wallet.privateKey }); // Private key should be stored securely
});

// Issue a Verifiable Credential (VC)
router.post("/issue-vc", async (req : Request, res : Response) => {
    const { subjectDid, claim } = req.body;
    
    // Sign a JWT VC
    const vcPayload = {
        iss: "did:ethr:0x1A628DaEA6d6057c29F3c75a0AAab3D7Dd0121E2",
        sub: subjectDid,
        vc: { type: ["VerifiableCredential"], credentialSubject: claim }
    };

    const privateKey = "0x7273e2122b20711c900115e9d2de01bc3d80b57191b4977137646329b615eee5"; // Temporary stored key (an actual secure key shouldn't be stored in plaintext)
    const token = jwt.sign(vcPayload, privateKey, { algorithm: "HS256" });

    res.json({ vc: token });
});

export default router;
