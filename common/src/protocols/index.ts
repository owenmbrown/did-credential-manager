/**
 * DIDComm Protocol Implementations
 * 
 * This module exports all DIDComm protocol handlers for the DID Education Toolkit.
 * 
 * @module protocols
 */

// Out-of-Band 2.0
export {
  OOBProtocol,
  type OOBInvitation,
  type OOBAttachment,
  type CreateOOBInvitationOptions,
  type ParsedOOBInvitation,
} from './oob.js';

// Issue Credential 3.0
export {
  IssueCredentialProtocol,
  type ProposeCredentialMessage,
  type OfferCredentialMessage,
  type RequestCredentialMessage,
  type IssueCredentialMessage,
  type AckMessage as IssueCredentialAckMessage,
  type ProblemReportMessage as IssueCredentialProblemReportMessage,
  type CredentialFormat,
  type CredentialPreview,
} from './issue-credential.js';

// Present Proof 3.0
export {
  PresentProofProtocol,
  type ProposePresentationMessage,
  type RequestPresentationMessage,
  type PresentProofMessage,
  type PresentProofAckMessage,
  type PresentProofProblemReportMessage,
  type PresentationFormat,
  type PresentationDefinition,
  type InputDescriptor,
} from './present-proof.js';

// Basic Message 2.0
export {
  BasicMessageProtocol,
  type BasicMessage,
} from './basic-message.js';

