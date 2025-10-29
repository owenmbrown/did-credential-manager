import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api/client'
import './styles.css'

export default function VerifyIdentity() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invite, setInvite] = useState<{ url: string; qr: string; challenge: string } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [applicationData, setApplicationData] = useState<any>(null)

  // Load application data
  useEffect(() => {
    const data = sessionStorage.getItem('bankApplication')
    if (!data) {
      navigate('/apply')
      return
    }
    setApplicationData(JSON.parse(data))
  }, [navigate])

  // Generate presentation request
  useEffect(() => {
    if (!applicationData) return

    async function generateRequest() {
      setLoading(true)
      try {
        // Request only the fields we need for KYC
        const resp = await api.createPresentationRequestInvitation({
          requestedCredentials: ['DemoCredential', 'GovernmentID', 'DriversLicense'],
          requestedFields: ['name', 'dateOfBirth', 'address'], // Selective disclosure!
          ttl: 600, // 10 minutes
        })
        setInvite({ url: resp.invitationUrl, qr: resp.qrCode, challenge: resp.challenge })
        
        // Start polling for verification result
        startPolling(resp.challenge)
      } catch (e: any) {
        setError(e.message || 'Failed to generate verification request')
      } finally {
        setLoading(false)
      }
    }

    generateRequest()
  }, [applicationData])

  // Poll for verification results
  function startPolling(challenge: string) {
    let pollCount = 0
    const maxPolls = 60 // 5 minutes max (every 5 seconds)

    const interval = setInterval(async () => {
      pollCount++
      
      // Check if presentation was received
      // In a real app, this would check a backend endpoint
      // For demo, we'll simulate it with sessionStorage
      const verified = sessionStorage.getItem(`verified_${challenge}`)
      
      if (verified) {
        clearInterval(interval)
        setVerifying(false)
        // Store verification data
        sessionStorage.setItem('verificationResult', verified)
        navigate('/approved')
      } else if (pollCount >= maxPolls) {
        clearInterval(interval)
        setError('Verification timeout. Please try again.')
      }
    }, 5000)

    // Cleanup on unmount
    return () => clearInterval(interval)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="bank-container">
      <div className="verify-header">
        <button className="btn-back" onClick={() => navigate('/apply')}>
          ← Back
        </button>
        <div>
          <h1>Identity Verification</h1>
          <p>Step 2 of 2: Verify Your Credentials</p>
        </div>
      </div>

      <div className="verify-content">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Generating secure verification request...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            ❌ {error}
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        )}

        {invite && !verifying && (
          <div className="verify-grid">
            <div className="qr-section">
              <div className="qr-card">
                <h2>Scan to Verify</h2>
                <p className="qr-instructions">
                  Open your digital wallet app and scan this QR code to share your credentials
                </p>
                
                <div className="qr-code-container">
                  <img src={invite.qr} alt="Verification QR Code" className="qr-code-image" />
                  <div className="qr-scanning-animation"></div>
                </div>

                <div className="qr-info">
                  <div className="info-badge">
                    <span className="badge-icon">🔒</span>
                    <span>Encrypted & Secure</span>
                  </div>
                  <div className="info-badge">
                    <span className="badge-icon">⏱️</span>
                    <span>Valid for 10 minutes</span>
                  </div>
                </div>

                <button
                  className="btn-ghost copy-btn"
                  onClick={() => copyToClipboard(invite.url)}
                >
                  📋 Copy Link Instead
                </button>
              </div>

              <div className="privacy-card">
                <h3>🛡️ Your Privacy is Protected</h3>
                <p>We're only requesting:</p>
                <ul className="requested-fields">
                  <li>✓ Name</li>
                  <li>✓ Date of Birth</li>
                  <li>✓ Address</li>
                </ul>
                <p className="privacy-note">
                  Other information in your credential (like ID numbers) will NOT be shared.
                  This is <strong>selective disclosure</strong> - you control what's revealed!
                </p>
              </div>
            </div>

            <div className="instructions-section">
              <div className="instruction-card">
                <h2>How to Verify</h2>
                <div className="steps">
                  <div className="instruction-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3>Open Your Wallet</h3>
                      <p>Launch your digital wallet app on your phone</p>
                    </div>
                  </div>

                  <div className="instruction-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h3>Scan QR Code</h3>
                      <p>Use the scan feature to read this QR code</p>
                    </div>
                  </div>

                  <div className="instruction-step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>Review Request</h3>
                      <p>Check which information will be shared</p>
                    </div>
                  </div>

                  <div className="instruction-step">
                    <div className="step-number">4</div>
                    <div className="step-content">
                      <h3>Approve</h3>
                      <p>Confirm to share your credentials</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="waiting-card">
                <div className="waiting-animation">
                  <div className="pulse-dot"></div>
                </div>
                <h3>Waiting for your response...</h3>
                <p>Once you scan and approve, we'll verify your identity instantly</p>
              </div>

              <div className="help-card">
                <h3>Need Help?</h3>
                <p>Don't have a digital wallet yet?</p>
                <button className="btn-ghost">Download Wallet App</button>
                <p className="help-text">
                  Or contact support for assistance
                </p>
              </div>
            </div>
          </div>
        )}

        {verifying && (
          <div className="verifying-state">
            <div className="verification-animation">
              <div className="check-circle">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" stroke="#667eea" strokeWidth="4" fill="none" className="rotating-circle"/>
                </svg>
                <div className="inner-check">✓</div>
              </div>
            </div>
            <h2>Verifying Your Credentials...</h2>
            <p>Please wait while we verify your identity</p>
            <div className="verification-steps">
              <div className="verification-step completed">
                <span className="step-icon">✓</span>
                <span>Credentials received</span>
              </div>
              <div className="verification-step active">
                <span className="step-icon">⟳</span>
                <span>Validating authenticity...</span>
              </div>
              <div className="verification-step">
                <span className="step-icon">○</span>
                <span>Creating account</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

