import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { Box, Text, Bold } from '@metamask/snaps-sdk/jsx';

import { snapCreateDID, snapExportIdentity, snapGetAllCredentials, snapGetDid, snapGetVP, snapImportIdentity, snapManageVCs, snapStoreVC } from './snap-methods'
import { onUserInput } from './snap-methods'

const COMPANION_APP_ORIGIN = process.env.COMPANION_APP_ORIGIN

/**
 * Handles incoming JSON-RPC requests to the Snap via `wallet_invokeSnap`.
 *
 * This function acts as the main router for external RPC calls.
 * It validates the request method, enforces permission rules for sensitive operations,
 * and delegates handling to the appropriate Snap method.
 *
 * ## Security
 * Methods such as `create-did`, `manage-vcs`, `export-identity`, `import-identity`, and `get-all-vc`
 * are restricted to calls from the configured `COMPANION_APP_ORIGIN`. Requests from other origins
 * to these methods will be rejected with a permission error.
 *
 * @param {object} args - Request handler parameters.
 * @param {string} args.origin - The origin (e.g., website or dApp) that invoked the Snap.
 * @param {JsonRpcRequest} args.request - A validated JSON-RPC request object.
 *
 * @returns {Promise<any>} The response from the invoked Snap method or an error if the method is invalid.
 *
 * @throws {Error} If the requested method is not found.
 *
 * @supportedMethods
 * - `hello`: Display a test confirmation dialog
 * - `create-did`: Create and store a new DID (companion app only)
 * - `get-did`: Retrieve the stored DID
 * - `store-vc`: Store a verifiable credential
 * - `get-vp`: Generate a signed verifiable presentation
 * - `manage-vcs`: Edit/delete/recover stored credentials (companion app only)
 * - `export-identity`: Placeholder for exporting identity (companion app only)
 * - `import-identity`: Placeholder for importing identity (companion app only)
 * - `get-all-vcs`: Retrieve all credentials (companion app only)
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
    origin,
    request,
}) => {
    // companion app only method
    if (['create-did','manage-vcs','export-identity','import-identity','get-all-vc'].includes(request.method)) {
        if (origin !== COMPANION_APP_ORIGIN) {
            return {
                success: false,
                message: "you don't have permission to use this method"
            }
        }
    }

    switch (request.method) {
        case 'hello':
            return await snap.request({
                method: 'snap_dialog',
                params: {
                    type: 'confirmation',
                    content: (
                        <Box>
                        <Text>
                            Hello, <Bold>{origin}</Bold> from DID:ethr Credential Manager!
                        </Text>
                        <Text>
                            This custom confirmation is just for display purposes.
                        </Text>
                        </Box>
                    ),
                },
            });
        case 'create-did': // creates a new did:ethr and stores it in snap storage
            // companion app only method
            const response = await snapCreateDID();

            return response;
        case 'get-did': { // returns the stored did:ethr if it exists
            const response = await snapGetDid();

            return response;
        }
        case 'store-vc': {
            const response = await snapStoreVC(request);

            return response;
        }
        case 'get-vp': {
            const response = await snapGetVP(request);

            return response;
        }
        case 'manage-vcs': {
            // companion app only method
            const response = await snapManageVCs();

            return response;
        }
        case 'export-identity': {
            // companion app only method
            const response = await snapExportIdentity();

            return response;
        }
        case 'import-identity': {
            // companion app only method
            const response = await snapImportIdentity();

            return response;
        }
        case 'get-all-vcs': {
            // companion app only method
            const response = await snapGetAllCredentials();

            console.log(response);

            return response;
        }
        default:
            throw new Error('Method not found.');
    }
};

export { onUserInput };