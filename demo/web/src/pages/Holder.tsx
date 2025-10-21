import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Holder() {
  const [did, setDid] = useState<string>('')
  const [health, setHealth] = useState<any>(null)
  const [creds, setCreds] = useState<any[]>([])

  useEffect(() => {
    api.holder.did().then((d) => setDid(d.did)).catch(() => {})
    api.holder.health().then(setHealth).catch(() => {})
    api.holder.credentials().then((r) => setCreds(r.credentials)).catch(() => {})
  }, [])

  return (
    <div>
      <h2>Holder</h2>
      <p>DID: {did || '...'}</p>
      <pre style={{ background: '#f6f6f6', padding: 8 }}>{health ? JSON.stringify(health, null, 2) : 'loading health...'}</pre>
      <h3>Stored Credentials ({creds.length})</h3>
      <pre style={{ background: '#f6f6f6', padding: 8, maxHeight: 300, overflow: 'auto' }}>{JSON.stringify(creds, null, 2)}</pre>
    </div>
  )
}
