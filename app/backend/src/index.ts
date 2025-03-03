import express, { Request, Response } from 'express';
import { ethers } from "ethers";
    
const app = express();
const port = 3000;

const INFURA_PROJECT_ID = "d365a39bb25847f6ab40bfe84608371c";
const NETWORK = "sepolia";

// Connect to Ethereum network via Infura
const provider = new ethers.JsonRpcProvider(`https://${NETWORK}.infura.io/v3/${INFURA_PROJECT_ID}`);

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

app.get('/testInfura', async (req: Request, res: Response) => {
    try {
        // Get latest block number
        const blockNumber = await provider.getBlockNumber();
        res.send(`✅ Connected! Latest block: ${blockNumber}`);
    } catch (error) {
        res.send(`❌ Infura connection failed: ${error}`);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
