import { ethers } from "ethers";
import * as dotenv from 'dotenv';

dotenv.config();
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
if (INFURA_PROJECT_ID == undefined) throw new Error("INFURA_PROJECT_ID not set in .env")
if (WALLET_PRIVATE_KEY == undefined) throw new Error("WALLET_PRIVATE_KEY not set in .env")

const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

const ethrDIDRegistryABI = [
    "function identityOwner(address identity) view returns (address)",
    "function changeOwner(address identity, address newOwner) public"
];

// const registryAddress = "0xdca7ef03e98e0dc2b855be647c39abe984fcf21b"; // mainnet registry address
const registryAddress = "0x03d5003bf0e79C5F5223588F347ebA39AfbC3818"; // sepolia testnet registry addresss
const registryContract = new ethers.Contract(registryAddress, ethrDIDRegistryABI, wallet);

const args = process.argv.slice(2);

if (args.includes("-r")) {
    (async () => {
        try {
            const myAddress = await wallet.getAddress();
            const newOwner = myAddress;
    
            console.log(`Registering DID for: did:ethr:${myAddress}`);
    
            const tx = await registryContract.changeOwner(myAddress, newOwner);
            console.log("Transaction sent, waiting for confirmation...");
    
            await tx.wait();
            console.log(`DID registered! Transaction Hash: ${tx.hash}`);
        } catch (error) {
            console.error("Error registering DID:", error);
        }
    })();
}
else if (args.includes("-v")) {
    (async () => {
        try {
            const myAddress = await wallet.getAddress();
            const owner = await registryContract.identityOwner(myAddress);
            console.log(`Current owner of DID did:ethr:${myAddress} is ${owner}`);

            if (myAddress == owner) {
                console.log("verification successful")
            }
            else {
                console.log("verification failed")
            }
        }
        catch {
            console.log("verification failed")
        }
    })();
}
else {
    console.log("Incorrect arguments:")
    console.log(" > npm start -- -r")
    console.log("    Registers your wallet address as a did:ethr identifier in the ethrDidRegistry")
    console.log("    You need testnet funds in you wallet to do this (see readme for details)")
    console.log(" > npm start -- -v")
    console.log("    Checks if your did:ethr is in the registry")
}

