import { Json } from '@metamask/snaps-sdk';
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