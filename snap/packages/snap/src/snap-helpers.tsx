import { ComponentOrElement, Json } from '@metamask/snaps-sdk';
import { Box, Heading, Spinner } from '@metamask/snaps-sdk/jsx';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { Resolver } from 'did-resolver';
import { verifyCredential } from 'did-jwt-vc';

import { StorageContents, CredentialContents, Credential, UserInteraction } from './types';

/**
 * Infura Project ID used to initialize the DID resolver.
 * Must be set in environment variables.
 */
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

/**
 * Error message returned when the user rejects a dialog interaction.
 * Used in Snap RPC responses like `snapStoreVC`, `snapGetVP`, etc.
 */
export const ERROR_USER_REJECTED = "user rejected dialogue";

/**
 * Error message returned when a DID has not yet been created or stored.
 * Common in methods like `get-did`, `store-vc`, and `get-all-vcs`.
 */
export const ERROR_NO_DID = "no did is stored";

/**
 * Generic error message used when an unhandled runtime exception occurs.
 */
export const ERROR_RUNTIME = "runtime error";


/**
 * Retrieves the current Snap state from secure storage.
 *
 * This function uses the `snap_manageState` method to fetch the Snap's persisted state.
 * If no data has been stored yet, it returns `null`.
 *
 * @returns {Promise<StorageContents | null>} A promise resolving to the current storage contents,
 * or `null` if no DID has been created or stored yet.
 *
 * @sideEffect None. This is a read-only state retrieval.
 */
export async function getSnapStorage() : Promise<StorageContents | null> {
    const storedData = await snap.request({
        method: "snap_manageState",
        params: { operation: "get" },
    });

    return storedData as StorageContents | null;
}

/**
 * Updates the Snap's secure storage with new state data.
 *
 * This replaces the current Snap state with the provided `newState` object.
 * Use this to persist DID-related data such as credentials or keys.
 *
 * @param newState - A JSON-serializable object to store in Snap state.
 *
 * @returns {Promise<ManageStateResult>} A promise that resolves once the state has been updated.
 *
 * @sideEffect Persists data to Snap's internal state using `snap_manageState`.
 */
export async function setSnapStorage(newState: Record<string, Json>) {
    await snap.request({
        method: "snap_manageState",
        params: {
        operation: "update",
        newState
        },
    });
}

/**
 * Verifies a Verifiable Credential (VC) JWT and extracts its structured contents.
 *
 * This function uses the `did:ethr` resolver (via Infura) to verify the VC signature,
 * then parses out relevant fields like issuer, subject, and claims.
 *
 * @param vc - The Verifiable Credential JWT to verify and parse.
 *
 * @returns {Promise<CredentialContents>} A structured representation of the credential including parsed claim data and the verified JWT payload.
 *
 * @throws If the credential cannot be verified or is malformed.
 *
 * @sideEffect Initializes a DID resolver using Infura to verify the VC.
 */
export async function getCredentialContents(vc : string) : Promise<CredentialContents> {
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

/**
 * Converts a list of stored Verifiable Credentials into enriched `CredentialContents` objects.
 *
 * This function verifies each VC using `getCredentialContents()` and augments it with
 * additional metadata from Snap storage (e.g., name, UUID, type).
 *
 * @param storedCredentials - An array of raw stored credentials from Snap state.
 *
 * @returns {Promise<CredentialContents[]>} A list of enriched credential objects, ready for display or processing.
 *
 * @throws If any credential fails verification or is malformed.
 *
 * @sideEffect Calls `getCredentialContents()` for each credential, which performs DID resolution.
 */
export async function getCredentialsContentList(storedCredentials : Credential[]) {
    const credentials = new Array<CredentialContents>();

    for (let i = 0; i < storedCredentials.length; i++) {
        const credential = storedCredentials[i];

        if (!credential) break;

        const credentialContents = await getCredentialContents(credential.vc);
        credentialContents.name = credential.name;
        credentialContents.uuid = credential.uuid;
        credentialContents.type = credential.type;
        credentialContents.oldName = credential.name;
        
        credentials.push(credentialContents);
    }

    return credentials;
}


/**
 * Manages the lifecycle and interaction of Snap UI dialogs.
 *
 * The `DialogManager` handles creating, rendering, updating, and closing Snap interfaces,
 * and tracks user interactions such as button presses and dropdown selections.
 */
export class DialogManager {
    /**
     * Internal Snap UI interface ID assigned when a dialog is created.
     */
    private interfaceID: string | undefined;
  
    /**
     * The most recent user interaction (button or input).
     */
    private userInteraction: UserInteraction | undefined;
  
    /**
     * Waits for the user to interact with the Snap dialog (button or input).
     * Resolves once a new interaction is detected or the interface is closed.
     *
     * @returns {Promise<UserInteraction | undefined>} The recorded user interaction, or `undefined` if the dialog was closed.
     */
    async WaitForInteraction() {
      try {
        const oldInteraction = this.userInteraction;
        const oldInterface = this.interfaceID;
  
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            const currentInteraction = this.userInteraction;
            const currentInterface = this.interfaceID;
  
            if (
              !(currentInteraction === oldInteraction) ||
              !(currentInterface === oldInterface) ||
              !currentInterface
            ) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 10);
        });
  
        if (!(this.interfaceID === oldInterface) || !this.interfaceID) return undefined;
  
        return this.userInteraction;
      } finally {
        this.userInteraction = undefined;
      }
    }
  
    /**
     * Waits until any existing dialog has been closed (i.e., `interfaceID` is cleared).
     *
     * @returns {Promise<void>} Resolves once the dialog has fully closed.
     */
    async WaitForDialogClose() {
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.interfaceID) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
  
    /**
     * Manually triggers a button interaction if the button and interface IDs match.
     *
     * @param buttonID - The ID of the button element.
     * @param interfaceID - The interface from which the interaction originated.
     */
    UseButton(buttonID: string | undefined, interfaceID: string | undefined) {
      if (buttonID && interfaceID && interfaceID === this.interfaceID) {
        this.userInteraction = {
          interactionID: buttonID,
          interactionType: "button",
        };
      }
    }
  
    /**
     * Manually triggers a dropdown or input interaction if the interface IDs match.
     *
     * @param dropdownID - The ID of the dropdown or input.
     * @param interfaceID - The interface from which the interaction originated.
     */
    UseDropdown(dropdownID: string | undefined, interfaceID: string | undefined) {
      if (dropdownID && interfaceID && interfaceID === this.interfaceID) {
        this.userInteraction = {
          interactionID: dropdownID,
          interactionType: "input",
        };
      }
    }
  
    /**
     * Updates the current page content in the Snap dialog.
     *
     * @param content - The new UI component to display in the dialog.
     */
    async UpdatePage(content: ComponentOrElement) {
      await snap.request({
        method: "snap_updateInterface",
        params: { id: this.interfaceID as string, ui: content },
      });
    }
  
    /**
     * Opens a new Snap dialog and stores the interface ID.
     * Automatically waits for previous dialogs to close.
     */
    async NewDialog() {
      await this.WaitForDialogClose();
  
      this.interfaceID = await snap.request({
        method: "snap_createInterface",
        params: { ui: this.emptyPage },
      });
    }
  
    /**
     * Triggers the Snap dialog to render and waits for it to close.
     * Resets the internal interaction state after completion.
     */
    async Render() {
      await snap.request({
        method: "snap_dialog",
        params: { id: this.interfaceID as string },
      });
  
      this.interfaceID = undefined;
      this.userInteraction = undefined;
    }
  
    /**
     * Retrieves the current state of the user form from the dialog (e.g., inputs, dropdowns).
     *
     * @returns {Promise<Record<string, string>>} The form data keyed by input name.
     */
    async GetFormContents() {
      return await snap.request({
        method: "snap_getInterfaceState",
        params: {
          id: this.interfaceID as string,
        },
      });
    }
  
    /**
     * Replaces the current page with a centered loading spinner and "Loading..." header.
     */
    async ShowLoadingPage() {
      this.UpdatePage(this.emptyPage);
    }
  
    /**
     * Internal UI shown during loading transitions.
     */
    private emptyPage = (
      <Box center={true}>
        <Heading>Loading...</Heading>
        <Spinner />
      </Box>
    );
}
  