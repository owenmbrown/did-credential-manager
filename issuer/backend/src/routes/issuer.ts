import express, { Request, Response } from 'express';
import jwt from "jsonwebtoken";
import DidDocument from "../models/DidDocument";
import { ethers } from "ethers";

const router = express.Router();

router.get("/test", (req : Request, res : Response) => {
    res.send("Hello world!")
});

// 🔹 Create a new DID & store it in MongoDB
router.post("/register-did", async (req : Request, res : Response) => {
    const wallet = ethers.Wallet.createRandom();  // Generate a random Ethereum key
    const did = `did:ethr:${wallet.address}`;
    
    const newDid = new DidDocument({
        did,
        publicKey: wallet.publicKey
    });

    await newDid.save();
    res.json({ did, privateKey: wallet.privateKey }); // ⚠️ Private key should be stored securely
});

// 🔹 Issue a Verifiable Credential (VC)
router.post("/issue-vc", async (req : Request, res : Response) => {
    const { subjectDid, claim } = req.body;
    
    // Sign a JWT VC
    const vcPayload = {
        iss: "did:ethr:0xee83c802aA839F5B8340aE0158D3120f2bb5B311",
        sub: subjectDid,
        vc: { type: ["VerifiableCredential"], credentialSubject: claim }
    };

    const privateKey = "0xb4b19e0c664f7186a908d7339f33c37e3224bc08ede4a3b532dd2f2f5a76ff97"; // Temporary stored key (an actual secure key shouldn't be stored in plaintext)
    const token = jwt.sign(vcPayload, privateKey, { algorithm: "HS256" });

    res.json({ vc: token });
});

export default router;
