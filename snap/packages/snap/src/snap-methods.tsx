import { Box, Text, Bold, Heading, Form, Field, Input, Dropdown, Option, Radio, RadioGroup, Checkbox, Selector, SelectorOption, Card, Button, Footer, Container, Row, Address, Copyable, Divider, Section, Nestable, GenericSnapElement, Spinner, Italic } from '@metamask/snaps-sdk/jsx';
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
    // console.log("event");
    // console.log(event.type);
    // console.log(event.name);
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

        const buttonID = (await dialogManager.WaitForInteraction())?.interactionID;

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
        const credentialType = params.type;
        let credentialName = params.defaultName;

        if (!vc || !credentialType || !credentialName) {
            return {
                success: false,
                message: `missing params: [ ${!vc ? 'vc ' : ''}${!credentialType ? 'type ' : ''}${!credentialName ? 'defaultName ' : ''}]`
            }
        }

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
                    <CredentialCard 
                        verifiableCredential={credentialContents} 
                        doNameInputField 
                        nameInputContents="New Credential" 
                        nameInputFieldID="credential-name-input" 
                        nameInputPlaceholder="Credential Name"
                    />
                </Box>
                <Footer>
                    <Button type="button" name="confirm" form="userInfoForm">
                    Confirm
                    </Button>
                </Footer>
            </Container>
        );

        while (true) {
            const userInteraction = await dialogManager.WaitForInteraction();
            // const approval = ((await dialogManager.WaitForInput())?.inputID === "confirm");

            // user interacts with text box
            if (userInteraction?.interactionType === "input") {
                continue;
            }
            // user hits the confirm button
            else if (userInteraction?.interactionType === "button" && userInteraction?.interactionID === "confirm") {
                // get the contents of the text box
                const contents = await dialogManager.GetFormContents();

                credentialName = contents["credential-name-input"] as string;
                credentialContents.name = credentialName;

                // break out of loop if name is valid
                if (credentialName.length >= 3) break;
                // TODO: better user feedback for invalid names
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

        const uuid = crypto.randomUUID();

        // update the VC in the object
        storageContents.did.credentials.push({
            name: credentialName,
            uuid,
            vc,
            type: credentialType
        });
        
        // store the VC in secure storage
        setSnapStorage(storageContents);

        // display a confirmation alert
        await dialogManager.UpdatePage(
            <Box>
                <Box center={true}>
                    <Heading>
                        Credential Stored Successfully
                    </Heading>
                </Box>
                <Divider/>
                <CredentialCard verifiableCredential={credentialContents}/>
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
        const validTypes = params.validTypes
        // check if the paramaters were set
        if (!challenge || ! validTypes) {
            return {
                success: false,
                message:  `missing params: [ ${!challenge ? 'challenge ' : ''}${!validTypes ? 'validTypes ' : ''}]`
            }
        }
        
        // get current state of snap secure storage
        const storageContents = await getSnapStorage();
        
        // verify data is formatted correctly
        if (!storageContents) {
            return {
                success: false,
                message: "no did is stored"
            }
        }

        // check if there are any credentials that have a valid type
        if (storageContents.did.credentials
                .filter(credential => credential.type && validTypes.includes(credential.type))
                .length
            === 0) {
            return {
                success: false,
                message: `no vc matches type filter ${JSON.stringify(validTypes)}`
            }
        }

        // create a new dialog window
        await dialogManager.NewDialog();

        // create the process to render the window
        const renderProcess = dialogManager.Render();

        console.log(storageContents.did.credentials)
        console.log(validTypes)

        // put the list of credentials in a more readable format
        //  filter out credentials with non-valid types
        const credentials = (await getCredentialsContentList(
            storageContents.did.credentials
                .filter(credential => credential.type && validTypes.includes(credential.type))
        ));

        let chosenCredential : CredentialContents | undefined;

        if (credentials.length === 1) {
            chosenCredential = credentials[0];
        }

        while (true) {
            // component for the dialog box, that we can pass the credential if we want
            const pageComponent = (
                <Box>
                    <Heading>Would you like to present this app with a verifiable presentation?</Heading>
                    <Text>The app can use this to verify a claim about you.</Text>
                    <Text>This presentation will expire in 1 minute.</Text>
                    {
                        credentials.length > 1 ?
                            (
                                <Dropdown name="credential-selection-dropdown">
                                    <Option value="none">Choose a Credential</Option>
                                    {
                                        credentials.map((item,index) => (
                                            <Option value={item.uuid as string}>{item.name as string}</Option>
                                        ))
                                    }
                                </Dropdown>
                            ) : null
                    }
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

            const userInteraction = await dialogManager.WaitForInteraction();
            
            // user consents
            if (userInteraction?.interactionType === "button" && userInteraction?.interactionID === "confirm") {
                if (chosenCredential) break;
            }
            // user chose a credential from the dropdown
            else if (userInteraction?.interactionType === "input" && userInteraction?.interactionID === "credential-selection-dropdown") {
                // get the contents of the dropdown
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
                        Credential Presented Successfully
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

        // note: we use a list instead of a dictionary since its easier handle
        //       the overhead of having to loop through the list to find an element doesn't matter
        //       since users will usually only store 1-5 credentials 
        const credentials = await getCredentialsContentList(storageContents.did.credentials);

        let editingCredentialID : string | null | undefined;

        let reRender = true;

        while (true) {
            if (reRender) {
                dialogManager.UpdatePage(
                    <Container>
                        <Box>
                            <Box center={true}>
                                <Heading>Credentials</Heading>
                            </Box>
                            <Divider />
                            {
                                credentials.length > 0 ? credentials.map((item,index) => (
                                    editingCredentialID === item.uuid ?
                                        <CredentialCard
                                            verifiableCredential={item}
                                            doNameInputField 
                                            nameInputContents={item.name as string} 
                                            nameInputFieldID={`credential-name-input-${item.uuid}`}
                                            nameInputPlaceholder="New Credential Name"
                                            doButtonRow
                                            buttonRowLeft={(
                                                <Button name={`cancel-${item.uuid}`}>Cancel</Button>
                                            )}
                                            buttonRowMiddle={(
                                                <Button name={`delete-${item.uuid}`} variant='destructive'>Delete</Button>
                                            )}
                                            buttonRowRight={(
                                                <Button name={`done-${item.uuid}`}>Done</Button>
                                            )}
                                        />
                                        : 
                                        <CredentialCard
                                            verifiableCredential={item}
                                            doButtonRow
                                            buttonRowRight={(
                                                <Button name={`edit-${item.uuid}`}>Edit</Button>
                                            )}
                                        />
                                )) : (<Text>You have no credentials stored right now</Text>)
                            }
                        </Box>
                        <Footer>
                            <Button type="button" name="confirm" form="userInfoForm">
                            Save
                            </Button>
                        </Footer>
                    </Container>
                );
            }

            reRender = true;

            // wait for user interaction
            const userInteraction = await dialogManager.WaitForInteraction();
            
            // user selects a credential to edit
            if (userInteraction?.interactionType === "button" && userInteraction?.interactionID.startsWith("edit")) {
                const selectedCredentialID = userInteraction?.interactionID.replace("edit-","");

                console.log("Start editing");

                // select the credential to open the editing panel
                editingCredentialID = selectedCredentialID;
            }
            // user wants to cancel their edit
            else if (userInteraction?.interactionType === "button" && userInteraction?.interactionID.startsWith("cancel")) {
                const selectedCredentialID = userInteraction?.interactionID.replace("cancel-","");

                console.log("Cancel editing");
                
                // deselect the credential, to close editing panel
                editingCredentialID = null;
            }
            // user wants to delete the credential
            else if (userInteraction?.interactionType === "button" && userInteraction?.interactionID.startsWith("delete")) {
                const selectedCredentialID = userInteraction?.interactionID.replace("delete-","");

                console.log("Delete credential");

                // deselect the credential, to close editing panel
                editingCredentialID = null;
            }
            // user wants to finish editing
            else if (userInteraction?.interactionType === "button" && userInteraction?.interactionID.startsWith("done")) {
                const selectedCredentialID = userInteraction?.interactionID.replace("done-","");

                console.log("Done editing credential");

                // get the contents of the text box
                const contents = await dialogManager.GetFormContents();

                const name = contents[`credential-name-input-${selectedCredentialID}`] as string;

                // close the editing panel if name is valid
                if (name.length >= 3) {
                    for (let i = 0; i < credentials.length; i++) {
                        const credential = credentials[i];
                        if (!credential) break;
                        
                        if (credential.uuid === selectedCredentialID) {
                            credential.name = name;

                            credentials[i] = credential;

                            break;
                        }
                    }

                    // deselect the credential, to close editing panel
                    editingCredentialID = null;
                };
                // TODO: better user feedback for invalid names
            }
            else if (userInteraction?.interactionType === "button" && userInteraction?.interactionID.startsWith("recover")) {
                const selectedCredentialID = userInteraction?.interactionID.replace("recover-","");

                console.log("Recover credential");
                // TODO revert credential to how it was
            }
            // user saves the changes
            else if (userInteraction?.interactionType === "button" && userInteraction?.interactionID === "confirm") {
                break;
            }
            else if (userInteraction?.interactionType === "input") {
                // don't need to rerender if the text box is uses
                reRender = false;
            }
            // return if user rejects prompt
            else {
                return {
                    success: false,
                    message: "user rejected dialogue"
                }
            }
        }

        // TODO: save changes
        
        await dialogManager.UpdatePage(
            <Box center={true}>
                <Heading>
                    Changes Saved
                </Heading>
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

export async function snapExportIdentity() {
    // create a new dialog window
    await dialogManager.NewDialog();
    
    // create the process to render the window
    const renderProcess = dialogManager.Render();

    await dialogManager.UpdatePage(
        <Box center={true}>
            <Heading>
                Export Identity
            </Heading>
            <Divider/>
            <Text><Italic>Unfinished method</Italic></Text>
        </Box>
    );

    // wait for the user to close the dialog
    await renderProcess;

    return {
        success: true,
    }
}

export async function snapImportIdentity() {
    // create a new dialog window
    await dialogManager.NewDialog();
    
    // create the process to render the window
    const renderProcess = dialogManager.Render();

    await dialogManager.UpdatePage(
        <Box center={true}>
            <Heading>
                Import Identity
            </Heading>
            <Divider/>
            <Text><Italic>Unfinished method</Italic></Text>
        </Box>
    );

    // wait for the user to close the dialog
    await renderProcess;

    return {
        success: true,
    }
}