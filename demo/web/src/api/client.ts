const issuerBase = import.meta.env.VITE_ISSUER_BASE_URL || 'http://localhost:5001'
const holderBase = import.meta.env.VITE_HOLDER_BASE_URL || 'http://localhost:5003'
const verifierBase = import.meta.env.VITE_VERIFIER_BASE_URL || 'http://localhost:5002'

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  issuer: {
    did: () => fetch(`${issuerBase}/did`).then((r) => j<{ did: string }>(r)),
    health: () => fetch(`${issuerBase}/health`).then((r) => j<any>(r)),
    issue: (body: any) =>
      fetch(`${issuerBase}/credentials/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => j<any>(r)),
    createCredentialOfferInvitation: (body: { credentialType: string; credentialData: Record<string, any>; ttl?: number }) =>
      fetch(`${issuerBase}/invitations/credential-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => j<{ invitation: any; invitationUrl: string; qrCode: string }>(r)),
  },
  holder: {
    did: () => fetch(`${holderBase}/did`).then((r) => j<{ did: string }>(r)),
    health: () => fetch(`${holderBase}/health`).then((r) => j<any>(r)),
    credentials: () => fetch(`${holderBase}/credentials`).then((r) => j<{ credentials: any[]; count: number }>(r)),
    getCredential: (id: string) => fetch(`${holderBase}/credentials/${encodeURIComponent(id)}`).then((r) => j<any>(r)),
    storeCredential: (credential: any) =>
      fetch(`${holderBase}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      }).then((r) => j<{ success: true; message: string }>(r)),
    deleteCredential: (id: string) =>
      fetch(`${holderBase}/credentials/${encodeURIComponent(id)}`, { method: 'DELETE' }).then((r) => j<{ success: true; message: string }>(r)),
    acceptInvitation: (body: { invitationUrl?: string; invitation?: any }) =>
      fetch(`${holderBase}/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => j<any>(r)),
    createPresentation: (body: { credentials: any[]; challenge?: string; domain?: string; verifierDid?: string }) =>
      fetch(`${holderBase}/presentations/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => j<{ presentation: any }>(r)),
    sendPresentation: (body: { verifierDid: string; presentation: any; threadId?: string }) =>
      fetch(`${holderBase}/presentations/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => j<{ success: true; message: string; verifierDid: string }>(r)),
  },
  verifier: {
    did: () => fetch(`${verifierBase}/did`).then((r) => j<{ did: string }>(r)),
    health: () => fetch(`${verifierBase}/health`).then((r) => j<any>(r)),
    verifyCredential: (credential: any) =>
      fetch(`${verifierBase}/verify/credential`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      }).then((r) => j<any>(r)),
    createPresentationRequestInvitation: (body: { requestedCredentials: string[]; ttl?: number }) =>
      fetch(`${verifierBase}/invitations/presentation-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => j<{ invitation: any; invitationUrl: string; qrCode: string; challenge: string }>(r)),
    verifyPresentation: (body: { presentation: any; challenge?: string; challengeId?: string; domain?: string }) =>
      fetch(`${verifierBase}/verify/presentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => j<any>(r)),
  },
}
