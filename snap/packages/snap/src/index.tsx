import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { Box, Text, Bold, Heading } from '@metamask/snaps-sdk/jsx';

import { createVerifiablePresentationJwt, JwtPresentationPayload, Issuer } from 'did-jwt-vc';
import { EthrDID } from 'ethr-did';
import { ethers, hexlify, toUtf8Bytes, toUtf8String, verifyMessage } from 'ethers';

type PassMessageParams = {
    message: string; // Message parameter
}

type StoreVCParams = {
    vc: string
}

type GetVPParams = {
    challenge: string
}

type StorageContents = {
    did: {
        privateKey : string,
        address: string,
        vc: string
    }
}

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

// async function signMessage(message : string) {
//     try {
//         // Convert message to hex if needed
//         const messageHex = hexlify(toUtf8Bytes(message));
        
//         // Request accounts first to get the user's address
//         // const accounts = await ethereum.request({
//         //     method: 'eth_requestAccounts',
//         // }) as string[];
//         // const address = accounts[0];
//         const address = "0xfe4568038759b739D6ebE05a03453b6c989D71e3";
        
//         // Sign the message
//         const signature = await ethereum.request({
//             method: 'personal_sign',
//             params: [messageHex, address],
//         });
        
//         return { signature, address };
//     } catch (error) {
//         console.error('Error signing message:', error);
//         throw error;
//     }
// }
  

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
    origin,
    request,
}) => {
    switch (request.method) {
        case 'hello':
            return snap.request({
                method: 'snap_dialog',
                params: {
                type: 'confirmation',
                content: (
                    <Box>
                    <Text>
                        Hello, <Bold>{origin}</Bold>!
                    </Text>
                    <Text>
                        This custom confirmation is just for display purposes.
                    </Text>
                    <Text>
                        But you can edit the snap source code to make it do something,
                        if you want to!
                    </Text>
                    </Box>
                ),
                },
            });
        case 'create-did': // creates a new did:ethr and stores it in snap storage
            // ask user for consent
            const result = await snap.request({
                method: 'snap_dialog',
                params: {
                type: 'confirmation',
                content: (
                    <Box>
                        <Heading>Would you like to create a new did:ethr?</Heading>
                        <Text>This identity can be used to create and store verifiable credentials.</Text>
                        <Text>Warning: This will overwrite any previous dids that have been stored</Text>
                    </Box>
                ),
                },
            }); 
            // return if user rejects prompt
            if (result === false) {
                return {
                    success: false,
                    did: ""
                }
            }

            // create a new did:ethr
            const wallet = ethers.Wallet.createRandom();
    
            // Extract keys and address
            const privateKey = wallet.privateKey;
            // const publicKey = wallet.publicKey;
            const address = wallet.address;

            // Update the state storage to include
            await snap.request({
                method: "snap_manageState",
                params: {
                operation: "update",
                newState: { 
                    did: {
                        privateKey,
                        address,
                        vc: ""
                    }
                },
                },
            });

            // show a success dialogue
            await snap.request({
                method: 'snap_dialog',
                params: {
                type: 'alert',
                content: (
                    <Box>
                        <Heading>Created a new identifier</Heading>
                        <Text>
                            <Bold>did:ethr:{address}</Bold>
                        </Text>
                    </Box>
                ),
                },
            }); 

            return {
                success: true,
                did: address
            }
        case 'get-did': {
            // returns the stored did:ethr if it exists

            // get current state of snap secure storage
            const persistedData = await snap.request({
                method: "snap_manageState",
                params: { operation: "get" },
            })

            if (persistedData == null || persistedData == undefined) {
                // if there is no data in storage, return failure
                return {
                    success: false,
                    did:""
                }
            }
            else {
                // return the did:ethr address
                return {
                    success: true,
                    did: (persistedData as StorageContents).did.address
                }
            }
        }
        case 'store-vc': {
            const params = request.params as StoreVCParams;

            const persistedData = await snap.request({
                method: "snap_manageState",
                params: { operation: "get" },
            })

            if (persistedData == null || persistedData == undefined) {
                return snap.request({
                    method: 'snap_dialog',
                    params: {
                    type: 'alert',
                    content: (
                        <Box>
                            <Text>
                                <Bold>Credential store failed.  No did:ethr found</Bold>
                            </Text>
                        </Box>
                    ),
                    },
                }); 
            }

            const updatedStorage = persistedData as StorageContents;

            // update the VC in the object
            updatedStorage.did.vc = params.vc
            
            // store the VC in secure storage
            await snap.request({
                method: "snap_manageState",
                params: {
                operation: "update",
                newState: updatedStorage,
                },
            })

            // TODO actually confirm success

            // display a confirmation alert
            return snap.request({
                method: 'snap_dialog',
                params: {
                type: 'alert',
                content: (
                    <Box>
                        <Text>
                            <Bold>Credential store successfully</Bold>
                        </Text>
                    </Box>
                ),
                },
            }); 
        }
        case 'get-vp': {
            // read the paramaters of the rpc request to get the challenge
            const params = request.params as GetVPParams;
            const challenge = params.challenge;
            // check if the challenge was actually set
            if (challenge == null || challenge == undefined) {
                return snap.request({
                    method: 'snap_dialog',
                    params: {
                    type: 'alert',
                    content: (
                        <Box>
                            <Text>
                                <Bold>No challenge was provided in rpc request</Bold>
                            </Text>
                        </Box>
                    ),
                    },
                }); 
            }
            
            // get current state of snap secure storage
            const persistedData = await snap.request({
                method: "snap_manageState",
                params: { operation: "get" },
            })
            
            // verify data is formatted correctly
            if (persistedData == null || persistedData == undefined || (persistedData as StorageContents).did.vc == "") {
                return snap.request({
                    method: 'snap_dialog',
                    params: {
                    type: 'alert',
                    content: (
                        <Box>
                            <Text>
                                <Bold>Could not find any credentials stored in your wallet</Bold>
                            </Text>
                        </Box>
                    ),
                    },
                }); 
            }

            // read values from the storage object we received
            const storedData = persistedData as StorageContents;
            const wallerPrivateKey = storedData.did.privateKey;
            const vc = storedData.did.vc;
            
            // initialized rpc provider
            const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);

            // Create an EthrDID object for the issuer
            const wallet = new ethers.Wallet(wallerPrivateKey, provider);
            const holderDid = new EthrDID({ identifier: wallet.address, privateKey: wallerPrivateKey }) as Issuer;
            
            // create the verifiable presentation payload
            const presentationPayload: JwtPresentationPayload = {
                vp: {
                    '@context':['https://www.w3.org/2018/credentials/v1'],
                    type: ['VerifiablePresentation'],
                    verifiableCredential: [vc],
                    challenge
                }
            };

            // Sign the presentation with the holder's private key
            const signedPresentationJwt = await createVerifiablePresentationJwt(
                presentationPayload,
                holderDid
            );

            return signedPresentationJwt;
        }
        default:
            throw new Error('Method not found.');
  }
};
