import { Heading, Section, SnapComponent, Text } from "@metamask/snaps-sdk/jsx";

import { InclusiveRow, DID } from "../components";
import { CredentialContents } from "src/types";

type CredentialCardProps = {
    verifiableCredential: {
        vc: string,
        name?: string | null,
        issuer: string,
        subject: string,
        claimString: string,
    }
}

export const CredentialCard: SnapComponent<CredentialCardProps> = ({ 
    verifiableCredential
}) => {
    return (
        <Section>
            <Heading>
                {
                    verifiableCredential.name ?? "Credential"
                }
            </Heading>
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