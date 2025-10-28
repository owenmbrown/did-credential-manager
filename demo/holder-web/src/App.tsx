import React, { useState } from 'react'

export default function App() {
  const [invitation, setInvitation] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    setLoading(true)
    try {
      const res = await fetch('http://localhost:5003/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationUrl: invitation }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
      }

      const json = await res.json()
      setStatus(JSON.stringify(json, null, 2))
    } catch (err: any) {
      setStatus(`Network Error: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Holder — Invitation accept test</h1>
      <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Issuer invitation URL
          <br />
          <input
            value={invitation}
            onChange={(e) => setInvitation(e.target.value)}
            placeholder="http://localhost:5001/didcomm?oob=..."
            style={{ width: '100%', padding: 8, marginTop: 6 }}
          />
        </label>

        <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? 'Processing…' : 'Process Invitation'}
        </button>
      </form>

      <section style={{ marginTop: 20 }}>
        <h3>Result</h3>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f7f7f7', padding: 12 }}>
          {status ?? 'No result yet.'}
        </pre>
      </section>
    </div>
  )
}
