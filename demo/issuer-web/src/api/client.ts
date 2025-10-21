const base = import.meta.env.VITE_ISSUER_BASE_URL || 'http://localhost:5001'

async function j<T>(res: Response): Promise<T> { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() }

export const api = {
  did: () => fetch(`${base}/did`).then((r) => j<{ did: string }>(r)),
  health: () => fetch(`${base}/health`).then((r) => j<any>(r)),
  issue: (body: any) => fetch(`${base}/credentials/issue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => j<any>(r)),
  createCredentialOfferInvitation: (body: { credentialType: string; credentialData: Record<string, any>; ttl?: number }) =>
    fetch(`${base}/invitations/credential-offer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => j<{ invitation: any; invitationUrl: string; qrCode: string }>(r)),
}
