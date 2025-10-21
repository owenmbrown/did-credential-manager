export type Health = {
  status: string
  service: 'issuer' | 'holder' | 'verifier'
  did?: string
  timestamp: string
  credentialCount?: number
  activeChallenges?: number
}

export type IssueCredentialRequest = {
  credentialSubject: { id: string } & Record<string, any>
  type?: string[]
  expirationDate?: string
}

export type IssueCredentialResponse = {
  credential: any
}

export type VerifyCredentialResponse = {
  valid: boolean
  errors?: string[]
}
