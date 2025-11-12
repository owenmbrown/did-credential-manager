# End-to-End Flow Guide - DID Credential Manager

## Overview

This guide walks you through a complete end-to-end test of the DID Credential Manager system. You will:

1. Use the Issuer to create and offer a credential
2. Use the Holder to accept and store the credential
3. Use the Verifier to request and verify the credential

## Prerequisites

Before starting this guide:
- Complete the setup steps in `SETUP.md`
- All services must be running (check with `docker-compose ps`)
- Have three browser windows or tabs open

## Required Browser Windows

Open the following three URLs in separate browser windows or tabs:

1. **Issuer Web:** http://localhost:5171
2. **Holder Wallet:** http://localhost:5173
3. **Verifier Web:** http://localhost:5172

Arrange them side-by-side if possible for easier testing.

---

## Test Flow: Credential Issuance and Verification

### Phase 1: Issuer Creates and Offers a Credential

**Location:** Issuer Web (http://localhost:5171)

#### Step 1.1: Navigate to Application Page

- The home page displays "Department of Motor Vehicles" as the title
- You will see the Issuer's DID displayed as "System DID: did:peer:2.Ez6LS..."
- This DID uniquely identifies the issuer
- Click the **"Start New Application"** button to proceed

#### Step 1.2: Fill Out Driver's License Application Form

You will see a comprehensive DMV application form with empty fields. Fill in the following information:

**Personal Information:**
- **First Name:** Enter a first name (e.g., "Alice")
- **Last Name:** Enter a last name (e.g., "Smith")
- **Middle Name:** Optional
- **Date of Birth:** Enter a date (format: YYYY-MM-DD, e.g., "1990-01-15")
- **Gender:** Select from dropdown (M/F/X)
- **Eye Color:** Enter eye color (e.g., "Brown")
- **Height (cm):** Optional - enter height in centimeters if desired
- **Email:** Enter email address (e.g., "alice@example.com")

**Address Information:**
- **Street:** Enter street address (e.g., "123 Main St")
- **City:** Enter city (e.g., "Seattle")
- **State:** Enter state/province (e.g., "WA")
- **Postal Code:** Enter postal code (e.g., "98101")
- **Country:** Enter country code (e.g., "US")

**Application Details:**
- **Application ID:** Auto-generated (e.g., "APP-2025-1234") - no need to modify
- **Phone:** Enter phone number (e.g., "206-555-0101")
- **SSN Last 4:** Enter last 4 digits of SSN (e.g., "1234")
- **Organ Donor:** Check if applicable
- **Residency Years:** Optional - enter number of years if desired
- **Vision Test Completed:** Check if applicable

Note: All fields (except Application ID) must be filled in manually. Use realistic test data for a complete demonstration.

#### Step 1.3: Generate Credential Offer Invitation

Scroll down to find the **"Create OOB Application Invite"** button and click it.

**What happens:**
- The system creates an Out-of-Band (OOB) invitation
- This invitation contains an offer for a driver's license credential
- You will see:
  - A QR code (can be scanned by mobile devices)
  - A long invitation URL starting with "http://localhost:5001/..."
  - A "Copy Invitation URL" button

Note: The "Submit Application VC" button creates a credential directly without the invitation flow. For this UAT, we use "Create OOB Application Invite" to test the full end-to-end flow.

#### Step 1.4: Copy the Invitation URL

Click the **"Copy Invitation URL"** button to copy the invitation to your clipboard.

**Important:** This URL contains the credential offer and will be used by the Holder in the next phase.

---

### Phase 2: Holder Accepts the Credential

**Location:** Holder Wallet (http://localhost:5173)

#### Step 2.1: Review Holder Wallet Interface

- You will see navigation tabs at the bottom or sidebar:
  - **Credentials** (home view)
  - **Scan** (for QR codes and invitations)
  - **Settings**
- The Holder's DID is displayed in the settings tab
- Example format: `did:peer4Ez6LS...`

#### Step 2.2: Navigate to Scan View

Click on the **"Scan"** tab or button to open the invitation scanner.

**What you'll see:**
- A QR code scanner (camera view)
- Below the scanner: "Or enter URL manually" link
- Instructions: "Position the QR code within the frame"

#### Step 2.3: Enter Invitation Manually

1. Click the **"Or enter URL manually"** link
2. An input field will appear
3. Paste the invitation URL you copied from the Issuer (Step 1.4)
4. Click the **"Process Invitation"** button

**What happens:**
- The system decodes the invitation URL
- The system identifies this as a credential offer
- A success message appears: "Invitation accepted! Credential offer received"
- The credential issuance protocol automatically executes

#### Step 2.4: Return to Credentials View

Click on the **"Credentials"** tab to return to the main view.

**What happens:**
- The holder automatically requested the credential from the issuer
- The issuer issued the credential
- The credential is now stored in the holder's wallet

#### Step 2.5: Verify Credential is Stored

In the Credentials view, you should see the newly received credential listed.

**Credential details displayed:**
- Credential type: "DriversLicenseApplication"
- Personal information (name, date of birth, address, etc.)
- Application details
- Issuer DID
- Issue timestamp
- Status indicator

**Optional:** Click on the credential card to view its full details, including the complete JSON structure.

---

### Phase 3: Verifier Requests and Verifies the Credential

**Location:** Verifier Web (http://localhost:5172)

#### Step 3.1: Review Verifier Home Page

- The home page displays "SecureBank" as the title with "Trusted Financial Services Since 2025"
- This represents a bank that wants to verify customer credentials for account opening
- You will see various account types displayed (Checking, Savings, Investment)
- The Verifier's DID is displayed somewhere in the interface

#### Step 3.2: Navigate to Account Application

Click the **"Open New Account"** button to proceed to the application page.

**What you'll see:**
- An account opening form requiring identity verification
- The bank needs to verify your driver's license information before opening an account

#### Step 3.3: Create a Presentation Request

Find the section for **"Verify Identity"** or **"Request Credentials"**.

1. The form may have options to specify what information to verify:
   - Request "DriversLicenseApplication" credential type
   - Request specific fields like "name," "dateOfBirth," and "address"
   - Or use default verification requirements

2. Click the **"Create OOB Presentation Request"** or **"Request Verification"** button

**What happens:**
- The system generates a presentation request
- This is an invitation asking the holder to prove they have a valid driver's license
- You will see:
  - A QR code
  - A long presentation request URL
  - A "Copy Request URL" button

#### Step 3.4: Copy the Presentation Request URL

Click the **"Copy Request URL"** button to copy the request to your clipboard.

**Important:** This URL contains the verification request and will be used by the Holder in the next phase.

---

### Phase 4: Holder Creates and Sends Presentation

**Location:** Holder Wallet (http://localhost:5173)

#### Step 4.1: Return to Scan View

1. In the Holder Wallet, click the **"Scan"** tab again
2. This is where you process incoming requests

#### Step 4.2: Enter Presentation Request

1. Click the **"Or enter URL manually"** link
2. Paste the presentation request URL you copied from the Verifier (Step 3.4)
3. Click the **"Process Invitation"** button

**What happens:**
- The system decodes the presentation request
- The system identifies this as a presentation request (not a credential offer)
- A success message appears: "Invitation accepted! Presentation request received"
- You are automatically navigated to the Presentation Builder view

#### Step 4.3: Review and Build Presentation

In the Presentation Builder view:

**What you'll see:**
- Details about what the verifier is requesting
- A list of your credentials that can fulfill this request
- The system automatically selects matching credentials
- Options to select which fields to share (selective disclosure)

**Information displayed:**
- Verifier's DID (who is requesting)
- Requested credential types
- Your matching credential (DriversLicenseApplication from Phase 2)

#### Step 4.4: Create and Send Presentation

Click the **"Create Presentation"** or **"Send Presentation"** button.

**What happens:**
- The holder creates a Verifiable Presentation containing the requested credential
- The holder signs the presentation with their private key
- The presentation is encrypted and sent to the verifier
- A success message appears: "Presentation sent successfully"
- The presentation includes cryptographic proof that you own the credential

---

### Phase 5: Verifier Validates the Presentation

**Location:** Verifier Web (http://localhost:5172)

#### Step 5.1: Navigate to Admin Dashboard

Click the **"Admin Dashboard"** button on the home page or navigate to http://localhost:5172/admin

**What you'll see:**
- A dashboard showing received presentations
- Verification status for each presentation
- Options to view details

#### Step 5.2: View Received Presentation

You should see the presentation that was just sent by the holder listed in the dashboard.

**Information displayed:**
- Presentation ID
- Received timestamp
- Holder DID
- Status (Pending/Verified/Failed)

Click on the presentation to view details or click a **"Verify"** button.

#### Step 5.3: Automatic Verification Process

**What happens automatically:**
- The verifier validates the holder's signature on the presentation
- The verifier validates the issuer's signature on the credential
- The verifier checks the credential has not been tampered with
- The verifier checks if challenge and domain values match (if used)
- Cryptographic proofs are validated
- Credential expiration dates are checked

#### Step 5.4: Review Verification Results

You should see verification results displayed:

**Success indicators:**
- "Verification successful" or "Identity verified" message
- Green checkmark or success icon
- All validation checks passed
- Credential details displayed

**Verification checks shown:**
- Holder's signature: Valid
- Issuer's signature: Valid
- Credential integrity: Not tampered
- Challenge match: Verified (if applicable)
- Not expired: Valid
- Presentation format: Valid

#### Step 5.5: Review Verified Credential Information

The verified credential information should be displayed, including:

**Identity Information:**
- Full name (e.g., "Alice Wang")
- Date of birth
- Address information
- Email
- Phone

**Application Details:**
- Application ID
- SSN Last 4 digits
- Other application-specific information

**Metadata:**
- Credential type: "DriversLicenseApplication"
- Issue date and timestamp
- Issuer DID (DMV)
- Holder DID (Alice's wallet)

**Outcome:**
- The bank (SecureBank) has successfully verified the customer's identity
- The account opening process can proceed based on verified information
- No central authority was involved in the verification process

---

## Verification Checklist

Use this checklist to confirm the end-to-end flow completed successfully:

### Issuer Phase
- [ ] Issuer DID is displayed
- [ ] Credential form submitted successfully
- [ ] OOB invitation created successfully
- [ ] Invitation URL copied

### Holder Phase (Credential Acceptance)
- [ ] Holder DID is displayed
- [ ] Invitation URL accepted
- [ ] Credential offer displayed
- [ ] Credential accepted and stored
- [ ] Credential appears in "My Credentials" list

### Verifier Phase (Request Creation)
- [ ] Verifier DID is displayed
- [ ] Presentation request created
- [ ] Request URL copied

### Holder Phase (Presentation Creation)
- [ ] Presentation request accepted
- [ ] Matching credential identified
- [ ] Presentation created and sent successfully

### Verifier Phase (Verification)
- [ ] Presentation received
- [ ] Verification completed successfully
- [ ] All signatures validated
- [ ] Credential information displayed correctly

---

## Understanding the Flow

### What Just Happened?

1. **Credential Issuance:**
   - The Issuer created a verifiable credential containing driver's license information
   - The credential was digitally signed by the Issuer using their private key
   - The Holder received and stored the credential in their wallet

2. **Presentation Creation:**
   - The Verifier requested proof of the credential
   - The Holder created a presentation containing the credential
   - The Holder signed the presentation with their private key

3. **Verification:**
   - The Verifier checked two signatures:
     - The Holder's signature (proves the Holder owns this credential)
     - The Issuer's signature (proves the credential is authentic)
   - No third party or central authority was involved
   - All identity verification happened peer-to-peer

### Key Concepts

**Decentralized Identifier (DID):**
- A unique identifier that doesn't require a central authority
- Each actor (Issuer, Holder, Verifier) has their own DID
- Format: `did:peer:2.Ez6LS...`

**Verifiable Credential:**
- A tamper-evident credential
- Digitally signed by the issuer
- Contains claims about the holder (name, license info, etc.)

**Verifiable Presentation:**
- A package containing one or more verifiable credentials
- Signed by the holder
- Proves the holder owns the credentials

**Out-of-Band (OOB) Invitation:**
- A way to bootstrap communication between parties
- Contains a QR code or URL
- Includes credential offers or presentation requests

---

## Alternative Test Scenarios

### Scenario 2: Multiple Credentials

1. Repeat Phase 1 and Phase 2 with different credential data
2. The Holder should now have two credentials stored
3. Create a presentation request that matches either credential
4. Verify both credentials independently

### Scenario 3: Selective Disclosure

1. When creating a presentation request, specify only certain fields
2. Example: Request only "name" and "licenseType" (not full address)
3. The presentation should include only the requested fields

### Scenario 4: Expired Credential

1. Create a credential with an expiration date in the past
2. Attempt to verify the presentation
3. Verification should fail or show warning about expiration

---

## Troubleshooting

### Problem: Invitation URL doesn't work when pasted

**Solution:**
- Ensure you copied the entire URL (it's very long)
- Check for extra spaces at the beginning or end
- Try using the "Browser Preview" link if available

### Problem: Credential not appearing in Holder wallet

**Solution:**
- Check the holder logs: `docker-compose logs holder`
- Refresh the browser page
- Verify the issuer service is running: http://localhost:5001/health

### Problem: Presentation verification fails

**Solution:**
- Check that the credential was properly issued and stored
- Verify all services are running and healthy
- Check verifier logs: `docker-compose logs verifier`
- Ensure the challenge value matches (if used)

### Problem: "Cannot connect to backend" error

**Solution:**
- Verify all Docker containers are running: `docker-compose ps`
- Check health endpoints:
  - http://localhost:5001/health (Issuer)
  - http://localhost:5003/health (Holder)
  - http://localhost:5002/health (Verifier)
- Restart services if needed: `npm run docker:restart`

### Problem: QR code doesn't scan

**Solution:**
- QR codes are intended for mobile wallet applications
- Use the invitation URL copy/paste method instead for browser testing

---

## Testing Complete

Congratulations! You have successfully completed an end-to-end test of the DID Credential Manager system.

You have demonstrated:
- Decentralized credential issuance
- Secure credential storage
- Verifiable presentations
- Cryptographic verification without a central authority

## Additional Testing

To further test the system:
1. Try different credential types and data
2. Test with multiple credentials in the holder's wallet
3. Test selective disclosure by requesting specific fields only
4. Review the logs to see the DIDComm messages being exchanged
5. Examine the credential JSON to understand the W3C Verifiable Credentials format

## Clean Up

When finished testing:
1. Stop all services: `npm run docker:down`
2. (Optional) Remove all data: `npm run docker:clean`

---

## Support and Next Steps

For more detailed information about the system:
- Review `docs/full_msg_flow.md` for technical details
- Check the main `README.md` for development information
- Examine API documentation in the `docs/api/` folder

