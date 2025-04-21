import { VerifiedCredential } from "did-jwt-vc"

/**
 * Parameters used when storing a Verifiable Credential (VC).
 */
export type StoreVCParams = {
    /**
     * The Verifiable Credential JWT (e.g., 'eyJhbGciOi...').
     */
    vc: string;

    /**
     * A default user-visible name for the credential (can be edited later).
     * Example: "US Driver's License"
     */
    defaultName: string;

    /**
     * The internal type of credential, used for filtering and VP generation.
     * Example: 'us-drivers-license'
     */
    type: string;
};

/**
 * Parameters used when generating a Verifiable Presentation (VP).
 */
export type GetVPParams = {
    /**
     * A challenge string to bind the VP to a specific session and prevent replay attacks.
     */
    challenge: string;

    /**
     * A single credential type or array of valid credential types to filter stored credentials.
     * Example: 'us-drivers-license' or ['us-drivers-license', 'passport']
     */
    validTypes: string | Array<string>;
};

/**
 * Minimal stored credential format inside Snap storage.
 */
export type Credential = {
    /**
     * User-defined or default name for display.
     */
    name: string;

    /**
     * Unique identifier used to reference this credential.
     */
    uuid: string;

    /**
     * Credential type for filtering/grouping (e.g., 'us-drivers-license').
     */
    type: string;

    /**
     * The raw Verifiable Credential as a JWT string.
     */
    vc: string;
};

/**
 * Structure of the Snap's secure storage.
 */
export type StorageContents = {
    did: {
        /**
         * Private key associated with the stored DID.
         */
        privateKey: string;

        /**
         * DID address string (e.g., 'did:ethr:0xabc123...').
         */
        address: string;

        /**
         * List of all credentials associated with the DID.
         */
        credentials: Array<Credential>;
    };
};

/**
 * Enriched credential details used internally by Snap for display and verification.
 */
export type CredentialContents = {
    /**
     * The raw VC JWT string.
     */
    vc: string;

    /**
     * Display name for the credential.
     */
    name?: string | null;

    /**
     * Unique credential identifier.
     */
    uuid?: string | null;

    /**
     * The credential's defined type.
     */
    type?: string;

    /**
     * DID of the issuer.
     */
    issuer: string;

    /**
     * DID of the subject (typically the user's DID).
     */
    subject: string;

    /**
     * Parsed claims extracted from the VC payload.
     */
    claim: object;

    /**
     * A human-readable string describing the credential's claim (e.g., "Email: alice@example.com").
     */
    claimString: string;

    /**
     * Fully verified JWT credential object.
     */
    jwt: VerifiedCredential;

    /**
     * Temporary flag indicating the credential is marked for deletion.
     */
    deleted?: boolean;

    /**
     * Temporary flag indicating the credential has been edited.
     */
    edited?: boolean;

    /**
     * Original name prior to edit (used for restoring).
     */
    oldName?: string;
    };

    /**
     * Represents a user interaction in a Snap dialog.
     */
    export type UserInteraction = {
    /**
     * Type of interaction: 'button' for clicks, 'input' for dropdowns/text fields.
     */
    interactionType: "button" | "input";

    /**
     * Identifier for the interacted UI element.
     */
    interactionID: string;
};
  
/**
 * Return type used by `snapGetAllCredentials()` to return all enriched credentials.
 */
export type AllCredentials = {
    /**
     * Whether the retrieval was successful.
     */
    success: boolean;
  
    /**
     * The full list of available credentials.
     */
    credentials: Array<{
        vc: string;
        name: string;
        uuid: string;
        type: string;
        issuer: string;
        claim: any;
        subject: string;
        claimString: string;
    }>;
};
  