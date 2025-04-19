import { Box, SnapComponent, Text, Bold } from "@metamask/snaps-sdk/jsx";

type InclusiveRowProps = {
    // the label to display on the left side of the row
    label: string;
    
    // the content to display on the right side of the row
    children: any;
};
  
/**
 * A custom UI row component for Snap dialogs that mimics MetaMask's `Row` component,
 * but allows rendering any arbitrary Snap content on the right side.
 *
 * Typically used for displaying key-value pairs where the left side is a label
 * and the right side can be text, buttons, inputs, or other components.
 *
 * @param label - The label displayed on the left side of the row.
 * @param children - The custom content rendered on the right side of the row.
 */
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