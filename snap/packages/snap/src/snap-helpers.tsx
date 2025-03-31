import { ComponentOrElement, Json } from '@metamask/snaps-sdk';
import { Box, Heading, Spinner } from '@metamask/snaps-sdk/jsx';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { Resolver } from 'did-resolver';
import { verifyCredential } from 'did-jwt-vc';

import { StoreVCParams, GetVPParams, StorageContents, CredentialContents, Credential, UserInput } from './types';

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

// get current state of snap secure storage
export async function getSnapStorage() : Promise<StorageContents | null> {
    const storedData = await snap.request({
        method: "snap_manageState",
        params: { operation: "get" },
    });

    return storedData as StorageContents | null;
}

export async function setSnapStorage(newState: Record<string, Json>) {
    await snap.request({
        method: "snap_manageState",
        params: {
        operation: "update",
        newState
        },
    });
}

async function displayDialogue(content : ComponentOrElement, type : 'alert' | 'confirmation' | 'prompt' ) {
    const result = await snap.request({
        method: 'snap_dialog',
        params: {
            type,
            content,
        },
    }); 

    return result;
}

// displays a dialogue window
export async function displayAlert(content : ComponentOrElement) {
    return await displayDialogue(content,'alert');
}

// displays a dialogue window with an 'approve' and 'deny' button
// returns true if the user approves, and false otherwisse
export async function displayConfirmation(content : ComponentOrElement) : Promise<boolean> {
    return (await displayDialogue(content,'confirmation')) === true;
}

// displays a dialogue window with a text input
// returns whatever the user types in the text box
export async function displayPrompt(content : ComponentOrElement) : Promise<string> {
    return (await displayDialogue(content,'prompt')) as string;
}


export async function getCredentialContents(vc: string) : Promise<CredentialContents> {
    // initialize did:ethr resolver
    const resolver = new Resolver({
        ...getEthrResolver({ infuraProjectId: INFURA_PROJECT_ID }),
    });
    
    // Verify the VC JWT
    const verificationResult = await verifyCredential(vc, resolver);

    return {
        vc,
        issuer: verificationResult.issuer,
        subject: verificationResult.payload.subject as string,
        claim: verificationResult.payload.vc.credentialSubject,
        claimString: JSON.stringify(verificationResult.payload.vc.credentialSubject, null, 2),
        jwt: verificationResult
    }
}

export async function getCredentialsContentList(storedCredentials : Credential[]) {
    const credentials = new Array<CredentialContents>();

    for (let i = 0; i < storedCredentials.length; i++) {
        const credential = storedCredentials[i];

        if (!credential) break;

        const credentialContents = await getCredentialContents(credential.vc);
        credentialContents.name = credential.name;
        credentialContents.uuid = credential.uuid;

        credentials.push(credentialContents);
    }

    return credentials;
}


export class DialogManager {
    private interfaceID: string | undefined;
    private userInput: UserInput | undefined;

    async WaitForInput() {
        try {
            const oldInput    = this.userInput;
            const oldInterface = this.interfaceID;

            await new Promise<void>((resolve, reject) => {        
                const checkInterval = setInterval(() => {
                    const currentInput = this.userInput;
                    const currentInterface = this.interfaceID;
                    
                    if (!(currentInput === oldInput) || !(currentInterface === oldInterface) || !currentInterface) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 10);
            });

            if (!(this.interfaceID === oldInterface) || !this.interfaceID) return undefined;

            return this.userInput;
        }
        finally {
            this.userInput = undefined;
        }
    }
    async WaitForDialogClose() {
        await new Promise<void>((resolve, reject) => {        
            const checkInterval = setInterval(() => {
                if (!this.interfaceID) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });

        return;
    }

    UseButton(buttonID : string | undefined, interfaceID : string | undefined) {
        if (buttonID && interfaceID && interfaceID === this.interfaceID) {
            this.userInput = {
                inputID: buttonID,
                inputType: "button"
            };
        }
    }

    UseDropdown(dropdownID : string | undefined, interfaceID : string | undefined) {
        if (dropdownID && interfaceID && interfaceID === this.interfaceID) {
            this.userInput = {
                inputID: dropdownID,
                inputType: "dropdown"
            };
        }
    }
    
    async UpdatePage(content : ComponentOrElement) {
        await snap.request({
            method: 'snap_updateInterface',
            params: { id: this.interfaceID as string, ui: content },
        });
    }

    async NewDialog() {
        // wait for any other dialog to close
        await this.WaitForDialogClose();

        this.interfaceID = await snap.request({
            method: 'snap_createInterface',
            params: { ui: this.emptyPage },
        });
    }

    async Render () {
        await snap.request({
            method: 'snap_dialog',
            params: { id: this.interfaceID as string },
        });

        this.interfaceID = undefined;
        this.userInput = undefined;
    }

    async GetFormContents() {
        return await snap.request({
            method: 'snap_getInterfaceState',
            params: {
                id: this.interfaceID as string,
            },
        });
    }

    async ShowLoadingPage() {
        this.UpdatePage(this.emptyPage);
    }

    private emptyPage = (
        <Box center={true}>
            <Heading>Loading...</Heading>
            <Spinner />
        </Box>
    )
}