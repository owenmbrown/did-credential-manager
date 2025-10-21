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
  },
  holder: {
    did: () => fetch(`${holderBase}/did`).then((r) => j<{ did: string }>(r)),
    health: () => fetch(`${holderBase}/health`).then((r) => j<any>(r)),
    credentials: () => fetch(`${holderBase}/credentials`).then((r) => j<{ credentials: any[]; count: number }>(r)),
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
  },
}
