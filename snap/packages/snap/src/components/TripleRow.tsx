import { Box, SnapComponent } from "@metamask/snaps-sdk/jsx";

type TripleRowProps = {
    // // the label to display on the left side of the row
    // label: string;
    
    // // the content to display on the right side of the row
    // children: any;

    item1: any;
    item2: any;
    item3: any;
  };
  
// a custom row component that mimics the MetaMask Row component, but allows any content
export const TripleRow: SnapComponent<TripleRowProps> = ({ 
    item1,
    item2,
    item3
}) => {
    return (
        <Box direction="horizontal" alignment="space-between">
            <Box>
                {item1}
            </Box>
            <Box>
                {item2}
            </Box>
            <Box>
                {item3}
            </Box>
        </Box>
    );
};