# Verifier Web - Usage Guide

## Verifier Web Tabs

The verifier web app has 3 main tabs for different verification scenarios.

---

## 1. 🔐 Verify Credential

**Purpose**: Verify a single Verifiable Credential directly.

**Use case**: You have a credential JSON and want to check if it's valid.

**Example Credential to paste**:
```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "DriversLicense"],
  "issuer": {
    "id": "did:peer:4.Vz6Mkk..."
  },
  "issuanceDate": "2024-01-15T10:00:00Z",
  "credentialSubject": {
    "id": "did:peer:4.Vz6Mkk...",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "age": 25,
    "licenseNumber": "DL123456",
    "licenseClass": "C"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2024-01-15T10:00:00Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "did:peer:4.Vz6Mkk...#key-1"
  }
}
```

**What happens**: The verifier checks the credential's validity, issuer, and expiration.

---

## 2. 📋 Request Presentation

**Purpose**: Request specific credentials from a wallet via QR code.

**Use case**: You (the bank) want to verify a customer's identity. You generate a QR code that asks for specific credential types.

**Steps**:
1. Enter the credential types you want (e.g., `DemoCredential`, `DriversLicense`)
2. (Optional) Enter specific fields to request (e.g., `name, age`). Leave blank to request all fields
3. Click "Generate Verification Request"
4. Share the QR code with the wallet holder
5. They scan it and choose which credentials to share
6. Wallet applies field selection (only requested fields are shared)
7. They send back a Verifiable Presentation with only the requested fields

**Example Flow**:
- You need to verify someone's age and name only (privacy-preserving)
- You request `ProofOfAge` credential
- You specify requested fields: `name, age`
- Wallet holder scans QR code
- Wallet asks: "Share your ProofOfAge credential (name, age only)?"
- Holder approves
- Wallet creates presentation with ONLY name and age fields
- Presentation is sent to you (no other personal data exposed)
- You verify it in the next tab

---

## 3. 🎯 Verify Presentation

**Purpose**: Verify a presentation that was sent to you.

**Use case**: After requesting a presentation, you receive a Verifiable Presentation JSON and need to check if it's valid.

**Example Presentation to paste**:
```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiablePresentation"],
  "holder": "did:peer:4.Vz6Mkk...",
  "verifiableCredential": [
    {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": ["VerifiableCredential", "DriversLicense"],
      "issuer": {
        "id": "did:peer:4.Issuer..."
      },
      "issuanceDate": "2024-01-15T10:00:00Z",
      "credentialSubject": {
        "name": "Alice Smith",
        "age": 25
      },
      "proof": { ... }
    }
  ],
  "proof": {
    "type": "Ed25519Signature2020",
    "challenge": "abc123...",
    "domain": "verifier.example.com"
  }
}
```

**What happens**: The verifier checks:
- The presentation is properly formatted
- The challenge matches (prevents replay attacks)
- The credentials inside are valid
- The credentials match what was requested

---

## Complete Flow Example

### Step 1: Issuer Issues Credential
```bash
# At issuer (localhost:5001)
POST /credentials/issue
{
  "credentialSubject": {
    "id": "did:peer:holder-did",
    "name": "Alice Smith",
    "age": 25
  },
  "type": ["DemoCredential"]
}
```

### Step 2: Holder Stores Credential
```bash
# At holder (localhost:5003)
POST /credentials
{
  "credential": { ... credential JSON ... }
}
```

### Step 3: Verifier Requests Presentation
```bash
# At verifier (localhost:5002)
POST /invitations/presentation-request
{
  "requestedCredentials": ["DemoCredential"],
  "ttl": 3600
}
# Returns QR code
```

### Step 4: Holder Creates Presentation
```bash
# At holder
POST /presentations/create
{
  "credentialIds": ["credential-id"],
  "challenge": "...",
  "domain": "..."
}
# Returns presentation JSON
```

### Step 5: Verifier Verifies
```bash
# At verifier (or use the web UI)
POST /verify/presentation
{
  "presentation": { ... presentation JSON ... },
  "challenge": "..."
}
# Returns verification result
```

---

## Real-World Example: Bank Account Opening

**Scenario**: Alice wants to open a bank account. The bank needs to verify her identity.

1. **Bank (Verifier)** generates QR code requesting:
   - `ProofOfIdentity` (name, photo)
   - `ProofOfAge` (must be 18+)
   - `ProofOfAddress`

2. **Alice (Holder)** scans QR code with wallet app

3. Wallet shows:
   - "Bank wants to verify: Your identity, age, and address"
   - Alice reviews what will be shared
   - Alice approves

4. **Wallet creates presentation** with only the requested credentials

5. **Bank verifies** the presentation confirms Alice is:
   - 25 years old (meets requirement)
   - Identified (photo matches)
   - Resident (address verified)

6. **Bank approves** account opening

---

## Tips

- **Use Request Presentation** when you want to let the wallet holder choose which credentials to share
- **Use Verify Credential** when you already have a credential JSON
- **Use Verify Presentation** after you've requested credentials and received a response
- The challenge in the invitation prevents replay attacks
- Credentials are selectively disclosed - holders only share what's needed
