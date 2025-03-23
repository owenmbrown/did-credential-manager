import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { Box, Text, Bold, Heading } from '@metamask/snaps-sdk/jsx';

import { createVerifiablePresentationJwt, JwtPresentationPayload, Issuer, verifyCredential } from 'did-jwt-vc';
import { EthrDID } from 'ethr-did';
import { ethers, hexlify, toUtf8Bytes, toUtf8String, verifyMessage } from 'ethers';
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';


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

// get current state of snap secure storage
async function getSnapStorage() : Promise<StorageContents | null> {
    const storedData = await snap.request({
        method: "snap_manageState",
        params: { operation: "get" },
    });

    return storedData as StorageContents | null;
}

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
            try {
                // ask user for consent
                const approval = await snap.request({
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
                if (approval === false) {
                    return {
                        success: false,
                        message: "user rejected dialogue"
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
                            <Heading>Identifier Created</Heading>
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
            }
            catch (error) {
                console.log(error)
                return {
                    success: false,
                    message: "runtime error",
                }
            }
        case 'get-did': {
            // returns the stored did:ethr if it exists

            // get current state of snap secure storage
            const storageContents = await getSnapStorage();

            if (!storageContents) {
                // if there is no data in storage, return failure
                return {
                    success: false,
                    message: "no did is stored"
                };
            }
            else {
                // return the did:ethr address
                return {
                    success: true,
                    did: storageContents.did.address
                };
            }
        }
        case 'store-vc': {
            try {
                // get the parans passed by the dapp
                const params = request.params as StoreVCParams;
                const vc = params.vc;

                // get current state of snap secure storage
                const storageContents = await getSnapStorage();

                if (!storageContents) {
                    // if the data doesn't exist, display a dialogue and return failure
                    await snap.request({
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
                    
                    return {
                        success: false,
                        message: "no did is stored"
                    }
                }

                // // initialize did:ethr resolver
                // const resolver = new Resolver({
                //     ...getEthrResolver({ infuraProjectId: INFURA_PROJECT_ID }),
                // });
                
                // // Verify the VC JWT
                // const verificationResult = await verifyCredential(vc, resolver);

                // console.log(verificationResult);

                // ask user for consent
                const approval = await snap.request({
                    method: 'snap_dialog',
                    params: {
                    type: 'confirmation',
                    content: (
                        <Box>
                            <Heading>Would you like to store this verifiable credential?</Heading>
                            <Text>Using the identity did:ethr:{storageContents.did.address} </Text>
                            <Text>placeholder</Text>
                        </Box>
                    ),
                    },
                }); 
                // return if user rejects prompt
                if (approval === false) {
                    return {
                        success: false,
                        message: "user rejected dialogue"
                    }
                }

                // update the VC in the object
                storageContents.did.vc = vc
                
                // store the VC in secure storage
                await snap.request({
                    method: "snap_manageState",
                    params: {
                    operation: "update",
                    newState: storageContents,
                    },
                })

                // display a confirmation alert
                await snap.request({
                    method: 'snap_dialog',
                    params: {
                    type: 'alert',
                    content: (
                        <Box>
                            <Text>
                                <Bold>Credential stored successfully</Bold>
                            </Text>
                        </Box>
                    ),
                    },
                }); 

                return {
                    success: true
                }
            }
            catch (error) {
                console.log(error)
                return {
                    success: false,
                    message: "runtime error",
                }
            }
        }
        case 'get-vp': {
            try {
                // read the paramaters of the rpc request to get the challenge
                const params = request.params as GetVPParams;
                const challenge = params.challenge;
                // check if the challenge was actually set
                if (!challenge) {
                    return {
                        success: false,
                        message: "missing challenge"
                    }
                }
                
                // get current state of snap secure storage
                const storageContents = await getSnapStorage();
                
                // verify data is formatted correctly
                if (!storageContents || storageContents.did.vc == "") {
                    return {
                        success: false,
                        message: "no vc is stored"
                    }
                }

                // ask user for consent
                const approval = await snap.request({
                    method: 'snap_dialog',
                    params: {
                    type: 'confirmation',
                    content: (
                        <Box>
                            <Heading>Would you like to present this app with a verifiable presentation?</Heading>
                            <Text>The app can use this to verify a claim about you.</Text>
                            <Text>This presentation will expire in 1 minute.</Text>
                        </Box>
                    ),
                    },
                }); 
                // return if user rejects prompt
                if (approval === false) {
                    return {
                        success: false,
                        message: "user rejected dialogue"
                    }
                }

                // read values from the storage object we received
                const wallerPrivateKey = storageContents.did.privateKey;
                const vc = storageContents.did.vc;

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

                return {
                    success: true,
                    vp: signedPresentationJwt
                }
            }
            catch (error) {
                console.log(error)
                return {
                    success: false,
                    message: "runtime error",
                }
            }
        }
        default:
            throw new Error('Method not found.');
  }
};
