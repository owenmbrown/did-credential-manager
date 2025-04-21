import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import issuerRoutes from "./routes/issuer.ts";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Routes
app.use("/issuer", issuerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
