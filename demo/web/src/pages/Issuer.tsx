import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Issuer() {
  const [did, setDid] = useState<string>('')
  const [health, setHealth] = useState<any>(null)
  const [subjectId, setSubjectId] = useState('did:peer:holder')
  const [name, setName] = useState('Alice')
  const [age, setAge] = useState<number | ''>('')
  const [emails, setEmails] = useState<string>('alice@example.com')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [offerType, setOfferType] = useState('DemoCredential')
  const [offerRes, setOfferRes] = useState<{ invitationUrl: string; qrCode: string } | null>(null)

  useEffect(() => {
    api.issuer.did().then((d) => setDid(d.did)).catch(() => {})
    api.issuer.health().then(setHealth).catch(() => {})
  }, [])

  async function issue() {
    setError(null)
    setResult(null)
    try {
      const res = await api.issuer.issue({
        credentialSubject: {
          id: subjectId,
          name,
          ...(age !== '' ? { age: typeof age === 'string' ? Number(age) : age } : {}),
          ...(emails ? { emails: emails.split(',').map((e) => e.trim()).filter(Boolean) } : {}),
        },
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
        <input value={age} onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))} placeholder="age" type="number" min={0} style={{ width: 120 }} />
        <input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="emails (comma separated)" style={{ minWidth: 300 }} />
        <button onClick={issue}>Issue</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <details open>
          <summary>Response</summary>
          <pre style={{ background: '#f6f6f6', padding: 8 }}>{JSON.stringify(result, null, 2)}</pre>
        </details>
      )}

      <h3 style={{ marginTop: 24 }}>Create OOB Credential Offer</h3>
      <p style={{ maxWidth: 800, color: '#555' }}>
        OOB (Out-of-Band) invitation is a DIDComm URL/QR for the Holder app. Don’t click the URL in browser — paste it into the Holder site “Accept Invitation”. A browser-test link is shown after generation.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={offerType} onChange={(e) => setOfferType(e.target.value)} placeholder="credential type" />
        <button
          onClick={async () => {
            try {
              setOfferRes(null)
              const resp = await api.issuer.createCredentialOfferInvitation({
                credentialType: offerType,
                credentialData: {
                  name,
                  ...(age !== '' ? { age: typeof age === 'string' ? Number(age) : age } : {}),
                  ...(emails ? { emails: emails.split(',').map((e) => e.trim()).filter(Boolean) } : {}),
                },
                ttl: 3600,
              })
              setOfferRes({ invitationUrl: resp.invitationUrl, qrCode: resp.qrCode })
            } catch (e: any) {
              setError(e.message)
            }
          }}
        >
          Generate Invitation
        </button>
      </div>
      {offerRes && (
        <div style={{ marginTop: 8 }}>
          <div>
            <strong>Invitation URL:</strong>
            <div style={{ wordBreak: 'break-all' }}>{offerRes.invitationUrl}</div>
          </div>
          <div style={{ marginTop: 6, color: '#666' }}>
            Preview in browser (test only): {
              (() => {
                try {
                  const u = new URL(offerRes.invitationUrl)
                  u.pathname = u.pathname.replace(/\/didcomm$/, '/invitations/accept')
                  return <a href={u.toString()} target="_blank" rel="noreferrer">{u.toString()}</a>
                } catch { return null }
              })()
            }
          </div>
          <div style={{ marginTop: 8 }}>
            <img src={offerRes.qrCode} alt="Invitation QR" style={{ width: 200, height: 200 }} />
          </div>
        </div>
      )}
    </div>
  )
}
