import { VerifiedCredential } from "did-jwt-vc"

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

export type CredentialContents = {
    vc: string,
    name?: string | null,
    issuer: string,
    subject: string,
    claim: object,
    claimString: string,
    jwt: VerifiedCredential,
}