import { ComponentOrElement, Json } from '@metamask/snaps-sdk';
import { StoreVCParams, GetVPParams, StorageContents } from './types'

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