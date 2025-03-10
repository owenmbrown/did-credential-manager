import mongoose from "mongoose";

const DidDocumentSchema = new mongoose.Schema({
    did: { type: String, unique: true, required: true },
    publicKey: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("DidDocument", DidDocumentSchema);
