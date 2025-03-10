import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import issuerRoutes from "./routes/issuer.ts";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/did-vc", {}).then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Routes
app.use("/issuer", issuerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
