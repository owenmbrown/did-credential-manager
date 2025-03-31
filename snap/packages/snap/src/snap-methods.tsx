import { Box, Text, Bold, Heading, Form, Field, Input, Dropdown, Option, Radio, RadioGroup, Checkbox, Selector, SelectorOption, Card, Button, Footer, Container, Row, Address, Copyable, Divider, Section, Nestable, GenericSnapElement, Spinner } from '@metamask/snaps-sdk/jsx';
import { ComponentOrElement, JsonRpcParams, JsonRpcRequest, OnUserInputHandler, UserInputEventType } from '@metamask/snaps-sdk';
import { ethers } from 'ethers';
import { createVerifiablePresentationJwt, Issuer, JwtPresentationPayload, verifyCredential } from 'did-jwt-vc';
import { EthrDID } from 'ethr-did';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { Resolver } from 'did-resolver';

import { getSnapStorage, setSnapStorage, displayAlert, displayConfirmation, displayPrompt, DialogManager, getCredentialContents, getCredentialsContentList } from './snap-helpers';
import { StoreVCParams, GetVPParams, StorageContents, CredentialContents } from './types'
import { DID, InclusiveRow, CredentialCard } from './components'

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

// initialized rpc provider
const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);

// initalize dialog manager
let dialogManager = new DialogManager();

export const onUserInput: OnUserInputHandler = async ({ id, event }) => {
    console.log("event");
    console.log(event.type);
    console.log(event.name);
    if (event.type === UserInputEventType.ButtonClickEvent) {
        dialogManager.UseButton(event.name,id);
    }
    else if (event.type === UserInputEventType.InputChangeEvent) {
        dialogManager.UseDropdown(event.name,id);
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

        const buttonID = (await dialogManager.WaitForInput())?.inputID;

        const approval = (buttonID === "confirm");

        // return if user rejects prompt
        if (approval === false) {
            return {
                success: false,
                message: "user rejected dialogue"
            }
        }

        // display a loading wheel
        await dialogManager.ShowLoadingPage();

        // create a new did:ethr
        const wallet = ethers.Wallet.createRandom();

        // Extract keys and address
        const privateKey = wallet.privateKey;
        const address = `did:ethr:${wallet.address}`;

        // Update the state storage to include
        setSnapStorage({ 
            did: {
                privateKey,
                address,
                credentials: [],
            }
        });

        // show a success dialogue
        await dialogManager.UpdatePage(
            <Container>
                <Box center={true}>
                    <Heading>Identifier Created</Heading>
                    <Divider />
                    <Copyable value={address} />
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

        // parse the VC to get it's contents
        const credentialContents = await getCredentialContents(vc);        
        console.log(credentialContents.jwt);
        
        // create a new dialog window
        await dialogManager.NewDialog();
        
        // create the process to render the window
        const renderProcess = dialogManager.Render();

        // TODO: verify the address in storage matches the address in the credential

        // ask user for consent
        await dialogManager.UpdatePage(
            <Container>
                <Box>
                    <Heading>Would you like to store this verifiable credential?</Heading>
                    <CredentialCard verifiableCredential={credentialContents}/>
                </Box>
                <Footer>
                    <Button type="button" name="confirm" form="userInfoForm">
                    Confirm
                    </Button>
                </Footer>
            </Container>
        );

        const approval = ((await dialogManager.WaitForInput())?.inputID === "confirm");

        // return if user rejects prompt
        if (approval === false) {
            return {
                success: false,
                message: "user rejected dialogue"
            }
        }

        // display a loading wheel
        await dialogManager.ShowLoadingPage();

        const name = "temp";
        const uuid = crypto.randomUUID();

        // update the VC in the object
        storageContents.did.credentials.push({
            name,
            uuid,
            vc,
        });
        
        // store the VC in secure storage
        setSnapStorage(storageContents);

        // display a confirmation alert
        await dialogManager.UpdatePage(
            <Box center={true}>
                <Heading>Credential stored successfully</Heading>
            </Box>
        );

        // wait for the user to close the dialog
        await renderProcess;

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
        if (!storageContents /*|| storageContents.did.vc == ""*/) {
            return {
                success: false,
                message: "no vc is stored"
            }
        }

        // create a new dialog window
        await dialogManager.NewDialog();

        // create the process to render the window
        const renderProcess = dialogManager.Render();

        const credentials = await getCredentialsContentList(storageContents.did.credentials);

        let chosenCredential : CredentialContents | undefined;

        while (true) {
            // component for the dialog box, that we can pass the credential if we want
            const pageComponent = (
                <Box>
                    <Heading>Would you like to present this app with a verifiable presentation?</Heading>
                    <Text>The app can use this to verify a claim about you.</Text>
                    <Text>This presentation will expire in 1 minute.</Text>
                    <Dropdown name="credential-selection-dropdown">
                        <Option value="none">Choose a Credential</Option>
                        {
                            credentials.map((item,index) => (
                                <Option value={item.uuid as string}>{item.name as string}</Option>
                            ))
                        }
                    </Dropdown>
                    {chosenCredential ? (<CredentialCard verifiableCredential={chosenCredential}/>) : null}
                </Box>
            );

            if (chosenCredential) {
                // page with confirm button
                await dialogManager.UpdatePage(
                    <Container>
                        {pageComponent}
                        <Footer>
                            <Button type="button" name="confirm" form="userInfoForm">
                            Confirm
                            </Button>
                        </Footer>
                    </Container>
                );
            }
            else {
                // page without confirm button
                await dialogManager.UpdatePage(pageComponent);
            }

            const userInput = await dialogManager.WaitForInput();
            
            // user consents
            if (userInput?.inputType === "button" && userInput?.inputID === "confirm") {
                if (chosenCredential) break;
            }
            // user chose a credential from the dropdown
            else if (userInput?.inputType === "dropdown" && userInput?.inputID === "credential-selection-dropdown") {
                const contents = await dialogManager.GetFormContents();

                chosenCredential = undefined;

                if (contents["credential-selection-dropdown"] !== "none") {
                    for (let i = 0; i < credentials.length; i++) {
                        if (credentials[i]?.uuid === contents["credential-selection-dropdown"]) {
                            chosenCredential = credentials[i];
                            break;
                        }
                    }
                }
            }
            // return if user rejects prompt
            else {
                return {
                    success: false,
                    message: "user rejected dialogue"
                }
            }
        }

        // display a loading wheel
        await dialogManager.ShowLoadingPage();

        // read values from the storage object we received
        const wallerPrivateKey = storageContents.did.privateKey;
        const vc = chosenCredential.vc;

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

        // display a confirmation alert
        await dialogManager.UpdatePage(
            <Box>
                <Box center={true}>
                    <Heading>
                        Successfully presented
                    </Heading>
                </Box>
                <Divider/>
                <CredentialCard verifiableCredential={chosenCredential}/>
            </Box>
        );

        // wait for the user to close the dialog
        await renderProcess;

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

export async function snapManageVCs() {
    try  {
        // get current state of snap secure storage
        const storageContents = await getSnapStorage();
            
        // verify data is formatted correctly
        if (!storageContents /*|| storageContents.did.vc == ""*/) {
            return {
                success: false,
                message: "no vc is stored"
            }
        }
    
        // create a new dialog window
        await dialogManager.NewDialog();
    
        // create the process to render the window
        const renderProcess = dialogManager.Render();

        const credentials = await getCredentialsContentList(storageContents.did.credentials);

        dialogManager.UpdatePage(
            <Box center={true}>
                <Heading>Credentials</Heading>
                <Divider />
                {
                    credentials.length > 0 ? credentials.map((item,index) => (
                        <CredentialCard verifiableCredential={item} />
                    )) : (<Text>You have no credentials stored right now</Text>)
                }
                <Button name="interactive-button">Click me</Button>
                <Dropdown name="interactive-dropdown">
                    <Option value="option 1">1st option</Option>
                    <Option value="option 2">2nd option</Option>
                    <Option value="option 3">3rd option</Option>
                </Dropdown>
            </Box>
        );

        // wait for the user to close the dialog
        await renderProcess;

        return {
            success: true,
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

    while (true) {
        // wait for the user to press the button
        const buttonID = (await dialogManager.WaitForInput())?.inputID;
        if (buttonID !== "submit") continue;

        console.log(buttonID);

        // get the contents of the form
        const contents = await dialogManager.GetFormContents();
        console.log(contents);

        break;
    }

    // wait for the user to close the dialog
    await renderProcess;

    console.log("hi 4");

    return {};
}