import { agent } from './veramo/setup'

export default async function createCredentials() {
    const identifier = await agent.didManagerGetByAlias({ alias: 'default' })

    const verifiableCredential = await agent.createVerifiableCredential({
        credential: {
        issuer: { id: identifier.did },
        credentialSubject: {
            id: 'did:web:example.com',
            you: 'Rock',
        },
        },
        proofFormat: 'jwt',
    })

    return verifiableCredential
}

