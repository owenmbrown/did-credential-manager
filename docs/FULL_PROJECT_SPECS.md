# DID Credential Manager - Complete Message Flow Documentation

## System Overview

This DID Credential Manager implements a decentralized identity (DID) system with three primary actors:
- **Issuer**: Issues verifiable credentials to holders
- **Holder**: Stores credentials and presents them to verifiers
- **Verifier**: Requests and verifies presentations from holders

The system uses **DIDComm v2.1** for encrypted peer-to-peer messaging and **did:peer** for self-sovereign identities.

---

## Architecture Overview

### Three Main Actors

```
┌─────────────┐                    ┌─────────────┐                    ┌──────────────┐
│   ISSUER    │◄───Offer/Issue────►│   HOLDER    │◄──Request/Send────►│   VERIFIER   │
│  (DID:peer) │                    │  (DID:peer) │                    │  (DID:peer)  │
└─────────────┘                    └─────────────┘                    └──────────────┘
  Port: 5001                         Port: 5003                         Port: 5002
```

### Communication Protocol Stack

```
Application Layer (HTTP REST APIs)
           ↓
DIDComm Protocol Layer (Protocols: issue-credential, present-proof, oob)
           ↓
Message Packing/Encryption Layer (DIDComm v2.1)
           ↓
Transport Layer (HTTP POST to messaging service endpoints)
```

---

## Decentralized Identifiers (DIDs)

### What are Service DIDs?

Each actor (Issuer, Holder, Verifier) in the system has a unique **did:peer** identifier that serves as their self-sovereign digital identity. These DIDs are:

- **Self-Generated**: Created locally without any central authority or registration
- **Cryptographically Verifiable**: Contain public keys that can verify signatures
- **Resolvable**: Can be resolved to a DID Document containing keys and service endpoints
- **Persistent**: Remain the same throughout the actor's lifetime unless explicitly rotated

### What DIDs Store

A DID is essentially a pointer to a **DID Document** which contains:

1. **Verification Keys (Ed25519)**
   - Used for signing credentials (Issuer)
   - Used for signing presentations (Holder)
   - Used for authentication in DIDComm messages
   - 32-byte public keys for signature verification

2. **Key Agreement Keys (X25519)**
   - Used for encryption/decryption of DIDComm messages
   - Enables secure peer-to-peer communication
   - 32-byte public keys for ECDH key agreement

3. **Service Endpoints**
   - HTTP URLs where the actor can receive DIDComm messages
   - Specifies supported message types and formats
   - Routing information for message delivery

### DID Format: did:peer:2

The system uses **did:peer:2** (numalgo 2), which encodes genesis key material directly in the identifier:

```
did:peer:2.Ez6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc
           │ └─────────────────────────────────────────────┘
           │                    │
    numalgo 2          Base58-encoded multibase
                       key material
```

**Structure Breakdown**:
- `did:peer:` - DID method prefix
- `2` - Numalgo (number algorithm) indicating method 2
- `.Ez6LS...` - Base58-encoded multibase string containing key material

### Example: Complete DID Document (Decoded)

Here's what a typical Issuer DID resolves to:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1",
    "https://w3id.org/security/suites/x25519-2020/v1"
  ],
  "id": "did:peer:2.Ez6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc",
  
  "verificationMethod": [
    {
      "id": "did:peer:2.Ez6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc#key-1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:peer:2.Ez6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc",
      "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
    },
    {
      "id": "did:peer:2.Ez6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc#key-2",
      "type": "X25519KeyAgreementKey2020",
      "controller": "did:peer:2.Ez6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc",
      "publicKeyMultibase": "z6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc"
    }
  ],
  
  "authentication": [
    "did:peer:2.Ez6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc#key-1"
  ],
  
  "assertionMethod": [
    "did:peer:2.Ez6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc#key-1"
  ],
  
  "keyAgreement": [
    "did:peer:2.Ez6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc#key-2"
  ],
  
  "service": [
    {
      "id": "did:peer:2.Ez6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc#didcomm",
      "type": "DIDCommMessaging",
      "serviceEndpoint": {
        "uri": "http://localhost:5001/didcomm",
        "accept": ["didcomm/v2"],
        "routingKeys": []
      }
    }
  ]
}
```

### Field Explanations

**verificationMethod Array**:
- Contains all cryptographic keys associated with this DID
- Each key has a unique fragment identifier (`#key-1`, `#key-2`)
- Keys are encoded in multibase format (base58 with `z` prefix)

**Key-1 (Ed25519VerificationKey2020)**:
- **Purpose**: Digital signatures and authentication
- **Type**: Ed25519 elliptic curve signature algorithm
- **Size**: 32-byte public key
- **Used For**:
  - Signing verifiable credentials (when this DID is an Issuer)
  - Signing verifiable presentations (when this DID is a Holder)
  - Authenticating DIDComm messages
- **Private Key**: Stored securely in local key store, never shared
- **Public Key**: `z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK`

**Key-2 (X25519KeyAgreementKey2020)**:
- **Purpose**: Key agreement for encryption
- **Type**: X25519 elliptic curve Diffie-Hellman
- **Size**: 32-byte public key
- **Used For**:
  - Deriving shared secrets with other parties
  - Encrypting DIDComm messages using ECDH
  - Decrypting incoming DIDComm messages
- **Private Key**: Stored securely in local key store, never shared
- **Public Key**: `z6LSbysY2xFMRpGMhb7tFTLMpeuPRaqaWM1yECx2AtzE3KCc`

**authentication Array**:
- Lists keys that can be used to authenticate as this DID
- References `#key-1` (Ed25519 verification key)
- Used when proving control of this identity

**assertionMethod Array**:
- Lists keys that can be used to issue assertions (credentials)
- References `#key-1` for the Issuer
- This is how verifiers know which key signed a credential

**keyAgreement Array**:
- Lists keys that can be used for key agreement protocols
- References `#key-2` (X25519 key agreement key)
- Required for encrypted message exchange

**service Array**:
- Defines service endpoints where this DID can be reached
- **uri**: HTTP endpoint for receiving DIDComm messages
  - Issuer: `http://localhost:5001/didcomm`
  - Holder: `http://localhost:5003/didcomm`
  - Verifier: `http://localhost:5002/didcomm`
- **accept**: Supported DIDComm versions (`didcomm/v2`)
- **routingKeys**: Additional keys for message routing (empty for direct messaging)

### What DIDs Do NOT Store

Important: DIDs and DID Documents do NOT contain:
- Private keys (always kept secret in local key store)
- Personal information (name, address, etc.)
- Credentials (stored separately in credential store)
- Message history or conversation data
- Authentication tokens or passwords

### How DIDs Enable Decentralization

1. **No Central Registry**: Each actor generates their own DID locally using cryptographic keys
2. **Self-Sovereign**: Actors fully control their DIDs without relying on external authorities
3. **Verifiable**: Anyone can verify signatures using the public keys in the DID Document
4. **Peer-to-Peer**: Actors communicate directly using each other's service endpoints
5. **Portable**: DIDs can be resolved and used across different systems and platforms

### DID Lifecycle in the System

```
┌─────────────────────────────────────────────────────────┐
│ 1. DID Generation (On Service Startup)                  │
│    ├─ Generate Ed25519 key pair (signing)               │
│    ├─ Generate X25519 key pair (encryption)             │
│    ├─ Create DID Document with keys + service endpoint  │
│    ├─ Encode keys in did:peer:2 format                  │
│    └─ Store private keys in secure key store            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. DID Usage (During Communication)                     │
│    ├─ Include DID in message "from" field               │
│    ├─ Other parties resolve DID to get public keys      │
│    ├─ Public keys used to verify signatures             │
│    ├─ Public keys used to encrypt messages to this DID  │
│    └─ Service endpoint used to deliver messages         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. DID Resolution (When Receiving a DID)                │
│    ├─ Parse did:peer:2 format                           │
│    ├─ Decode multibase key material                     │
│    ├─ Reconstruct DID Document with keys + services     │
│    ├─ Extract public keys for verification/encryption   │
│    └─ Extract service endpoint for message delivery     │
└─────────────────────────────────────────────────────────┘
```

### System DIDs Summary

Each actor in the system maintains their own DID:

| Actor | DID Purpose | Keys Used | Service Endpoint |
|-------|-------------|-----------|------------------|
| **Issuer** | Identity of credential issuer | Ed25519 (signs VCs)<br>X25519 (receives messages) | http://localhost:5001/didcomm |
| **Holder** | Identity of credential holder | Ed25519 (signs VPs)<br>X25519 (receives messages) | http://localhost:5003/didcomm |
| **Verifier** | Identity of credential verifier | Ed25519 (authenticates)<br>X25519 (receives messages) | http://localhost:5002/didcomm |

All DIDs are functionally equivalent - the role (Issuer/Holder/Verifier) is determined by how the DID is used in the protocols, not by the DID structure itself.

---

## Message Types & Protocols

### 1. Out-of-Band (OOB) Protocol v2.0

**Purpose**: Bootstrap initial connections and share invitations with embedded offers or requests.

**Structure**:
```json
{
  "@type": "https://didcomm.org/out-of-band/2.0/invitation",
  "@id": "uuid",
  "from": "did:peer:...",
  "body": {
    "goal_code": "issue-vc" | "verify-credentials",
    "goal": "human-readable description",
    "accept": ["didcomm/v2", "didcomm/aip2;env=rfc587"]
  },
  "attachments": [{
    "id": "uuid",
    "media_type": "application/json",
    "data": {
      "json": { /* embedded offer or request */ }
    }
  }],
  "created_time": timestamp,
  "expires_time": timestamp
}
```

**Key Features**:
- ✅ **NOT encrypted** - shared via QR code or URL
- Typically embedded with credential offers or presentation requests
- Can contain embedded DIDComm messages
- Time-limited with `expires_time`
- Can be transmitted via QR code, URL, or email

**Transport**:
- Browser/QR code → Base64URL encoded in query param: `?oob=eyJ...`
- Decoded by recipient to extract full invitation

---

### 2. Issue Credential Protocol v3.0

**Purpose**: Multi-step credential issuance with holder control.

#### Message Flow Sequence

```
HOLDER                           ISSUER
  │                                │
  ├──1. Propose-Credential────────►│
  │                                │
  │◄──2. Offer-Credential──────────┤
  │                                │
  ├──3. Request-Credential────────►│
  │                                │
  │◄──4. Issue-Credential──────────┤
  │                                │
  ├──5. Ack───────────────────────►│
  │                                │
```

#### Message 1: Propose-Credential

**Type**: `https://didcomm.org/issue-credential/3.0/propose-credential`

**Sender**: Holder  
**Receiver**: Issuer

**Content**:
```json
{
  "@type": "https://didcomm.org/issue-credential/3.0/propose-credential",
  "@id": "uuid-propose-1",
  "from": "did:peer:...(holder)",
  "to": ["did:peer:...(issuer)"],
  "created_time": timestamp,
  "body": {
    "goal_code": "issue-vc",
    "comment": "Requesting DriversLicense credential",
    "credential_preview": {
      "@type": "https://didcomm.org/issue-credential/3.0/credential-preview",
      "attributes": {
        "name": "John Doe",
        "age": 25,
        "address": "123 Main St"
      }
    }
  },
  "attachments": [ /* optional */ ]
}
```

**Storage**: Stored in sender's message queue  
**Encryption**: 
- Packed using **ECDH-ES+HKDF-512 with ChaCha20Poly1305** (XChaCha20Poly1305)
- Recipient's public key (X25519 key agreement key) used to derive shared secret
- Sender's key included for authentication
- Result: JWE format sent over HTTP

---

#### Message 2: Offer-Credential

**Type**: `https://didcomm.org/issue-credential/3.0/offer-credential`

**Sender**: Issuer  
**Receiver**: Holder  
**Reply to**: Message 1 (via `thid` - thread ID)

**Content**:
```json
{
  "@type": "https://didcomm.org/issue-credential/3.0/offer-credential",
  "@id": "uuid-offer-2",
  "thid": "uuid-propose-1",  // Thread ID linking to proposal
  "from": "did:peer:...(issuer)",
  "to": ["did:peer:...(holder)"],
  "created_time": timestamp,
  "body": {
    "goal_code": "issue-vc",
    "comment": "Here's your credential offer",
    "credential_preview": {
      "@type": "https://didcomm.org/issue-credential/3.0/credential-preview",
      "attributes": {
        "name": "John Doe",
        "age": 25,
        "address": "123 Main St",
        "licenseNumber": "DL123456",
        "expirationDate": "2030-01-01"
      }
    }
  },
  "attachments": [
    {
      "id": "uuid-attach-1",
      "media_type": "application/json",
      "format": "vc+jwt",
      "data": {
        "json": {
          "credential_format": "vc+jwt"
          // Format specification
        }
      }
    }
  ]
}
```

**Storage**: Stored in message queue  
**Encryption**: Same as Propose-Credential

---

#### Message 3: Request-Credential

**Type**: `https://didcomm.org/issue-credential/3.0/request-credential`

**Sender**: Holder  
**Receiver**: Issuer  
**Reply to**: Message 2 (via `thid`)

**Content**:
```json
{
  "@type": "https://didcomm.org/issue-credential/3.0/request-credential",
  "@id": "uuid-request-3",
  "thid": "uuid-propose-1",  // Same thread
  "from": "did:peer:...(holder)",
  "to": ["did:peer:...(issuer)"],
  "created_time": timestamp,
  "body": {
    "goal_code": "issue-vc",
    "comment": "Accepting credential offer"
  }
}
```

**Encryption**: ECDH-ES+HKDF-512 with ChaCha20Poly1305

---

#### Message 4: Issue-Credential

**Type**: `https://didcomm.org/issue-credential/3.0/issue-credential`

**Sender**: Issuer  
**Receiver**: Holder  
**Reply to**: Message 3 (via `thid`)

**Content**:
```json
{
  "@type": "https://didcomm.org/issue-credential/3.0/issue-credential",
  "@id": "uuid-issue-4",
  "thid": "uuid-propose-1",  // Same thread
  "from": "did:peer:...(issuer)",
  "to": ["did:peer:...(holder)"],
  "created_time": timestamp,
  "body": {
    "goal_code": "issue-vc",
    "comment": "Your credential is ready"
  },
  "attachments": [
    {
      "id": "uuid-attach-1",
      "media_type": "application/json",
      "format": "vc+jwt",
      "data": {
        "json": {
          "@context": [
            "https://www.w3.org/2018/credentials/v1"
          ],
          "type": [
            "VerifiableCredential",
            "DriversLicense"
          ],
          "issuer": {
            "id": "did:peer:...(issuer)"
          },
          "issuanceDate": "2025-01-01T00:00:00Z",
          "expirationDate": "2030-01-01T00:00:00Z",
          "credentialSubject": {
            "id": "did:peer:...(holder)",
            "name": "John Doe",
            "age": 25,
            "address": "123 Main St",
            "licenseNumber": "DL123456"
          },
          "proof": {
            "type": "Ed25519Signature2020",
            "created": "2025-01-01T00:00:00Z",
            "proofPurpose": "assertionMethod",
            "verificationMethod": "did:peer:...(issuer)#key-1",
            "signatureValue": "base64-encoded-signature..."
          }
        }
      }
    }
  ]
}
```

**Encryption**: ECDH-ES+HKDF-512 with ChaCha20Poly1305

**Credential Content**:
- **@context**: W3C vocabulary context
- **type**: Array including "VerifiableCredential" and credential-specific type
- **issuer**: The issuer's DID
- **issuanceDate**: When credential was issued
- **expirationDate**: When credential expires
- **credentialSubject**: Claims about the subject (holder)
  - **id**: The holder's DID
  - **[properties]**: Subject-specific attributes
- **proof**: Cryptographic signature by issuer
  - Type: Ed25519Signature2020
  - Uses issuer's private key (key-1)
  - Can be verified using issuer's public key from DID Document

---

#### Message 5: Acknowledgment

**Type**: `https://didcomm.org/issue-credential/3.0/ack`

**Sender**: Holder  
**Receiver**: Issuer  
**Reply to**: Message 4 (via `thid`)

**Content**:
```json
{
  "@type": "https://didcomm.org/issue-credential/3.0/ack",
  "@id": "uuid-ack-5",
  "thid": "uuid-propose-1",
  "from": "did:peer:...(holder)",
  "to": ["did:peer:...(issuer)"],
  "created_time": timestamp,
  "body": {
    "status": "OK"  // or "FAIL", "PENDING"
  }
}
```

**Encryption**: ECDH-ES+HKDF-512 with ChaCha20Poly1305

---

### 3. Present Proof Protocol v3.0

**Purpose**: Request and verify presentations of credentials.

#### Message Flow Sequence

```
VERIFIER                          HOLDER
  │                                 │
  ├──1. Request-Presentation───────►│
  │                                 │
  ├◄─2. Present-Proof───────────────┤
  │                                 │
  ├──3. Ack (with verification)────►│
  │                                 │
```

#### Message 1: Request-Presentation

**Type**: `https://didcomm.org/present-proof/3.0/request-presentation`

**Sender**: Verifier  
**Receiver**: Holder

**Content**:
```json
{
  "@type": "https://didcomm.org/present-proof/3.0/request-presentation",
  "@id": "uuid-request-1",
  "from": "did:peer:...(verifier)",
  "to": ["did:peer:...(holder)"],
  "created_time": timestamp,
  "body": {
    "goal_code": "verify-credentials",
    "comment": "Please present your identity credentials",
    "will_confirm": true  // Will send ack with verification result
  },
  "attachments": [
    {
      "id": "uuid-attach-1",
      "media_type": "application/json",
      "format": "dif/presentation-exchange/definitions@v1.0",
      "data": {
        "json": {
          "options": {
            "challenge": "uuid-challenge-xyz",  // Unique challenge for this request
            "domain": "did:peer:...(verifier)"   // Verifier's DID as domain
          },
          "presentation_definition": {
            "id": "uuid-pd-1",
            "name": "KYC Verification Request",
            "purpose": "Verify identity for banking",
            "input_descriptors": [
              {
                "id": "driver-license",
                "name": "DriversLicense",
                "purpose": "Verify government-issued ID",
                "constraints": {
                  "fields": [
                    {
                      "path": ["$.type"],
                      "filter": {
                        "type": "string",
                        "pattern": "DriversLicense"
                      }
                    },
                    {
                      "path": ["$.credentialSubject.name"],
                      "optional": false
                    },
                    {
                      "path": ["$.credentialSubject.dateOfBirth"],
                      "optional": false
                    },
                    {
                      "path": ["$.credentialSubject.address"],
                      "optional": false
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    }
  ]
}
```

**Key Elements**:
- **challenge**: Random nonce to prevent replay attacks
- **domain**: Verifier's DID
- **presentation_definition**: Specifies what credentials/fields are needed
  - Uses DIF Presentation Exchange format
  - **input_descriptors**: Each describes a required credential
  - **fields**: Specifies which fields must be present
  - **path**: JSONPath to credential properties
  - **optional**: Whether the field must be disclosed

**Storage**: Stored in message queue  
**Encryption**: ECDH-ES+HKDF-512 with ChaCha20Poly1305

---

#### Message 2: Presentation

**Type**: `https://didcomm.org/present-proof/3.0/presentation`

**Sender**: Holder  
**Receiver**: Verifier  
**Reply to**: Message 1 (via `thid`)

**Content**:
```json
{
  "@type": "https://didcomm.org/present-proof/3.0/presentation",
  "@id": "uuid-pres-2",
  "thid": "uuid-request-1",
  "from": "did:peer:...(holder)",
  "to": ["did:peer:...(verifier)"],
  "created_time": timestamp,
  "body": {
    "goal_code": "verify-credentials",
    "comment": "Here is my presentation"
  },
  "attachments": [
    {
      "id": "uuid-attach-1",
      "media_type": "application/json",
      "format": "dif/presentation-exchange/submission@v1.0",
      "data": {
        "json": {
          // W3C Verifiable Presentation
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://www.w3.org/2018/presentation/v1"
          ],
          "type": "VerifiablePresentation",
          "verifiableCredential": [
            {
              // The actual W3C VC (same structure as in Issue-Credential message)
              "@context": ["https://www.w3.org/2018/credentials/v1"],
              "type": ["VerifiableCredential", "DriversLicense"],
              "issuer": { "id": "did:peer:...(issuer)" },
              "issuanceDate": "2025-01-01T00:00:00Z",
              "expirationDate": "2030-01-01T00:00:00Z",
              "credentialSubject": {
                "id": "did:peer:...(holder)",
                "name": "John Doe",
                "dateOfBirth": "1995-06-15",
                "address": "123 Main St"
              },
              "proof": {
                "type": "Ed25519Signature2020",
                "created": "2025-01-01T00:00:00Z",
                "proofPurpose": "assertionMethod",
                "verificationMethod": "did:peer:...(issuer)#key-1",
                "signatureValue": "base64-encoded-issuer-signature..."
              }
            }
          ],
          "holder": "did:peer:...(holder)",
          "proof": {
            "type": "Ed25519Signature2020",
            "created": timestamp,
            "challenge": "uuid-challenge-xyz",  // From request
            "domain": "did:peer:...(verifier)",  // From request
            "proofPurpose": "authentication",
            "verificationMethod": "did:peer:...(holder)#key-1",
            "signatureValue": "base64-encoded-holder-signature..."
          }
        }
      }
    }
  ]
}
```

**Presentation Content**:
- **@context**: Includes both credentials and presentation contexts
- **type**: "VerifiablePresentation"
- **verifiableCredential**: Array of credentials being presented
  - Can be subset of holder's credentials (selective disclosure)
  - Only includes fields specified in presentation_definition
  - Each credential has issuer's proof
- **holder**: The holder's DID
- **proof**: Holder's signature over the presentation
  - Uses holder's private key (key-1)
  - Includes **challenge** from request (prevents replay)
  - Includes **domain** from request (binds to specific verifier)
  - Signed with holder's Ed25519 key

**Selective Disclosure**: Only requested fields in `credentialSubject` are included

**Encryption**: ECDH-ES+HKDF-512 with ChaCha20Poly1305

---

#### Message 3: Acknowledgment with Verification

**Type**: `https://didcomm.org/present-proof/3.0/ack`

**Sender**: Verifier  
**Receiver**: Holder  
**Reply to**: Message 2 (via `thid`)

**Content**:
```json
{
  "@type": "https://didcomm.org/present-proof/3.0/ack",
  "@id": "uuid-ack-3",
  "thid": "uuid-request-1",
  "from": "did:peer:...(verifier)",
  "to": ["did:peer:...(holder)"],
  "created_time": timestamp,
  "body": {
    "status": "OK",  // or "FAIL", "PENDING"
    "comment": "Credentials verified successfully"
  }
}
```

**Encryption**: ECDH-ES+HKDF-512 with ChaCha20Poly1305

---

## DIDComm Message Packing & Encryption

### Message Encryption Flow

```
Plain JSON Message
        ↓
Create Message Object (didcomm lib)
        ↓
Encrypt with pack_encrypted()
├─ Recipient's public key (X25519) → key agreement
├─ Sender's private key (Ed25519) → authentication
├─ Encryption: XChaCha20Poly1305
├─ Key derivation: HKDF-512
└─ Output: JWE (JSON Web Encryption)
        ↓
Signed by issuer: Base64URL encoded
        ↓
Sent via HTTP POST to recipient's service endpoint
```

### DIDComm Security Properties

**Algorithm Suite**:
- **Key Agreement**: ECDH-ES+HKDF-512
- **Encryption**: XChaCha20Poly1305 (192-bit nonce, 256-bit key)
- **Authentication**: Sender's signature included in message
- **Nonce**: 192-bit random for each message

**Encryption Details** (in wrapper.ts):
```typescript
// Message creation
const msg = new Message({
  id: uuidv4(),
  typ: 'application/didcomm-plain+json',
  from: from,        // Sender's DID
  to: [to],         // Recipient's DID
  body: message.body,
  created_time: Date.now(),
  ...message
});

// Encryption
const [packed, meta] = await msg.pack_encrypted(
  to,               // Recipient DID
  from,             // Sender DID
  null,             // Sign key (optional)
  resolver,         // DID resolver
  secretsResolver,  // Secrets (private keys)
  { forward: true } // Forward message options
);

// Result: packed is a JWE string
// Sent: POST to meta.messaging_service.service_endpoint
```

**Decryption** (recipient side):
```typescript
const [unpackedMessage, metadata] = await Message.unpack(
  encryptedMessage,    // JWE string
  resolver,           // DID resolver
  secretsResolver,    // Secrets (private keys)
  {}                  // Options
);

// unpackedMessage contains plaintext
// metadata includes unpacking info
```

---

## Message Storage & Queue

### Queue System Architecture

All messages are stored in a local SQLite database for reliability:

```
┌─────────────────────────────────────────┐
│         Message Queue System            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Message Storage (SQLite)       │  │
│  │  - id (uuid)                     │  │
│  │  - direction (inbound/outbound)  │  │
│  │  - status (pending/sent/failed)  │  │
│  │  - message (packed JWE)          │  │
│  │  - messageType (@type)           │  │
│  │  - threadId (for tracking)       │  │
│  │  - from/to (DIDs)                │  │
│  │  - timestamps                    │  │
│  │  - retryCount/maxRetries         │  │
│  │  - metadata                      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Message Queue Processor        │  │
│  │  - Auto-retry on failure         │  │
│  │  - TTL expiration cleanup        │  │
│  │  - State transitions             │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### Message States

```
PENDING ──► PROCESSING ──► SENT ──► DELIVERED
                  │
                  └──────► FAILED (retry loop)
                              │
                              └─ (retry) ─► PENDING
                              │
                              └─ (max retries) ─► EXPIRED
```

### Stored Message Structure

```typescript
interface QueuedMessage {
  id: string;                    // UUID
  direction: 'inbound' | 'outbound';
  status: MessageStatus;         // See above
  
  message: string;               // Packed JWE (full encrypted message)
  messageType?: string;          // @type from unpacked message
  threadId?: string;             // thid for conversation tracking
  
  from?: string;                 // Sender DID
  to?: string;                   // Recipient DID
  
  createdAt: number;             // Timestamp
  updatedAt: number;
  expiresAt?: number;            // TTL (default 24h)
  sentAt?: number;
  deliveredAt?: number;
  
  retryCount: number;            // Current retry attempt
  maxRetries: number;            // Max attempts (default 3)
  nextRetryAt?: number;          // Next retry timestamp
  lastError?: string;            // Error message from last attempt
  
  metadata?: Record<string, any>; // Custom metadata
}
```

### Retry Logic

- **Initial Retry Delay**: 1 second
- **Max Retry Delay**: 60 seconds
- **Backoff Multiplier**: 2x exponential
- **Max Retries**: 3 attempts
- **Retry Formula**: `min(initialDelay * (multiplier ^ attempt), maxDelay)`

Example retry timeline:
```
Attempt 1: Immediate send
Attempt 2: 1 second later
Attempt 3: 3 seconds later (1 * 2^1 + 1)
Attempt 4: 7 seconds later (1 * 2^2 + 1)
Failed after 4 attempts
```

---

## Complete End-to-End Flows

### Flow 1: Credential Issuance (Issue-Credential Protocol)

```
┌──────────┐           HTTP POST          ┌────────┐
│  HOLDER  │        [Request-Credential]  │ ISSUER │
│          │◄─────────────────────────────│        │
│  (5003)  │                              │ (5001) │
└──────────┘                              └────────┘
     │                                        ▲
     │          [Propose-Credential]          │
     └───────────────────────────────────────►│
              DIDComm Encrypted (JWE).        │
                    │                         │
                    ▼                         │
            Stored in Issuer Queue            │
                    │                         │
                    │   [Offer-Credential]    │
                    ◄─────────────────────────┘
                DIDComm Encrypted (JWE)
                    │
                    ▼
            Stored in Holder Queue
                    │
                    │   [Request-Credential]
                    ├────────────────────────►
                DIDComm Encrypted (JWE)
                         │
                         ▼
                Stored in Issuer Queue
                         │
                         │   [Issue-Credential + VC]
                         ◄──────────────────────
                    DIDComm Encrypted (JWE)
                         │
                         ▼
                Stored in Holder Queue
                         │
                         │   [Ack]
                         ├──────────────────────►
                    DIDComm Encrypted (JWE)
                              │
                              ▼
                    Stored in Issuer Queue
```

**Step-by-Step Detail**:

1. **Holder Creates Propose-Credential**
   - Holder's HTTP client calls: `POST /credentials/request`
   - Body: `{ issuerDid, credentialType, claims }`
   - Holder agent creates propose message
   - DIDComm packs message with holder's private key (signing) and issuer's public key (encryption)
   - Packed JWE sent to issuer's DIDComm endpoint
   - Stored in holder's outbound message queue (SENT)

2. **Issuer Receives Propose**
   - Issuer's HTTP endpoint receives JWE
   - DIDComm unpacks with issuer's private key
   - Protocol router dispatches to issue-credential handler
   - Issuer stores in inbound queue
   - Issuer creates Offer-Credential message with credential preview

3. **Issuer Sends Offer**
   - Offer packed and sent to holder's endpoint
   - Holder receives and unpacks

4. **Holder Accepts with Request**
   - Holder sends Request-Credential

5. **Issuer Issues Credential**
   - Creates VC with:
     - Issuer's DID as `issuer.id`
     - Holder's DID as `credentialSubject.id`
     - Claims about holder
     - Proof signed by issuer
   - Packs in Issue-Credential message

6. **Holder Stores & Acknowledges**
   - Holder unpacks Issue-Credential
   - Extracts VC from attachment
   - Stores in credential store (SQLite)
   - Sends Ack message

---

### Flow 2: Out-of-Band (OOB) Credential Offer

Alternative to multi-step flow - issuer creates invitation with embedded offer:

```
┌──────────┐  Web/QR/URL   ┌────────────────────┐  HTTP POST  ┌────────┐
│  ISSUER  │ [Invitation]  │  HOLDER (App/Web)  │  [Accept]  │ ISSUER │
│  (5001)  │──────────────►│                    │────────────►│ (5001) │
└──────────┘               │   (Scans QR or     │  (endpoint) └────────┘
                           │    pastes URL)     │
                           └────────────────────┘
```

**OOB Invitation Structure**:
```json
{
  "@type": "https://didcomm.org/out-of-band/2.0/invitation",
  "@id": "uuid",
  "from": "did:peer:...(issuer)",
  "body": {
    "goal_code": "issue-vc",
    "goal": "Receive credential",
    "accept": ["didcomm/v2"]
  },
  "attachments": [{
    "id": "uuid",
    "media_type": "application/json",
    "data": {
      "json": {
        "@type": "https://didcomm.org/issue-credential/3.0/offer-credential",
        "@id": "uuid",
        "from": "did:peer:...(issuer)",
        "body": {
          "credential_preview": {
            "attributes": {
              "name": "John Doe",
              "age": 25
            }
          }
        },
        "attachments": [{
          "format": "vc+jwt",
          "data": { "json": { /* ... */ } }
        }]
      }
    }
  }],
  "created_time": timestamp,
  "expires_time": timestamp
}
```

**Transmission**:
1. Issuer creates invitation
2. Base64URL encode: `Buffer.from(JSON.stringify(invitation)).toString('base64url')`
3. Create URL: `https://localhost:5003/invitations/accept?oob=eyJ...`
4. Generate QR code pointing to this URL
5. Holder scans QR or pastes URL
6. Holder app decodes base64URL parameter
7. Parses invitation JSON
8. Extracts embedded offer
9. Holder can accept and start credential flow

---

### Flow 3: Presentation Request & Verification

```
┌──────────────┐   Generate Challenge    ┌──────────┐
│  VERIFIER    │◄───────────────────────►│ VERIFIER │
│  (Backend)   │       (POST)             │ (Frontend)
│   (5002)     │                          │ (5172)   │
└──────────────┘                          └──────────┘
       │
       │ [Request-Presentation]
       │ (with challenge & presentation_definition)
       ▼
┌──────────────────────────────────────────────────────┐
│ OOB Invitation (HTTP Response to Frontend)           │
│ - Contains embedded Request-Presentation message     │
│ - Challenge included in invitation                   │
│ - Converted to QR code (base64url encoded)          │
└──────────────────────────────────────────────────────┘
       │
       ▼ QR Scanned / URL Shared
┌──────────────────────────────────────────────────────┐
│ Holder Wallet (Frontend)                             │
│ - Scans QR or pastes URL                             │
│ - Decodes OOB invitation                             │
│ - Extracts presentation request                      │
│ - Selects credentials to present                     │
│ - Creates VP (Verifiable Presentation)              │
└──────────────────────────────────────────────────────┘
       │
       │ [Presentation] DIDComm Message
       │ (HTTP POST to Verifier endpoint)
       ▼
┌──────────────────────────────────────────────────────┐
│ Verifier Backend                                     │
│ - Receives encrypted Presentation message            │
│ - Unpacks JWE with verifier's private key           │
│ - Verifies VP:                                       │
│   1. Check holder's signature (using holder's pub)   │
│   2. Check challenge matches                         │
│   3. Check domain matches                            │
│   4. Verify each credential's issuer signature       │
│   5. Check credential freshness/expiration           │
│   6. Store verification result with challenge ID     │
│ - Sends Ack to holder                                │
└──────────────────────────────────────────────────────┘
       │
       │ Frontend polls for result
       ├───────────────────────────────────────►
       │ GET /verification/result?challenge=xyz
       │
       ◄─────────────────────────────────────
       │ { verified: true, issuers: [...], ... }
       │
       ▼
┌──────────────────────────────────────────┐
│ Verifier Frontend                        │
│ Shows: "Verification Successful!"        │
│ Displays: Verified claims, issuers, etc  │
└──────────────────────────────────────────┘
```

**Detailed Verification Flow**:

1. **Verifier Creates Challenge**
   ```typescript
   const challenge = {
     id: uuid,
     challenge: uuid,           // Random nonce
     holderDid: holder_did,
     domain: verifier_did,
     expiresAt: now + (5 * 60 * 1000)  // 5 minutes
   };
   ```

2. **Verifier Generates Presentation Request**
   ```typescript
   const message = PresentProofProtocol.createRequest({
     from: verifier_did,
     to: holder_did,
     challenge: challenge.challenge,
     presentationDefinition: {
       // Specifies which credentials/fields required
     }
   });
   ```

3. **Verifier Creates OOB Invitation**
   ```typescript
   const invitation = OOBProtocol.createPresentationRequestInvitation(
     verifier_did,
     ['DriversLicense', 'GovernmentID'],
     challenge.challenge,
     { requestedFields: ['name', 'age', 'address'] }
   );
   ```

4. **Verifier Frontend Receives QR Code**
   - Backend returns: `{ invitationUrl, qrCode, challenge }`
   - Frontend displays QR code

5. **Holder Scans QR and Processes**
   - Decodes base64url OOB invitation
   - Extracts presentation request
   - Queries credential store for matching credentials
   - User selects which credentials to present
   - Frontend creates VP with selected credentials

6. **Holder Sends Presentation**
   ```typescript
   const vp = {
     "@context": [...],
     "type": "VerifiablePresentation",
     "verifiableCredential": [
       // Selected credentials from holder
     ],
     "holder": holder_did,
     "proof": {
       "type": "Ed25519Signature2020",
       "created": timestamp,
       "challenge": challenge.challenge,  // From request
       "domain": verifier_did,            // From request
       "proofPurpose": "authentication",
       "verificationMethod": "did:peer:...(holder)#key-1",
       "signatureValue": "..."            // Holder's signature
     }
   };
   ```

7. **Verifier Verifies Presentation**
   ```typescript
   // Step 1: Verify presentation structure
   - Check @type === "VerifiablePresentation"
   - Check holder matches expected DID
   
   // Step 2: Verify presentation proof
   - Extract holder's public key from DID document
   - Verify signature over presentation using Ed25519
   
   // Step 3: Check challenge
   - Extract challenge from presentation proof
   - Verify challenge matches the one we issued
   - Ensure challenge hasn't expired
   
   // Step 4: Check domain
   - Extract domain from presentation proof
   - Verify domain === verifier_did
   
   // Step 5: Verify each credential
   For each credential in verifiableCredential:
     - Extract issuer from credential
     - Resolve issuer's DID document
     - Get issuer's public key
     - Verify credential proof signature with issuer's key
     - Check credential not expired
     - Check credential type matches request
     - Check credentialSubject.id === holder_did
   
   // Step 6: Store result
   verificationResult = {
     verified: true,
     challenge: challenge.id,
     holder: holder_did,
     issuers: [list of issuer DIDs],
     credentials: [list of credential types],
     timestamp: now
   };
   ```

8. **Frontend Polls for Result**
   ```
   Interval: every 5 seconds
   Endpoint: GET /verification/result?challenge=xyz
   
   If result found:
     - Display verification success
     - Show verified claims
     - Show issuer information
   ```

---

## Message Encryption Deep Dive

### Encryption Algorithm Stack

```
plaintext message
        │
        ▼
1. Serialize JSON
        │
        ▼
2. Create Message object
   └─ @id: uuid
   └─ @type: protocol type
   └─ from: sender DID
   └─ to: [recipient DID]
   └─ body: message payload
   └─ attachments: any files
        │
        ▼
3. Key Agreement (ECDH)
   ├─ Recipient's public key (X25519)
   ├─ Sender's private key (Ed25519 converted to X25519)
   └─ Derive shared secret using HKDF-512
        │
        ▼
4. Key Derivation (HKDF)
   ├─ Input: shared secret
   ├─ Extract phase: HMAC-SHA512
   ├─ Expand phase: HMAC-SHA512
   └─ Output: 256-bit encryption key
        │
        ▼
5. Encrypt (XChaCha20Poly1305)
   ├─ Key: from step 4
   ├─ Nonce: random 192-bit (24 bytes)
   ├─ Additional Authenticated Data (AAD): "DIDComm encrypted message"
   ├─ Plaintext: JSON message
   └─ Output: ciphertext + auth tag
        │
        ▼
6. Create JWE (JSON Web Encryption)
   ├─ Protected header: algorithm info (BASE64URL encoded)
   ├─ Encrypted key: empty (ECDH-ES doesn't use key wrapping)
   ├─ IV: nonce (BASE64URL encoded)
   ├─ Ciphertext: encrypted message (BASE64URL encoded)
   ├─ Auth Tag: authentication tag (BASE64URL encoded)
   └─ Format: FIVE.PART.JWE.COMPACT.SERIALIZATION
        │
        ▼
encrypted_message = "eyJ...BASE64...BASE64...BASE64...BASE64"
```

### JWE Compact Serialization

```
Compact Format: HEADER.ENCRYPTED_KEY.IV.CIPHERTEXT.AUTH_TAG

Example:
eyJhbGciOiJFQ0RILUVTK0hLREYtNTEyIiwiZW5jIjoiQ0hBQ0hBMjAvUG9seTEzMDUifQ.
.
cZIJDwVTdRMQcsGqSrHxBg.
OZzIKr5dLWsWf8gkPaHvTLITQYAF_DRbCRh6-gqIZvgKLMrvGgJMAFhTVkE.
4x-FKP9FNJMqKa6UtC-VpQ

Breaking down:
├─ HEADER: Algorithm and encryption method
├─ ENCRYPTED_KEY: (empty for ECDH-ES)
├─ IV: Initialization Vector (nonce)
├─ CIPHERTEXT: The encrypted message
└─ AUTH_TAG: AEAD authentication tag
```

### Decryption Flow

```
encrypted_message (JWE string)
        │
        ▼
1. Split on "." to get 5 parts
        │
        ▼
2. BASE64URL decode each part
        │
        ▼
3. Verify header (algorithm matches expected)
        │
        ▼
4. Key Agreement
   ├─ Recipient's private key (X25519)
   ├─ Sender's public key (from DID document)
   └─ Derive same shared secret
        │
        ▼
5. Key Derivation (HKDF)
   ├─ Use header parameters
   └─ Derive same 256-bit key
        │
        ▼
6. Decrypt (XChaCha20Poly1305)
   ├─ Key: from step 5
   ├─ Nonce: IV from JWE
   ├─ Ciphertext: from JWE
   ├─ Auth Tag: from JWE
   └─ Verify authentication
        │
        ▼
7. Parse plaintext JSON
        │
        ▼
plaintext message object
```

---

## DID Structure

### did:peer Format

```
did:peer:2.Ez...(base58 encoded multibase key data)

Structure:
- Prefix: "did:peer:2"
- Genesis key material encoded in base58 (multibase)
- Self-describing format (includes key type info)

DID Document (resolved):
{
  "id": "did:peer:2.Ez...",
  "verificationMethod": [
    {
      "id": "#key-1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:peer:2.Ez...",
      "publicKeyMultibase": "z6Mkvz..."  // Ed25519 verification key
    },
    {
      "id": "#key-2",
      "type": "X25519KeyAgreementKey2020",
      "controller": "did:peer:2.Ez...",
      "publicKeyMultibase": "z6LSpS..."  // X25519 key agreement key
    }
  ],
  "authentication": ["#key-1"],
  "keyAgreement": ["#key-2"],
  "service": [
    {
      "id": "#service",
      "type": "DIDCommMessaging",
      "serviceEndpoint": {
        "uri": "http://localhost:5001/didcomm",  // HTTP endpoint for messages
        "accept": ["didcomm/v2"],
        "routingKeys": []
      }
    }
  ]
}
```

**Key Types**:
- **#key-1**: Ed25519 verification key (for authentication & signing)
  - Used in presentation proofs
  - Used to sign credentials (issuer)
  - Multibase format: `z` prefix for base58
  
- **#key-2**: X25519 key agreement key (for encryption)
  - Used in key agreement for message encryption
  - Multibase format: `z` prefix for base58

---

## Summary Table: Message Encryption Status

| Protocol | Message Type | Encrypted | Data in Attachment |
|----------|--------------|-----------|-------------------|
| OOB | invitation | ❌ NO | N/A - shared via QR/URL |
| Issue-Credential | propose-credential | ✅ YES (JWE) | Claims/attributes |
| Issue-Credential | offer-credential | ✅ YES (JWE) | Credential format spec |
| Issue-Credential | request-credential | ✅ YES (JWE) | Acceptance |
| Issue-Credential | issue-credential | ✅ YES (JWE) | **W3C VC** (full credential) |
| Issue-Credential | ack | ✅ YES (JWE) | Status |
| Present-Proof | request-presentation | ✅ YES (JWE) | **Presentation definition** (challenge, fields) |
| Present-Proof | presentation | ✅ YES (JWE) | **W3C VP** (signed presentation) |
| Present-Proof | ack | ✅ YES (JWE) | Verification result status |

---

## Threading & Conversation Tracking

### Thread ID (`thid`) Usage

Messages are linked via thread ID for conversation tracking:

```
Message 1 (Propose-Credential):
{
  "@id": "uuid-msg-1",
  // No thid - this starts the thread
}

Message 2 (Offer-Credential) - reply to Message 1:
{
  "@id": "uuid-msg-2",
  "thid": "uuid-msg-1"  // Threads to first message
}

Message 3 (Request-Credential) - reply to Message 2:
{
  "@id": "uuid-msg-3",
  "thid": "uuid-msg-1"  // Still threads to original
}

Message 4 (Issue-Credential) - reply to Message 3:
{
  "@id": "uuid-msg-4",
  "thid": "uuid-msg-1"  // Same thread throughout
}

Conversation View:
Thread uuid-msg-1:
├─ Message 1 (Propose) - @id: uuid-msg-1
├─ Message 2 (Offer) - @id: uuid-msg-2, thid: uuid-msg-1
├─ Message 3 (Request) - @id: uuid-msg-3, thid: uuid-msg-1
├─ Message 4 (Issue) - @id: uuid-msg-4, thid: uuid-msg-1
└─ Message 5 (Ack) - @id: uuid-msg-5, thid: uuid-msg-1
```

All messages in a conversation maintain the same `thid` pointing to the first message's `@id`.

---

## HTTP Transport

### Message Endpoint Specification

Each agent exposes a DIDComm messaging endpoint:

```
Issuer:   POST http://localhost:5001/didcomm
Holder:   POST http://localhost:5003/didcomm
Verifier: POST http://localhost:5002/didcomm
```

### Request Format

```
POST /didcomm HTTP/1.1
Host: localhost:5001
Content-Type: application/didcomm-encrypted+json

[JWE compact serialization string - the packed message]
```

### Response Format

```
HTTP/1.1 200 OK
Content-Type: application/didcomm-encrypted+json

[Response JWE (if expected) or empty]
```

### Example cURL

```bash
curl -X POST http://localhost:5001/didcomm \
  -H "Content-Type: application/didcomm-encrypted+json" \
  -d "eyJhbGciOiJFQ0RILUVTK0hLREYtNTEyIiwiZW5jIjoiQ0hBQ0hBMjAvUG9seTEzMDUifQ...."
```

---

## Summary

This document describes:

1. **Three Protocols**:
   - OOB (Out-of-Band): Bootstrap with QR/URLs
   - Issue-Credential: Multi-step credential issuance
   - Present-Proof: Request and verify presentations

2. **Encryption**: All DIDComm messages are encrypted using XChaCha20Poly1305 with ECDH key agreement

3. **Message Storage**: Messages persist in SQLite with retry logic

4. **Verification Chain**:
   - Issuer signs credentials with private key
   - Holder creates presentations with credentials
   - Holder signs presentation with private key (includes challenge & domain)
   - Verifier checks holder's signature + issuer's signature + challenge

5. **Selective Disclosure**: Holder can present only requested fields from credentials

6. **Threading**: All messages in a conversation linked via thread ID for tracking
