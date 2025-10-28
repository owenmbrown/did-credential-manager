import { useEffect, useState } from 'react'
import { api } from './api/client'
import './styles.css'

export default function App() {
  const [did, setDid] = useState<string>('')
  const [health, setHealth] = useState<any>(null)
  const [credInput, setCredInput] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [requestedTypes, setRequestedTypes] = useState('DemoCredential')
  const [invite, setInvite] = useState<{ url: string; qr: string; challenge: string } | null>(null)
  const [vpInput, setVpInput] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'verify' | 'request' | 'presentation'>('verify')

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
      setCredInput('') // Clear on success
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function createInvitation() {
    setError(null)
    try {
      const resp = await api.createPresentationRequestInvitation({
        requestedCredentials: requestedTypes.split(',').map((s) => s.trim()).filter(Boolean),
        ttl: 3600,
      })
      setInvite({ url: resp.invitationUrl, qr: resp.qrCode, challenge: resp.challenge })
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function verifyPresentation() {
    setError(null)
    setResult(null)
    try {
      const presentation = JSON.parse(vpInput)
      const res = await api.verifyPresentation({ presentation, challenge: invite?.challenge })
      setResult(res)
      setVpInput('') // Clear on success
    } catch (e: any) {
      setError(e.message)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="bank-container">
      {/* Header */}
      <div className="bank-header">
        <h1>SecureBank Identity Verification</h1>
        <p>Decentralized Identity Credential Verification System</p>
      </div>

      {/* Stats */}
      <div className="bank-stats">
        <div className="stat-card">
          <div className="stat-label">Verifier DID</div>
          <div className="stat-value">{did || 'Loading...'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">System Status</div>
          <div className="stat-value">{health ? '✓ Online' : 'Connecting...'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          className="bank-button"
          style={{
            background: activeTab === 'verify' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#edf2f7',
            color: activeTab === 'verify' ? 'white' : '#2d3748',
          }}
          onClick={() => setActiveTab('verify')}
        >
          Verify Credential
        </button>
        <button
          className="bank-button"
          style={{
            background: activeTab === 'request' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#edf2f7',
            color: activeTab === 'request' ? 'white' : '#2d3748',
          }}
          onClick={() => setActiveTab('request')}
        >
          Request Presentation
        </button>
        <button
          className="bank-button"
          style={{
            background: activeTab === 'presentation' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#edf2f7',
            color: activeTab === 'presentation' ? 'white' : '#2d3748',
          }}
          onClick={() => setActiveTab('presentation')}
        >
          Verify Presentation
        </button>
      </div>

      {/* Error Display */}
      {error && <div className="error-message">❌ Error: {error}</div>}

      {/* Tab: Verify Credential */}
      {activeTab === 'verify' && (
        <div className="bank-card">
          <h2>🔐 Verify Digital Credential</h2>
          <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
            Verify the authenticity of a credential by pasting its JSON data below.
          </p>
          
          <label className="label">Credential JSON</label>
          <textarea
            className="bank-textarea"
            value={credInput}
            onChange={(e) => setCredInput(e.target.value)}
            placeholder='Paste credential JSON here, e.g. {"@context": [...], "type": [...]}'
            rows={10}
          />
          
          <button className="bank-button" onClick={verifyCred} style={{ marginTop: '1rem' }}>
            Verify Credential
          </button>
          
          {result && (
            <div className="result-container">
              <h3 style={{ marginBottom: '1rem', color: '#2d3748' }}>✓ Verification Result</h3>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Tab: Request Presentation */}
      {activeTab === 'request' && (
        <div className="bank-card">
          <h2>📋 Request Credential Presentation</h2>
          <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
            Generate an invitation for a wallet to present specific credentials.
          </p>
          
          <label className="label">Requested Credential Types (comma-separated)</label>
          <input
            className="bank-input"
            value={requestedTypes}
            onChange={(e) => setRequestedTypes(e.target.value)}
            placeholder="e.g. DemoCredential, ProofOfAge"
          />
          
          <button className="bank-button" onClick={createInvitation} style={{ marginTop: '1rem' }}>
            Generate Verification Request
          </button>
          
          {invite && (
            <div style={{ marginTop: '2rem' }}>
              <div className="info-box">
                <strong>✅ Invitation generated successfully!</strong>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  Share the QR code or URL below with the credential holder.
                </p>
              </div>
              
              <div style={{ marginTop: '1.5rem' }}>
                <label className="label">Invitation URL</label>
                <div className="url-display">{invite.url}</div>
                <button className="copy-button" onClick={() => copyToClipboard(invite.url)}>
                  📋 Copy URL
                </button>
              </div>
              
              <div className="qr-container">
                <label className="label" style={{ textAlign: 'center' }}>QR Code</label>
                <img src={invite.qr} alt="Invitation QR Code" className="qr-image" />
              </div>
              
              <div style={{ marginTop: '1.5rem' }}>
                <label className="label">Challenge</label>
                <div className="challenge-display">{invite.challenge}</div>
                <button className="copy-button" onClick={() => copyToClipboard(invite.challenge)}>
                  📋 Copy Challenge
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Verify Presentation */}
      {activeTab === 'presentation' && (
        <div className="bank-card">
          <h2>🎯 Verify Presentation</h2>
          <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
            Verify a verifiable presentation that was created in response to your request.
          </p>
          
          {invite && (
            <div className="info-box">
              <strong>ℹ️ Current Challenge</strong>
              <div className="challenge-display" style={{ marginTop: '0.5rem' }}>{invite.challenge}</div>
            </div>
          )}
          
          <label className="label">Presentation JSON</label>
          <textarea
            className="bank-textarea"
            value={vpInput}
            onChange={(e) => setVpInput(e.target.value)}
            placeholder='Paste presentation JSON here, e.g. {"@context": [...], "type": ["VerifiablePresentation"], ...}'
            rows={10}
          />
          
          <button className="bank-button" onClick={verifyPresentation} style={{ marginTop: '1rem' }}>
            Verify Presentation
          </button>
          
          {result && (
            <div className="result-container">
              <h3 style={{ marginBottom: '1rem', color: '#2d3748' }}>✓ Presentation Verification Result</h3>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}