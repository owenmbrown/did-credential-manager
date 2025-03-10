import express, { Request, Response } from 'express';
import jwt from "jsonwebtoken";
import DidDocument from "../models/DidDocument";

const router = express.Router();

router.get("/test", (req : Request, res : Response) => {
    res.send("Hello world!")
});

// 🔹 Verify the Verifiable Credential
router.post("/verify-vc", async (req : Request, res : Response) => {
    try {
        const { vc } = req.body;

        console.log(vc);

        if (!vc) {
            res.status(400).json({ error: "Missing verifiable credential" });
            return;
        }

        
        // Decode VC (without verification)
        const decoded = jwt.decode(vc, { complete: true }) as any;
        console.log(decoded);
        if (!decoded) {
            res.status(400).json({ error: "Invalid VC" });
            return;
        }

        const issuerDid = decoded.payload.iss;
        console.log(issuerDid);

        // // Resolve DID from MongoDB
        const didDocument = await DidDocument.findOne({ did: issuerDid });
        if (!didDocument) {
            res.status(404).json({ error: "DID not found" });
            return;
        }

        console.log(didDocument);
        console.log(decoded.payload.vc)

        console.log(1);

        // // Verify VC signature
        jwt.verify(vc, didDocument.publicKey, { algorithms: ["HS256"] });

        console.log(2)
        
        res.json({ valid: true });
    } catch (error) {
        console.log(error)
        res.status(400).json({ error: "VC verification failed" });
    }
});

export default router;
