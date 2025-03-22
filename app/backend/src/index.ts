import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import verifierRoutes from "./routes/verifier.ts";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Routes
app.use("/verifier", verifierRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
