# Managing a did:ethr
This is for testing interacting with the [ethr-did-registry](github.com/uport-project/ethr-did-registry).  Since all ethereum addresses are already identifiers without needing to register, this isn't nessisary for creating credentials.
## Using
1. Create an ethereum wallet in metamask, or use an existing wallet.
2. Add at least 0.001 eth (1-3 usd) to that wallet (mininum needed to use faucet)
3. Use a sepola faucet like [alchemy](https://www.alchemy.com/faucets/ethereum-sepolia) to add testnet funds to your wallet
4. Go to the `register-did-ethr` directory in the project
5. Setting the enviroment variables
   1. Create `.env` file
   2. Fill .env
         ```
          WALLET_PRIVATE_KEY="your_wallet_key"
          INFURA_PROJECT_ID="your_infura_project_id"
   3. Get your wallet key from metamask (or other provider like coinbase)
   4. Get your infura project id from the infura provider link `https://sepolia.infura.io/v3/your_infura_project_id`
6. Test changing ownership of a did with `npm start -- -r` (you need funds on the testnet for this)
7. Verify that your did is registered correctly `npm start -- -v`
