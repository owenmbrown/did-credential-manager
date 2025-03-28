import { Box, Text, Bold, Heading, Form, Field, Input, Dropdown, Option, Radio, RadioGroup, Checkbox, Selector, SelectorOption, Card, Button, Footer, Container, Row, Address, Copyable, Divider } from '@metamask/snaps-sdk/jsx';
import { ComponentOrElement, JsonRpcParams, JsonRpcRequest, OnUserInputHandler, UserInputEventType } from '@metamask/snaps-sdk';
import { ethers } from 'ethers';
import { createVerifiablePresentationJwt, Issuer, JwtPresentationPayload, verifyCredential } from 'did-jwt-vc';
import { EthrDID } from 'ethr-did';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { Resolver } from 'did-resolver';

import { getSnapStorage, setSnapStorage, displayAlert, displayConfirmation, displayPrompt, DialogManager } from './snap-helpers';
import { StoreVCParams, GetVPParams, StorageContents } from './types'

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

// initialized rpc provider
const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);

// initalize dialog manager
let dialogManager = new DialogManager();

export const onUserInput: OnUserInputHandler = async ({ id, event }) => {
    if (event.type === UserInputEventType.ButtonClickEvent) {
        dialogManager.PressButton(event.name,id);
    }
}

export async function snapCreateDID() {
    try {
        await dialogManager.NewDialog();

        const renderProcess = dialogManager.Render();

        // ask user for consent
        await dialogManager.UpdatePage(
            <Container>
                <Box>
                    <Heading>Would you like to create a new did:ethr?</Heading>
                    <Text>This identity can be used to create and store verifiable credentials.</Text>
                    <Text>Warning: This will overwrite any previous dids that have been stored</Text>
                </Box>
                <Footer>
                    <Button type="button" name="confirm" form="userInfoForm">
                    Confirm
                    </Button>
                </Footer>
            </Container>
        ); 

        const buttonID = await dialogManager.WaitForButton();

        const approval = (buttonID === "confirm");

        // return if user rejects prompt
        if (approval === false) {
            return {
                success: false,
                message: "user rejected dialogue"
            }
        }

        // display a loading wheel
        dialogManager.ShowLoadingPage();

        // create a new did:ethr
        const wallet = ethers.Wallet.createRandom();

        // Extract keys and address
        const privateKey = wallet.privateKey;
        const address = wallet.address;

        // Update the state storage to include
        setSnapStorage({ 
            did: {
                privateKey,
                address,
                vc: ""
            }
        });

        // show a success dialogue
        await dialogManager.UpdatePage(
            <Container>
                <Box center={true}>
                    <Heading>Identifier Created</Heading>
                    <Divider />
                    <Copyable value={`did:ethr:${address}`} />
                </Box>
            </Container>
        );

        // wait for the user to close the dialog
        await renderProcess;

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
}

export async function snapGetDid() {
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

export async function snapStoreVC(request: JsonRpcRequest<JsonRpcParams>) {
    try {
        // get the parans passed by the dapp
        const params = request.params as StoreVCParams;
        const vc = params.vc;

        // get current state of snap secure storage
        const storageContents = await getSnapStorage();

        if (!storageContents) {
            // if the data doesn't exist, display a dialogue and return failure
            await displayAlert(
                <Box>
                    <Text>
                        <Bold>Credential store failed.  No did:ethr found</Bold>
                    </Text>
                </Box>
            );
            
            return {
                success: false,
                message: "no did is stored"
            }
        }

        // initialize did:ethr resolver
        const resolver = new Resolver({
            ...getEthrResolver({ infuraProjectId: INFURA_PROJECT_ID }),
        });
        
        // Verify the VC JWT
        const verificationResult = await verifyCredential(vc, resolver);

        console.log(verificationResult);

        // ask user for consent
        const approval = await displayConfirmation(
            <Box>
                <Heading>Would you like to store this verifiable credential?</Heading>
                <Text>Using the identity did:ethr:{storageContents.did.address} </Text>
            </Box>
        );
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
        setSnapStorage(storageContents);

        // display a confirmation alert
        await displayAlert(
            <Box>
                <Text>
                    <Bold>Credential stored successfully</Bold>
                </Text>
            </Box>
        );

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

export async function snapGetVP(request: JsonRpcRequest<JsonRpcParams>) {
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
        const approval = await displayConfirmation(
            <Box>
                <Heading>Would you like to present this app with a verifiable presentation?</Heading>
                <Text>The app can use this to verify a claim about you.</Text>
                <Text>This presentation will expire in 1 minute.</Text>
            </Box>
        );
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

export async function snapDialogTest() {
    await dialogManager.NewDialog();

    console.log("hi");
    const renderProcess = dialogManager.Render();
    
    console.log("hi 2");
    
    await dialogManager.UpdatePage(
        <Container>
            <Box>
                <Heading>Step 1: User Information</Heading>
                <Form name="userInfoForm">
                <Input name="username" placeholder="Enter your name" />
                </Form>
            </Box>
            <Footer>
                <Button type="submit" name="submit" form="userInfoForm">
                Next
                </Button>
            </Footer>
        </Container>
    );
    
    console.log("hi 3");

    // wait for the user to press the button
    const buttonID = await dialogManager.WaitForButton();

    console.log(buttonID);

    // get the contents of the form
    const contents = await dialogManager.GetFormContents();
    console.log(contents);

    // wait for the user to close the dialog
    await renderProcess;

    console.log("hi 4");

    return {};
}