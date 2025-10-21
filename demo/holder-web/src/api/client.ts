const base = import.meta.env.VITE_HOLDER_BASE_URL || 'http://localhost:5003'
async function j<T>(res: Response): Promise<T> { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() }

export const api = {
  did: () => fetch(`${base}/did`).then((r) => j<{ did: string }>(r)),
  health: () => fetch(`${base}/health`).then((r) => j<any>(r)),
  credentials: () => fetch(`${base}/credentials`).then((r) => j<{ credentials: any[]; count: number }>(r)),
  getCredential: (id: string) => fetch(`${base}/credentials/${encodeURIComponent(id)}`).then((r) => j<any>(r)),
  storeCredential: (credential: any) => fetch(`${base}/credentials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) }).then((r) => j<{ success: true; message: string }>(r)),
  deleteCredential: (id: string) => fetch(`${base}/credentials/${encodeURIComponent(id)}`, { method: 'DELETE' }).then((r) => j<{ success: true; message: string }>(r)),
  acceptInvitation: (body: { invitationUrl?: string; invitation?: any }) => fetch(`${base}/invitations/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => j<any>(r)),
  createPresentation: (body: { credentials: any[]; challenge?: string; domain?: string; verifierDid?: string }) => fetch(`${base}/presentations/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => j<{ presentation: any }>(r)),
  sendPresentation: (body: { verifierDid: string; presentation: any; threadId?: string }) => fetch(`${base}/presentations/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => j<{ success: true; message: string; verifierDid: string }>(r)),
}
