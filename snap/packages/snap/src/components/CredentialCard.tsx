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

/**
 * A component that displays the contents of a Verifiable Credential (VC) in a card-style layout.
 *
 * The card includes the credential's name (or a fallback title), issuer and subject DIDs, and a formatted claim string.
 * Optionally, you can customize the header and add an action button row using the provided props.
 *
 * @param verifiableCredential - The credential object to display, including:
 *   - `vc`: The raw VC JWT string.
 *   - `name`: A display label for the credential.
 *   - `issuer`: The DID of the credential issuer.
 *   - `subject`: The DID of the credential subject (typically the user).
 *   - `claimString`: A formatted string describing the claims.
 * @param doCustomHeader - Whether to render a custom header instead of the default name heading.
 * @param customHeader - A custom JSX element to render as the card's header.
 * @param doButtonRow - Whether to show the action button row at the bottom of the card.
 * @param buttonRowLeft - JSX content for the left button slot.
 * @param buttonRowMiddle - JSX content for the center button slot.
 * @param buttonRowRight - JSX content for the right button slot.
 */
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