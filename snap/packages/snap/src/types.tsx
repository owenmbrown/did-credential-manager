import { VerifiedCredential } from "did-jwt-vc"

export type StoreVCParams = {
    vc: string
}

export type GetVPParams = {
    challenge: string
}

export type Credential = {
    name: string,
    uuid: string,
    vc: string,
}

export type StorageContents = {
    did: {
        privateKey : string,
        address: string,
        credentials: Array<Credential>
    }
}

export type CredentialContents = {
    vc: string,
    name?: string | null,
    uuid?: string | null,
    issuer: string,
    subject: string,
    claim: object,
    claimString: string,
    jwt: VerifiedCredential,
}

export type UserInteraction = {
    interactionType: "button" | "input", // input is a text input or a dropdown
    interactionID: string,
}