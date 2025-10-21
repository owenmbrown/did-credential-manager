import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Issuer() {
  const [did, setDid] = useState<string>('')
  const [health, setHealth] = useState<any>(null)
  const [subjectId, setSubjectId] = useState('did:peer:holder')
  const [name, setName] = useState('Alice')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.issuer.did().then((d) => setDid(d.did)).catch(() => {})
    api.issuer.health().then(setHealth).catch(() => {})
  }, [])

  async function issue() {
    setError(null)
    setResult(null)
    try {
      const res = await api.issuer.issue({
        credentialSubject: { id: subjectId, name },
        type: ['DemoCredential'],
      })
      setResult(res)
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div>
      <h2>Issuer</h2>
      <p>DID: {did || '...'}</p>
      <pre style={{ background: '#f6f6f6', padding: 8 }}>{health ? JSON.stringify(health, null, 2) : 'loading health...'}</pre>

      <h3>Issue Credential</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="holder DID" style={{ minWidth: 260 }} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" />
        <button onClick={issue}>Issue</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <details open>
          <summary>Response</summary>
          <pre style={{ background: '#f6f6f6', padding: 8 }}>{JSON.stringify(result, null, 2)}</pre>
        </details>
      )}
    </div>
  )
}
