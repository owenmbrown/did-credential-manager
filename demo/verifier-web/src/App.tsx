import { useEffect, useState } from 'react'
import { api } from './api/client'

export default function App() {
  const [did, setDid] = useState<string>('')
  const [health, setHealth] = useState<any>(null)
  const [credInput, setCredInput] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [requestedTypes, setRequestedTypes] = useState('DemoCredential')
  const [invite, setInvite] = useState<{ url: string; qr: string; challenge: string } | null>(null)
  const [vpInput, setVpInput] = useState<string>('')

  useEffect(() => {
    api.did().then((d) => setDid(d.did)).catch(() => {})
    api.health().then(setHealth).catch(() => {})
  }, [])

  async function verifyCred() {
    setError(null)
    setResult(null)
    try {
      const credential = JSON.parse(credInput)
      const res = await api.verifyCredential(credential)
      setResult(res)
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Verifier</h1>
      <p>DID: {did || '...'}</p>
      <pre style={{ background: '#f6f6f6', padding: 8 }}>{health ? JSON.stringify(health, null, 2) : 'loading health...'}</pre>

      <h3>Verify Credential</h3>
      <textarea value={credInput} onChange={(e) => setCredInput(e.target.value)} placeholder="Paste a credential JSON here" rows={10} style={{ width: '100%', maxWidth: 800 }} />
      <div style={{ marginTop: 8 }}>
        <button onClick={verifyCred}>Verify</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <details open>
          <summary>Result</summary>
          <pre style={{ background: '#f6f6f6', padding: 8 }}>{JSON.stringify(result, null, 2)}</pre>
        </details>
      )}

      <h3 style={{ marginTop: 24 }}>Create OOB Presentation Request</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={requestedTypes} onChange={(e) => setRequestedTypes(e.target.value)} placeholder="requested types (comma separated)" />
        <button
          onClick={async () => {
            const resp = await api.createPresentationRequestInvitation({
              requestedCredentials: requestedTypes.split(',').map((s) => s.trim()).filter(Boolean),
              ttl: 3600,
            })
            setInvite({ url: resp.invitationUrl, qr: resp.qrCode, challenge: resp.challenge })
          }}
        >
          Generate Invitation
        </button>
      </div>
      {invite && (
        <div style={{ marginTop: 8 }}>
          <div>
            <strong>Invitation URL:</strong>
            <div style={{ wordBreak: 'break-all' }}>{invite.url}</div>
          </div>
          <div style={{ marginTop: 8 }}>
            <img src={invite.qr} alt="Invitation QR" style={{ width: 200, height: 200 }} />
          </div>
          <div style={{ marginTop: 8 }}>Challenge: {invite.challenge}</div>
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>Verify Presentation</h3>
      <textarea value={vpInput} onChange={(e) => setVpInput(e.target.value)} placeholder="Paste a presentation JSON here" rows={10} style={{ width: '100%', maxWidth: 800 }} />
      <div style={{ marginTop: 8 }}>
        <button
          onClick={async () => {
            try {
              const presentation = JSON.parse(vpInput)
              const res = await api.verifyPresentation({ presentation, challenge: invite?.challenge })
              setResult(res)
            } catch (e: any) {
              setError(e.message)
            }
          }}
        >
          Verify Presentation
        </button>
      </div>
    </div>
  )
}
