import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { Box, Text, Bold, Heading } from '@metamask/snaps-sdk/jsx';

import { snapCreateDID, snapDialogTest, snapGetDid, snapGetVP, snapStoreVC } from './snap-methods'
import { onUserInput } from './snap-methods'

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
    origin,
    request,
}) => {
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
        case 'dialog-test': {
            const response = await snapDialogTest();
            return response;
        }
        default:
            throw new Error('Method not found.');
    }
};

export { onUserInput };