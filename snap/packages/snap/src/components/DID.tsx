import { SnapComponent, Tooltip, Text } from "@metamask/snaps-sdk/jsx";


type DIDProps = {
    // the DID to display, e.g. 'did:ethr:0x1234567890abcdef...'
    did: string;

    // optional number of characters to show at the beginning (before truncation)
    prefixLength?: number;

    // optional number of characters to show at the end (after truncation)
    suffixLength?: number;
};
  
// a component that displays a truncated DID with the full DID shown on hover.
// similar to the Address component but specialized for DIDs.
export const DID: SnapComponent<DIDProps> = ({ 
    did, 
    prefixLength = 13,
    suffixLength = 4 
}) => {
    // handle invalid or empty DID
    if (!did) {
        return <Text>Invalid DID</Text>;
    }
    
    // truncate the DID
    const truncated = truncateDID(did, prefixLength, suffixLength);
    
    return (
        <Tooltip content={did}>
            <Text>{truncated}</Text>
        </Tooltip>
    );
};
  
// helper function to truncate the did
function truncateDID(did: string, prefixLength: number, suffixLength: number): string {
    if (did.length <= prefixLength + suffixLength + 3) {
        return did; // No need to truncate if it's already short
    }

    const prefix = did.substring(0, prefixLength);
    const suffix = did.substring(did.length - suffixLength);

    return `${prefix}...${suffix}`;
}