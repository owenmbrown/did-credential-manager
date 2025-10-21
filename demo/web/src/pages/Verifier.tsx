import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Verifier() {
  const [did, setDid] = useState<string>('')
  const [health, setHealth] = useState<any>(null)
  const [input, setInput] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.verifier.did().then((d) => setDid(d.did)).catch(() => {})
    api.verifier.health().then(setHealth).catch(() => {})
  }, [])

  async function verify() {
    setError(null)
    setResult(null)
    try {
      const credential = JSON.parse(input)
      const res = await api.verifier.verifyCredential(credential)
      setResult(res)
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div>
      <h2>Verifier</h2>
      <p>DID: {did || '...'}</p>
      <pre style={{ background: '#f6f6f6', padding: 8 }}>{health ? JSON.stringify(health, null, 2) : 'loading health...'}</pre>
      <h3>Verify Credential</h3>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste a credential JSON here" rows={10} style={{ width: '100%', maxWidth: 800 }} />
      <div style={{ marginTop: 8 }}>
        <button onClick={verify}>Verify</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <details open>
          <summary>Result</summary>
          <pre style={{ background: '#f6f6f6', padding: 8 }}>{JSON.stringify(result, null, 2)}</pre>
        </details>
      )}
    </div>
  )
}
