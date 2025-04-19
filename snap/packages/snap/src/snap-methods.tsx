import { Box, Text, Bold, Heading, Input, Dropdown, Option, Button, Footer, Container, Copyable, Divider, Italic } from '@metamask/snaps-sdk/jsx';
import { JsonRpcParams, JsonRpcRequest, OnUserInputHandler, UserInputEventType } from '@metamask/snaps-sdk';
import { ethers } from 'ethers';
import { createVerifiablePresentationJwt, Issuer, JwtPresentationPayload } from 'did-jwt-vc';
import { EthrDID } from 'ethr-did';

import { getSnapStorage, setSnapStorage, DialogManager, getCredentialContents, getCredentialsContentList, ERROR_NO_DID, ERROR_USER_REJECTED, ERROR_RUNTIME } from './snap-helpers';
import { StoreVCParams, GetVPParams, CredentialContents, AllCredentials } from './types';
import { CredentialCard, TripleRow } from './components';

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

// initialized rpc provider
const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);

// initalize dialog manager
let dialogManager = new DialogManager();

/**
 * Handles user input events from Snap interfaces and routes them to the `DialogManager`.
 *
 * This function is triggered whenever the user interacts with a Snap-rendered UI,
 * such as clicking a button or changing a dropdown/input field. It updates the internal
 * interaction state within the `DialogManager` so that logic waiting on `WaitForInteraction()` can proceed.
 *
 * @param id - The ID of the interface the event originated from.
 * @param event - The user input event, which can be a button click or input change.
 */
export const onUserInput: OnUserInputHandler = async ({ id, event }) => {
    if (event.type === UserInputEventType.ButtonClickEvent) {
        dialogManager.UseButton(event.name,id);
    }
    else if (event.type === UserInputEventType.InputChangeEvent) {
        dialogManager.UseDropdown(event.name,id);
    }
}

/**
 * Creates and stores a new Decentralized Identifier (DID) of type `did:ethr` in Snap's secure state storage.
 *
 * This function guides the user through a multi-step dialog:
 * - Asks whether to generate a new Ethereum wallet or import an existing one
 * - Validates the inputted private key (if provided)
 * - Displays a loading indicator during processing
 * - Shows a confirmation page upon success
 *
 * If an existing key is used, it is validated using ethers.js. If validation fails, the user is prompted again.
 * The resulting DID is stored along with its private key and an empty list of credentials in Snap storage.
 *
 * @async
 * @returns {Promise<{success: boolean, did?: string, message?: string}>} A result object:
 * - `success`: true if a DID was successfully created and stored; false otherwise
 * - `did` (optional): the generated or imported DID (e.g., `did:ethr:0xabc...`)
 * - `message` (optional): error message if creation failed (e.g., user rejected, runtime error)
 *
 * @throws Will return a failed result if user rejects the dialog or an unexpected error occurs.
 * @sideEffect Renders MetaMask Snap UI dialogs and mutates Snap state via `setSnapStorage()`.
 */
export async function snapCreateDID() : Promise<{ success: boolean; did?: string; message?: string; }> {
    try {
        await dialogManager.NewDialog();

        const renderProcess = dialogManager.Render();

        let useExistingDID = false;
        let walletKey = "";
        let showBadKeyError = false;

        while (true) {
            // ask user for consent
            await dialogManager.UpdatePage(
                <Container>
                    <Box>
                        <Heading>Would you like to create a new did:ethr?</Heading>
                        <Text>This identity can be used to create and store verifiable credentials.</Text>
                        <Text><Italic>Warning: This will overwrite any previous identities and credentials that have been stored</Italic></Text>
                        <Dropdown name="dropdown">
                            <Option value="new">Create new ethereum wallet</Option>
                            <Option value="existing">Use existing ethereum wallet</Option>
                        </Dropdown>
                        {useExistingDID ? 
                            <Box>
                                <Divider/>
                                <Text><Bold>Private key of the ethereum wallet you want to use:</Bold></Text>
                                <Input name={"wallet-key-input"} placeholder="Your ethereum wallet key" />
                            </Box>
                        : null}
                        {showBadKeyError ?
                            <Text color='error'><Italic>Invalid Key</Italic></Text>
                        : null}
                    </Box>
                    <Footer>
                        <Button type="button" name="confirm" form="userInfoForm">
                        Confirm
                        </Button>
                    </Footer>
                </Container>
            ); 
    
            // wait for user interaction
            const userInteraction = await dialogManager.WaitForInteraction();

            if (userInteraction?.interactionType === "button" && userInteraction?.interactionID.startsWith("confirm")) {
                if (useExistingDID) {
                    // get the contents of the text box
                    const contents = await dialogManager.GetFormContents();

                    console.log(contents["wallet-key-input"]);

                    try {
                        new ethers.Wallet(contents["wallet-key-input"] as string);
                        
                        walletKey = contents["wallet-key-input"] as string;
                    }
                    catch (err) {
                        showBadKeyError = true;
                        continue;
                    }
                }

                break;
            }
            else if (userInteraction?.interactionType === "input" && userInteraction?.interactionID.startsWith("dropdown")) {
                // get the contents of the dropdown
                const contents = await dialogManager.GetFormContents();

                useExistingDID = contents["dropdown"] === "existing";

                showBadKeyError = false;
            }
            else if (userInteraction?.interactionType === "input") {
                // interacted with text input box
            }
            // return if user rejects prompt
            else {
                return {
                    success: false,
                    message: ERROR_USER_REJECTED
                }
            }
        } 

        // display a loading wheel
        await dialogManager.ShowLoadingPage();

        // create a new did:ethr
        const wallet = useExistingDID ? new ethers.Wallet(walletKey) : ethers.Wallet.createRandom();

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
        console.error(error);
        return {
            success: false,
            message: ERROR_RUNTIME,
        }
    }
}

/**
 * Retrieves the stored Decentralized Identifier (DID) of type `did:ethr` from Snap's secure storage.
 *
 * This function checks Snap state for a previously created or imported DID. If found, the DID's address
 * is returned. If no DID exists in storage (e.g., user hasn't created one yet), a failure message is returned instead.
 *
 * @async
 * @returns {Promise<{ success: boolean, did?: string, message?: string }>} A result object:
 * - `success`: true if a DID is found; false if no DID has been created or stored.
 * - `did` (optional): the stored DID address (e.g., `did:ethr:0xabc...`)
 * - `message` (optional): an error message indicating no DID was found.
 *
 * @sideEffect None. This is a read-only function that retrieves data from Snap's internal state.
 */
export async function snapGetDid() : Promise<{ success: boolean; did?: string; message?: string; }> {
    // get current state of snap secure storage
    const storageContents = await getSnapStorage();

    if (!storageContents) {
        // if there is no data in storage, return failure
        return {
            success: false,
            message: ERROR_NO_DID
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

/**
 * Stores a Verifiable Credential (VC) in Snap's secure storage, associating it with the currently stored DID.
 *
 * This function performs the following steps:
 * - Validates the incoming request for required fields: `vc`, `type`, and `defaultName`
 * - Ensures a DID has been created and is available in Snap storage
 * - Displays a confirmation dialog for the user, allowing them to rename the credential before storing it
 * - Validates the credential name (minimum length of 3)
 * - Persists the credential, including metadata like name, type, and UUID
 * - Displays a confirmation message once stored
 *
 * If any required parameter is missing, or the user cancels the dialog, the operation fails gracefully.
 *
 * @param {JsonRpcRequest<JsonRpcParams>} request - The request payload from the calling dApp, containing:
 * @param {string} request.params.vc - The Verifiable Credential (as a JWT or JSON string)
 * @param {string} request.params.type - The type/category of the credential (e.g., "EmailCredential", "KYC", etc.)
 * @param {string} request.params.defaultName - The default name to use for the credential before user edits
 *
 * @returns {Promise<{ success: boolean, message?: string }>} A result object:
 * - `success`: true if the credential was successfully stored
 * - `message` (optional): An error message if the operation fails
 *   - Can be caused by missing parameters, user rejection, missing DID, or a runtime error
 *
 * @throws Will return a failed result if validation fails, the DID is not found, or the user cancels the prompt.
 * @sideEffect Renders Snap dialogs for user interaction and mutates Snap state via `setSnapStorage()`.
 *
 * @todo Implement better user feedback for invalid credential names
 * @todo Validate that the address in the VC matches the address in Snap storage
 */
export async function snapStoreVC(request: JsonRpcRequest<JsonRpcParams>) : Promise<{ success: boolean; message?: string; }> {
    try {
        // get the parans passed by the dapp
        const { vc, type, defaultName } = request.params as StoreVCParams;
        let credentialName = defaultName;

        // check for invalid parameters
        if (!vc || !type || !credentialName) {
            return {
                success: false,
                message: `missing params: [ ${!vc ? 'vc ' : ''}${!type ? 'type ' : ''}${!credentialName ? 'defaultName ' : ''}]`
            }
        }

        // get current state of snap secure storage
        const storageContents = await getSnapStorage();

        if (!storageContents) {
            // if the data doesn't exist return failure
            return {
                success: false,
                message: ERROR_NO_DID
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
                        doCustomHeader 
                        customHeader={
                            <Input name={'credential-name-input'} placeholder={"Credential Name"} value={credentialName}/>
                        }
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

                credentialName = (contents["credential-name-input"] ?? credentialName) as string;
                credentialContents.name = credentialName;

                // break out of loop if name is valid
                if (credentialName.length >= 3) break;
                // TODO: better user feedback for invalid names
            }
            // return if user rejects prompt
            else {
                return {
                    success: false,
                    message: ERROR_USER_REJECTED
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
            type
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
        console.error(error);
        return {
            success: false,
            message: ERROR_RUNTIME,
        }
    }
}

/**
 * Generates and returns a Verifiable Presentation (VP) JWT from a stored Verifiable Credential (VC).
 *
 * This function:
 * - Requires a challenge string and a list of valid credential types
 * - Filters the stored credentials based on `validTypes`
 * - Prompts the user to confirm the presentation of a selected credential via a Snap dialog
 * - Uses the DID's private key to sign the presentation JWT
 * - Returns the signed VP if successful
 *
 * The Verifiable Presentation includes:
 * - The selected VC
 * - The challenge provided
 * - Metadata for the selected credential (e.g., its type)
 *
 * @param {JsonRpcRequest<JsonRpcParams>} request - A JSON-RPC request object containing:
 * @param {string} request.params.challenge - A challenge string used to bind the VP to the session/requester.
 * @param {string[]} request.params.validTypes - List of accepted credential types (e.g., `["EmailCredential"]`).
 *
 * @returns {Promise<{ success: boolean, vp?: string, message?: string }>} A result object:
 * - `success`: true if a VP was successfully generated and signed.
 * - `vp` (optional): the signed Verifiable Presentation as a JWT string.
 * - `message` (optional): an error message if the operation failed due to:
 *   - Missing parameters
 *   - No DID available in storage
 *   - No matching credential type
 *   - User rejection or runtime error
 *
 * @throws Will return a failed result instead of throwing on user rejection or invalid state.
 * @sideEffect Renders multiple Snap dialogs for user interaction and reads DID state from secure storage.
 *
 * @todo Improve UX feedback when invalid or no credential is selected
 */
export async function snapGetVP(request: JsonRpcRequest<JsonRpcParams>) : Promise<{ success: boolean; vp?: string; message?: string; }> {
    try {
        // read the paramaters of the rpc request to get the challenge
        const { challenge, validTypes} = request.params as GetVPParams;
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
                message: ERROR_NO_DID
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
                    message: ERROR_USER_REJECTED
                }
            }
        }

        // display a loading wheel
        await dialogManager.ShowLoadingPage();

        // read values from the storage object we received
        const wallerPrivateKey = storageContents.did.privateKey;
        const vc = chosenCredential.vc;
        const credentialType = chosenCredential.type;

        // Create an EthrDID object for the issuer
        const wallet = new ethers.Wallet(wallerPrivateKey, provider);
        const holderDid = new EthrDID({ identifier: wallet.address, privateKey: wallerPrivateKey }) as Issuer;
        
        // create the verifiable presentation payload
        const presentationPayload: JwtPresentationPayload = {
            vp: {
                '@context':['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiablePresentation'],
                verifiableCredential: [vc],
                challenge,
                credentialType
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
        console.error(error);
        return {
            success: false,
            message: ERROR_RUNTIME,
        }
    }
}

/**
 * Opens a UI flow that allows the user to manage their stored Verifiable Credentials (VCs) in Snap storage.
 *
 * This interactive dialog lets the user:
 * - **Edit** a credential's name
 * - **Delete** a credential (mark it as deleted)
 * - **Recover** a previously deleted or edited credential (resetting it to original state)
 * - **Save** their changes or cancel the operation
 *
 * Internally, credentials are marked with temporary flags (`edited`, `deleted`) before the user confirms their changes.
 * Only when the user confirms (`Save`), these changes are persisted back to Snap secure storage.
 *
 * @returns {Promise<{ success: boolean, message?: string }>} A result object:
 * - `success`: true if changes were successfully saved to Snap storage
 * - `message` (optional): error message if no DID was found, the user canceled, or a runtime error occurred
 *
 * @sideEffect
 * - Displays an interactive multi-step dialog to the user
 * - Reads and mutates the Snap state (`setSnapStorage`) if changes are confirmed
 *
 * @throws Will return `success: false` instead of throwing for all user-driven cancellations and runtime errors
 *
 * @todo Improve feedback when credential name is invalid (e.g., shorter than 3 characters)
 */
export async function snapManageVCs() : Promise<{ success: boolean; message?: string; }> {
    try  {
        // get current state of snap secure storage
        const storageContents = await getSnapStorage();
            
        // verify data is formatted correctly
        if (!storageContents) {
            return {
                success: false,
                message: ERROR_NO_DID
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
                                    <CredentialCard // card that is currently being edited
                                        verifiableCredential={item}
                                        doCustomHeader
                                        customHeader={
                                            <Input name={`credential-name-input-${item.uuid}`} placeholder={"New Credential Name"} value={item.name as string}/>
                                        }
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
                                    : item.deleted ?
                                    <CredentialCard // deleted card with recover button
                                        verifiableCredential={item}
                                        doButtonRow
                                        doCustomHeader
                                        customHeader={
                                            <TripleRow 
                                                left={
                                                    <Text color="error"><Bold>{item.name as string}</Bold></Text>
                                                } 
                                                middle={null} 
                                                right={
                                                    <Text color="error"><Italic>deleted</Italic></Text>
                                                }
                                            />
                                        }
                                        buttonRowRight={(
                                            <Button name={`recover-${item.uuid}`}>Recover</Button>
                                        )}
                                    />
                                    : item.edited ?
                                    <CredentialCard // deleted card with recover button
                                        verifiableCredential={item}
                                        doButtonRow
                                        doCustomHeader
                                        customHeader={
                                            <TripleRow 
                                                left={
                                                    <Text color="alternative"><Italic>{item.name as string}</Italic></Text>
                                                } 
                                                middle={null} 
                                                right={
                                                    <Text color="alternative"><Italic>edited</Italic></Text>
                                                }
                                            />
                                        }
                                        buttonRowRight={(
                                            <Button name={`recover-${item.uuid}`}>Restore</Button>
                                        )}
                                    />
                                    :
                                    <CredentialCard // default card with edit button
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

                // set the 'deleted' flag in the credential
                for (let i = 0; i < credentials.length; i++) {
                    const credential = credentials[i];
                    if (!credential) break;
                    
                    if (credential.uuid === selectedCredentialID) {
                        credential.deleted = true;

                        credentials[i] = credential;

                        break;
                    }
                }

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
                            credential.edited = true;

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
                
                // set the 'deleted' flag in the credential
                for (let i = 0; i < credentials.length; i++) {
                    const credential = credentials[i];
                    if (!credential) break;
                    
                    if (credential.uuid === selectedCredentialID) {
                        credential.deleted = false;
                        credential.edited = false;
                        credential.name = credential.oldName as string;

                        credentials[i] = credential;

                        break;
                    }
                }
            }
            // user saves the changes
            else if (userInteraction?.interactionType === "button" && userInteraction?.interactionID === "confirm") {
                break;
            }
            else if (userInteraction?.interactionType === "input") {
                // don't need to rerender if the text box is used
                reRender = false;
            }
            // return if user rejects prompt
            else {
                return {
                    success: false,
                    message: ERROR_USER_REJECTED
                }
            }
        }

        // save changes
        let updatedCredentials = [];
        for (let i = 0; i < credentials.length; i++) {
            const credentialContents = credentials[i];
            if (!credentialContents) continue;

            if (credentialContents.deleted) continue;

            const credential = storageContents.did.credentials[i];
            if (!credential) continue;

            credential.name = credentialContents.name as string;
            updatedCredentials.push(credential);
        }

        storageContents.did.credentials = updatedCredentials;
        await setSnapStorage(storageContents);
        
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
        console.error(error);
        return {
            success: false,
            message: ERROR_RUNTIME,
        }
    }
}

/**
 * [UNIMPLEMENTED] Placeholder method for exporting the current identity (DID + credentials).
 *
 * ⚠️ This method is currently disabled for security reasons:
 * - MetaMask Snaps do not support secure encryption with the user's wallet key
 * - Exporting identity data unencrypted would expose users to identity theft if mishandled
 *
 * In the future, this method may be implemented if:
 * 1. MetaMask Flask adds support for encryption/decryption using the user's wallet key
 * 2. The project decides to expose this feature to advanced users with sufficient warnings
 *
 * @returns {Promise<{ success: boolean }>} Always returns success with no actual export behavior.
 *
 * @sideEffect Renders an informational dialog stating that export is unfinished.
 */
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

/**
 * [UNIMPLEMENTED] Placeholder method for importing a DID-based identity into the Snap.
 *
 * ⚠️ This method is not currently implemented due to missing secure channels for identity verification:
 * - Without encryption tied to the original wallet, imported data could be spoofed or misused
 * - Implementing this without protections may cause inexperienced users to unknowingly compromise their identity
 *
 * This method may be implemented in the future if:
 * 1. Wallet-linked encryption is supported in MetaMask Snaps
 * 2. The feature is gated behind an "advanced mode" with appropriate risk disclosures
 *
 * @returns {Promise<{ success: boolean }>} Always returns success with no actual import behavior.
 *
 * @sideEffect Renders an informational dialog stating that import is unfinished.
 */
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

/**
 * Retrieves all stored Verifiable Credentials (VCs) associated with the current DID from Snap's secure storage.
 *
 * Each credential in the returned list includes both raw and parsed metadata (e.g., name, type, issuer, and claim string).
 * This function is useful for external applications or UI components that want to display or process all credentials at once.
 *
 * Internally, it uses `getCredentialsContentList()` to enrich each stored VC with derived fields such as `claimString`.
 *
 * @returns {Promise<{ success: boolean, credentials?: Array<object>, message?: string }>} A result object:
 * - `success`: true if credentials were successfully retrieved
 * - `credentials` (optional): an array of enriched credential objects, each containing:
 *   - `vc`: the original Verifiable Credential (JWT or JSON)
 *   - `name`: user-defined credential label
 *   - `uuid`: unique identifier for the credential
 *   - `type`: type of the credential
 *   - `claim`: parsed claim object
 *   - `issuer`: DID of the issuer
 *   - `subject`: DID of the subject
 *   - `claimString`: short string representation of the claim
 * - `message` (optional): an error message if the DID was not found or a runtime error occurred
 *
 * @sideEffect None — this is a read-only function.
 *
 * @throws Returns `success: false` instead of throwing, even on unexpected errors.
 */
export async function snapGetAllCredentials() : Promise<{ success: boolean; credentials?: Array<object>; message?: string; }> {
    try {
        const storageContents = await getSnapStorage();
    
        if (!storageContents) {
            return {
                success: false,
                message: ERROR_NO_DID
            }
        }
    
        const credentials = (await getCredentialsContentList(storageContents.did.credentials)).map(
            credential => {
                return {
                    vc: credential.vc,
                    name: credential.name,
                    uuid: credential.uuid,
                    type: credential.type,
                    claim: credential.claim,
                    issuer: credential.issuer,
                    subject: credential.subject,
                    claimString: credential.claimString,
                }
            }
        );

        return {
            success: true,
            credentials
        } as AllCredentials
    }
    catch (error) {
        console.error(error)
        return {
            success: false,
            message: ERROR_RUNTIME,
        }
    }
}