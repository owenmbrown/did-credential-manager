import { Box, Button, Divider, Form, Heading, Input, Section, SnapComponent, Text } from "@metamask/snaps-sdk/jsx";

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
    doNameInputField?: boolean,
    nameInputFieldID?: string,
    nameInputPlaceholder?: string
    nameInputContents?: string,
    doButtonRow?: boolean
    buttonRowComponent1?: any
    buttonRowComponent2?: any
    buttonRowComponent3?: any
}

export const CredentialCard: SnapComponent<CredentialCardProps> = ({ 
    verifiableCredential,
    doNameInputField = false,
    nameInputFieldID = "",
    nameInputPlaceholder = "",
    nameInputContents = "",
    doButtonRow = false,
    buttonRowComponent1 = null,
    buttonRowComponent2 = null,
    buttonRowComponent3 = null

}) => {
    return (
        <Section>
            {
                doNameInputField ? 
                    (
                        <Input name={nameInputFieldID} placeholder={nameInputPlaceholder} value={nameInputContents}/>
                    ) :
                    (
                        <Heading>
                            {
                                verifiableCredential.name ?? "Credential"
                            }
                        </Heading>
                    )
            }
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
                            item1={buttonRowComponent1}
                            item2={buttonRowComponent2}
                            item3={buttonRowComponent3}
                            /> 
                    </Box>) : null
            }
        </Section>
    );
};