import { Box, Tooltip, Text, Heading, Bold } from "@metamask/snaps-sdk/jsx"
import type { SnapComponent } from "@metamask/snaps-sdk/jsx";


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

/**
 * Props for the DID component
 */
type DIDProps = {
    /**
     * The DID to display, e.g. 'did:ethr:0x1234567890abcdef...'
     */
    did: string;
    /**
     * Optional number of characters to show at the beginning (before truncation)
     */
    prefixLength?: number;
    /**
     * Optional number of characters to show at the end (after truncation)
     */
    suffixLength?: number;
};
  
  /**
   * A component that displays a truncated DID with the full DID shown on hover.
   * Similar to the Address component but specialized for DIDs.
   */
export const DID: SnapComponent<DIDProps> = ({ 
    did, 
    prefixLength = 13,
    suffixLength = 4 
}) => {
    // Handle invalid or empty DID
    if (!did) {
        return <Text>Invalid DID</Text>;
    }
    
    // Truncate the DID
    const truncated = truncateDID(did, prefixLength, suffixLength);
    
    return (
        <Tooltip content={did}>
            <Text>{truncated}</Text>
        </Tooltip>
    );
  };
  

function truncateDID(did: string, prefixLength: number, suffixLength: number): string {
    if (did.length <= prefixLength + suffixLength + 3) {
        return did; // No need to truncate if it's already short
    }

    const prefix = did.substring(0, prefixLength);
    const suffix = did.substring(did.length - suffixLength);

    return `${prefix}...${suffix}`;
}

/**
 * Props for the InclusiveRow component
 */
type InclusiveRowProps = {
    /**
     * The label to display on the left side of the row
     */
    label: string;
    
    /**
     * The content to display on the right side of the row
     */
    children: any;
    
    /**
     * Optional boolean to make the label a heading
     */
    isHeading?: boolean;
  };
  
/**
 * A custom row component that mimics the MetaMask Row component
 * but allows any content
*/
export const InclusiveRow: SnapComponent<InclusiveRowProps> = ({ 
    label, 
    children, 
    isHeading = false,
}) => {
    return (
        <Box direction="horizontal" alignment="space-between">
            <Box>
            {isHeading ? (
                <Heading>{label}</Heading>
            ) : (
                <Text><Bold>{label}</Bold></Text>
            )}
            </Box>
            <Box>
            {children}
            </Box>
        </Box>
    );
};