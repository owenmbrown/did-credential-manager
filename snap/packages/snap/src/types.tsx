export type StoreVCParams = {
    vc: string
}

export type GetVPParams = {
    challenge: string
}

export type StorageContents = {
    did: {
        privateKey : string,
        address: string,
        vc: string
    }
}