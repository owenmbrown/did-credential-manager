import { Box, SnapComponent } from "@metamask/snaps-sdk/jsx";

type TripleRowProps = {
    // // the label to display on the left side of the row
    // label: string;
    
    // // the content to display on the right side of the row
    // children: any;

    left: any;
    middle: any;
    right: any;
  };
  
// a custom row component that mimics the MetaMask Row component, but allows any content
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