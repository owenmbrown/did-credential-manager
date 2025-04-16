import { Box, Divider, Heading, Italic, Section, SnapComponent, Text } from "@metamask/snaps-sdk/jsx";

import { InclusiveRow, DID } from "../components";
import { TripleRow } from "./TripleRow";

type CredentialCardProps = {
    verifiableCredential: {
        vc: string,
        name?: string | null,
        issuer: string,
        subject: string,
        claimString: string,
    },
    doCustomHeader?: boolean,
    customHeader?: any,
    doButtonRow?: boolean
    buttonRowLeft?: any
    buttonRowMiddle?: any
    buttonRowRight?: any
}

const INVISIBLE_SPACE = "‎ ";
export function preserveLeadingSpaces(text: string): string {
    return (text 
    .split('\n')
    .map((line) => {
    const leadingSpaces = line.match(/^ +/g)?.[0]?.length ?? 0;
    const invisiblePrefix = INVISIBLE_SPACE.repeat(leadingSpaces * 2);
    return invisiblePrefix + line.trimStart();
    })
    .join('\n'));
}

function renderMultilineText(content: string) {
    return content.split('\n').map((line, index) => (
        <Text><Italic>{preserveLeadingSpaces(line)}</Italic></Text>
    ));
}


export const CredentialCard: SnapComponent<CredentialCardProps> = ({ 
    verifiableCredential,
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
                <Text> </Text>
            </InclusiveRow>
            {renderMultilineText(verifiableCredential.claimString)}
            {
                doButtonRow ? (
                    <Box>
                        <Divider/>
                        <TripleRow 
                            left={buttonRowLeft}
                            middle={buttonRowMiddle}
                            right={buttonRowRight}
                            /> 
                    </Box>
                ) : null
            }
        </Section>
    );
};