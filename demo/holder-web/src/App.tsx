import { useEffect, useState } from 'react'
import { api } from './api/client'

export default function App() {
  const [did, setDid] = useState<string>('')
  const [health, setHealth] = useState<any>(null)
  const [creds, setCreds] = useState<any[]>([])
  const [inviteUrl, setInviteUrl] = useState('')
  const [vpChallenge, setVpChallenge] = useState('')
  const [vpDomain, setVpDomain] = useState('')
  const [verifierDid, setVerifierDid] = useState('')
  const [presentation, setPresentation] = useState<any | null>(null)
  const [vcInput, setVcInput] = useState('')

  useEffect(() => {
    api.did().then((d) => setDid(d.did)).catch(() => {})
    api.health().then(setHealth).catch(() => {})
    api.credentials().then((r) => setCreds(r.credentials)).catch(() => {})
  }, [])

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Holder</h1>
      <p>DID: {did || '...'}</p>
      <pre style={{ background: '#f6f6f6', padding: 8 }}>{health ? JSON.stringify(health, null, 2) : 'loading health...'}</pre>
      <h3>Stored Credentials ({creds.length})</h3>
      <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
        {creds.map((c: any) => (
          <details key={c.id} style={{ marginBottom: 8 }}>
            <summary>{c.id}</summary>
            <pre style={{ background: '#f6f6f6', padding: 8 }}>{JSON.stringify(c, null, 2)}</pre>
            <button onClick={async () => { await api.deleteCredential(c.id); const r = await api.credentials(); setCreds(r.credentials) }}>Delete</button>
          </details>
        ))}
      </div>

      <h3 style={{ marginTop: 24 }}>Accept Invitation</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={inviteUrl} onChange={(e) => setInviteUrl(e.target.value)} placeholder="Paste invitation URL here" style={{ minWidth: 400 }} />
        <button onClick={async () => { await api.acceptInvitation({ invitationUrl: inviteUrl }); }}>Accept</button>
      </div>

      <h3 style={{ marginTop: 24 }}>Store Credential (manual)</h3>
      <textarea value={vcInput} onChange={(e) => setVcInput(e.target.value)} placeholder="Paste a VC JSON here" rows={8} style={{ width: '100%', maxWidth: 800 }} />
      <div style={{ marginTop: 8 }}>
        <button
          onClick={async () => {
            try {
              const credential = JSON.parse(vcInput)
              await api.storeCredential(credential)
              const r = await api.credentials()
              setCreds(r.credentials)
              setVcInput('')
            } catch {
              // ignore parse errors for demo
            }
          }}
        >
          Store VC
        </button>
      </div>

      <h3 style={{ marginTop: 24 }}>Create Presentation</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={verifierDid} onChange={(e) => setVerifierDid(e.target.value)} placeholder="verifier DID (optional)" />
        <input value={vpChallenge} onChange={(e) => setVpChallenge(e.target.value)} placeholder="challenge (optional)" />
        <input value={vpDomain} onChange={(e) => setVpDomain(e.target.value)} placeholder="domain (optional)" />
        <button
          onClick={async () => {
            const idsOrCreds = await api.credentials();
            if (!idsOrCreds.credentials?.length) return;
            const r = await api.createPresentation({
              credentials: idsOrCreds.credentials.map((x: any) => x.id ?? x),
              challenge: vpChallenge || undefined,
              domain: vpDomain || undefined,
              verifierDid: verifierDid || undefined,
            })
            setPresentation(r.presentation)
          }}
        >
          Build VP from stored credentials
        </button>
      </div>
      {presentation && (
        <details open>
          <summary>Generated Presentation</summary>
          <pre style={{ background: '#f6f6f6', padding: 8 }}>{JSON.stringify(presentation, null, 2)}</pre>
        </details>
      )}

      <h3 style={{ marginTop: 24 }}>Send Presentation</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={verifierDid} onChange={(e) => setVerifierDid(e.target.value)} placeholder="verifier DID" />
        <button
          onClick={async () => {
            if (!presentation || !verifierDid) return
            await api.sendPresentation({ verifierDid, presentation })
          }}
        >
          Send VP via DIDComm
        </button>
      </div>
    </div>
  )
}
