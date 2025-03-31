import { Form, Heading, Input, Section, SnapComponent, Text } from "@metamask/snaps-sdk/jsx";

import { InclusiveRow, DID } from "../components";
import { CredentialContents } from "src/types";

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
}

export const CredentialCard: SnapComponent<CredentialCardProps> = ({ 
    verifiableCredential,
    doNameInputField = false,
    nameInputFieldID = "",
    nameInputPlaceholder = "",
    nameInputContents = "",
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
        </Section>
    );
};