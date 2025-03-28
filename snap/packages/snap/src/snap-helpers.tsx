import { button, ComponentOrElement, Json } from '@metamask/snaps-sdk';
import { StoreVCParams, GetVPParams, StorageContents } from './types'
import { Box, Heading } from '@metamask/snaps-sdk/jsx';

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

export class DialogManager {
    private interfaceID: string | undefined;
    private buttonID: string | undefined;

    async WaitForButton() {
        const oldButton    = this.buttonID;
        const oldInterface = this.interfaceID;

        await new Promise<void>((resolve, reject) => {        
            const checkInterval = setInterval(() => {
                const currentButton = this.buttonID;
                const currentInterface = this.interfaceID;
                
                if (!(currentButton === oldButton) || !(currentInterface === oldInterface) || !currentInterface) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });

        if (!(this.interfaceID === oldInterface) || !this.interfaceID) return undefined;

        return this.buttonID;
    }

    PressButton(buttonID : string | undefined, interfaceID : string | undefined) {
        console.log("press button")
        console.log(`b: ${this.buttonID} : ${buttonID}`)
        console.log(`id: ${this.interfaceID} : ${interfaceID}`)
        if (buttonID && interfaceID && interfaceID === this.interfaceID) {
            this.buttonID = buttonID;
        }
    }
    
    async UpdatePage(content : ComponentOrElement) {
        await snap.request({
            method: 'snap_updateInterface',
            params: { id: this.interfaceID as string, ui: content },
        });
    }

    async NewDialog() {
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
    }

    async GetFormContents() {
        return await snap.request({
            method: 'snap_getInterfaceState',
            params: {
              id: this.interfaceID as string,
            },
        });
    }

    private emptyPage = (
        <Box>
            <Heading>Loading</Heading>
        </Box>
    )
}