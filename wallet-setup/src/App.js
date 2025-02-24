import { useState } from "react";

// https://docs.tuum.tech/identify

function App() {
    const [account, setAccount] = useState("");
    const [dateOfBirth,setDateOfBirth] = useState("");

    const snapId = `npm:@hashgraph/hedera-identify-snap`

    async function getAccount() {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            setAccount(accounts[0]);
        } catch (err) {
            if (err.code === 4001) {
                console.log("Please connect to MetaMask.");
            } else {
                console.error(err);
            }
        }
    }

    async function isMetamaskInstalled() {
        return typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
    }

    async function connect() {
        console.log("snap id", snapId);
        const isMetamaskDetected = await isMetamaskInstalled();
        if (!isMetamaskDetected ) {
          console.error(
            "You need to install Metamask for this demo to work. You can install it at https://metamask.io"
          );
          alert(
            "You need to install Metamask for this demo to work. You can install it at https://metamask.io"
          );
        }
      
        let snaps = await window.ethereum.request({
          method: "wallet_getSnaps"
        });
        console.log("Installed snaps...", snaps);
        try {
          if (!(snapId in snaps)) {
            console.log("Identify Snap is not yet installed. Installing now...");
            const result = await window.ethereum.request({
              method: "wallet_requestSnaps",
              params: {
                [snapId]: {}
              }
            });
            console.log("result: ", result);
            snaps = await window.ethereum.request({
              method: "wallet_getSnaps"
            });
          }
        } catch (e) {
          console.log(
            `Failed to obtain installed snap: ${JSON.stringify(e, null, 4)}`
          );
          alert(`Failed to obtain installed snap: ${JSON.stringify(e, null, 4)}`);
        }
      
        if (snapId in snaps) {
          console.log("Connected successfully!");
          alert("Connected successfully!");
        } else {
          console.log("Could not connect successfully. Please try again!");
          alert("Could not connect successfully. Please try again!");
        }
    }
      

    const handleHelloAPIRequest = async () => {
        await window.ethereum.request({
            method: 'wallet_invokeSnap',
            params: {
                snapId,
                request: {
                    method: 'hello',
                    params: {}
                }
            }
        })
    }

    const handleSendHelloClick = async () => {
        try {
            await handleHelloAPIRequest();
        } catch (e) {
            console.error(e);
        }
    }

    const options = { store: ['snap'] };

const handleCreateVC = async () => {
    try {
        if (!account) throw new Error("MetaMask account not found.");

        const params = {
            metamaskAddress: account,
            vcKey: 'profile',
            vcValue: { dateOfBirth },
            credTypes: ['DOBCredential'],
            options
        };

        await window.ethereum.request({
            method: 'wallet_invokeSnap',
            params: { snapId, request: { method: 'createVC', params } }
        });

        console.log("VC created successfully.");
    } catch (error) {
        console.error("Error creating VC:", error);
    }
};

const handleGetVCs = async () => {
    try {
        if (!account) throw new Error("MetaMask account not found.");

        const params = { metamaskAddress: account, filter: undefined, options };

        const result = await window.ethereum.request({
            method: 'wallet_invokeSnap',
            params: { snapId, request: { method: 'getVCs', params } }
        });

        console.log("Retrieved VCs:", result);
        return result;
    } catch (error) {
        console.error("Error fetching VCs:", error);
        return null;
    }
};

const handleDeleteAllVCs = async () => {
    try {
        if (!account) throw new Error("MetaMask account not found.");

        const params = { metamaskAddress: account, filter: undefined, options };

        const result = await window.ethereum.request({
            method: 'wallet_invokeSnap',
            params: { snapId, request: { method: 'deleteAllVCs', params } }
        });

        console.log("All VCs deleted:", result);
        return result;
    } catch (error) {
        console.error("Error deleting VCs:", error);
        return null;
    }
};


    return (
        <div>
            <button onClick={getAccount}>Enable Ethereum</button>
            <h2>Account: <span>{account}</span></h2>
            <button onClick={connect}>Connect</button>
            <button onClick={handleSendHelloClick}>Hello test identify snap</button>

            <p>Enter your date of birth: </p>
            <input type="text" placeholder="Your Date of Birth" onChange={e => {setDateOfBirth(e.target.value)}}/>
            <button onClick={() => handleCreateVC()}>Create Verifiable Credential</button>
            <button onClick={() => handleDeleteAllVCs()}>Delete All Verifiable Credentials</button>

            <p>Get stored VCs from metamask</p>
            <button onClick={() => handleGetVCs()}>Get VCs</button>
        </div>
    );
}

export default App;