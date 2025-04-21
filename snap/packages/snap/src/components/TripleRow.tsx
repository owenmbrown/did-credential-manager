import { Box, SnapComponent } from "@metamask/snaps-sdk/jsx";

type TripleRowProps = {
    left: any;
    middle: any;
    right: any;
  };
  
/**
 * A custom UI row component that mimics MetaMask's `Row` layout but supports three aligned content blocks.
 *
 * This component is useful when you need to show left, middle, and right-aligned elements
 * (e.g., label, status indicator, action button) in a single horizontal row.
 *
 * @param left - Content rendered on the left side of the row.
 * @param middle - Content rendered in the center of the row.
 * @param right - Content rendered on the right side of the row.
 */
export const TripleRow: SnapComponent<TripleRowProps> = ({ 
    left,
    middle,
    right
}) => {
    return (
        <Box direction="horizontal" alignment="space-between">
            <Box>
                {left}
            </Box>
            <Box>
                {middle}
            </Box>
            <Box>
                {right}
            </Box>
        </Box>
    );
};