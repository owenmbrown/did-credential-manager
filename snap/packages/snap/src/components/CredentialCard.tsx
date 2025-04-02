import { Bold, Box, Button, Divider, Form, Heading, Input, Section, SnapComponent, Text } from "@metamask/snaps-sdk/jsx";

import { InclusiveRow, DID } from "../components";
import { CredentialContents } from "src/types";
import { TripleRow } from "./TripleRow";

type CredentialCardProps = {
    verifiableCredential: {
        vc: string,
        name?: string | null,
        issuer: string,
        subject: string,
        claimString: string,
    },
    // doNameInputField?: boolean,
    // nameInputFieldID?: string,
    // nameInputPlaceholder?: string
    // nameInputContents?: string,
    doCustomHeader?: boolean,
    customHeader?: any,
    doButtonRow?: boolean
    buttonRowLeft?: any
    buttonRowMiddle?: any
    buttonRowRight?: any
}

export const CredentialCard: SnapComponent<CredentialCardProps> = ({ 
    verifiableCredential,
    // doNameInputField = false,
    // nameInputFieldID = "",
    // nameInputPlaceholder = "",
    // nameInputContents = "",
    doCustomHeader = false,
    customHeader = null,
    doButtonRow = false,
    buttonRowLeft = null,
    buttonRowMiddle = null,
    buttonRowRight = null,
}) => {
    return (
        <Section>
            {
                doCustomHeader ? 
                    (customHeader) :
                    (
                        <Heading>
                            {
                                verifiableCredential.name ?? "Credential"
                            }
                        </Heading>
                    )
            }
            <Divider/>
            <InclusiveRow label="Issuer">
                <DID did={verifiableCredential.issuer} />
            </InclusiveRow>
            <InclusiveRow label="Subject (you)">
                <DID did={verifiableCredential.subject} />
            </InclusiveRow>
            <InclusiveRow label="Claim">
                <Text>{verifiableCredential.claimString}</Text>
            </InclusiveRow>
            {
                doButtonRow ? (
                    <Box>
                        <Divider/>
                        <TripleRow 
                            left={buttonRowLeft}
                            middle={buttonRowMiddle}
                            right={buttonRowRight}
                            /> 
                    </Box>) : null
            }
        </Section>
    );
};