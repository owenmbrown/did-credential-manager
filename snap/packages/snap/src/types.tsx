import { VerifiedCredential } from "did-jwt-vc"

export type StoreVCParams = {
    vc: string, // the verifiable credential jwt i.e. 'eyJhbGciOiJFUzI1Nks...'
    defaultName: string // default name for the credential, can be redefined by the user  i.e. 'US Driver's License'
    type: string // the type of credential i.e. 'us-drivers-license'
}

export type GetVPParams = {
    challenge: string, // a challenge string to be included in the VP to prevent ensure each VP is only used once
    validTypes: string | Array<string> // the type(s) of credentials that will be checked for in the wallet i.e. 'us-drivers-license' or ['us-drivers-license','canada-drivers-license']
}

export type Credential = {
    name: string, // a display name given by default, or redefined by the user  i.e. 'My Driver's License'
    uuid: string, // a unique identifier to reference this credential in storage
    type: string, // the type of credential i.e. 'us-drivers-license'
    vc: string, // the verifiable credential jwt i.e. 'eyJhbGciOiJFUzI1Nks...'
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
    type?: string
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