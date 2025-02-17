import { useState } from "react";

function App() {
    const [account, setAccount] = useState("");

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

    return (
        <div>
            <button onClick={getAccount}>Enable Ethereum</button>
            <h2>Account: <span>{account}</span></h2>
        </div>
    );
}

export default App;