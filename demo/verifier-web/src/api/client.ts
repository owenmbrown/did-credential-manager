const base = import.meta.env.VITE_VERIFIER_BASE_URL || 'http://localhost:5002'
async function j<T>(res: Response): Promise<T> { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() }

export const api = {
  did: () => fetch(`${base}/did`).then((r) => j<{ did: string }>(r)),
  health: () => fetch(`${base}/health`).then((r) => j<any>(r)),
  verifyCredential: (credential: any) => fetch(`${base}/verify/credential`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) }).then((r) => j<any>(r)),
  createPresentationRequestInvitation: (body: { requestedCredentials: string[]; requestedFields?: string[]; ttl?: number }) => fetch(`${base}/invitations/presentation-request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => j<{ invitation: any; invitationUrl: string; qrCode: string; challenge: string }>(r)),
  verifyPresentation: (body: { presentation: any; challenge?: string; challengeId?: string; domain?: string }) => fetch(`${base}/verify/presentation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => j<any>(r)),
}
