import { Box, SnapComponent, Text, Bold } from "@metamask/snaps-sdk/jsx";

type InclusiveRowProps = {
    // the label to display on the left side of the row
    label: string;
    
    // the content to display on the right side of the row
    children: any;
  };
  
// a custom row component that mimics the MetaMask Row component, but allows any content
export const InclusiveRow: SnapComponent<InclusiveRowProps> = ({ 
    label, 
    children,
}) => {
    return (
        <Box direction="horizontal" alignment="space-between">
            <Box>
                <Text><Bold>{label}</Bold></Text>
            </Box>
            <Box>
                {children}
            </Box>
        </Box>
    );
};