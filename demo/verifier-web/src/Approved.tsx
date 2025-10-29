import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './styles.css'

export default function Approved() {
  const navigate = useNavigate()
  const [applicationData, setApplicationData] = useState<any>(null)
  const [accountNumber, setAccountNumber] = useState('')
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    // Load application data
    const data = sessionStorage.getItem('bankApplication')
    if (!data) {
      navigate('/apply')
      return
    }
    setApplicationData(JSON.parse(data))

    // Generate account number
    const accountNum = 'ACC-' + Math.random().toString(36).substring(2, 11).toUpperCase()
    setAccountNumber(accountNum)

    // Simulate account creation
    const timer = setTimeout(() => {
      setProcessing(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [navigate])

  const clearAndGoHome = () => {
    sessionStorage.clear()
    navigate('/')
  }

  return (
    <div className="bank-container">
      <div className="approved-container">
        {processing ? (
          <div className="processing-state">
            <div className="spinner large"></div>
            <h2>Creating Your Account...</h2>
            <p>Processing verification results</p>
            <div className="progress-steps">
              <div className="progress-step done">✓ Identity Verified</div>
              <div className="progress-step active">⟳ Creating Account</div>
              <div className="progress-step">○ Sending Confirmation</div>
            </div>
          </div>
        ) : (
          <>
            <div className="success-icon">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="60" fill="#10b981" opacity="0.1"/>
                <circle cx="60" cy="60" r="48" fill="#10b981" opacity="0.2"/>
                <circle cx="60" cy="60" r="40" fill="#10b981"/>
                <path d="M40 60L55 75L80 45" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h1 className="approved-title">Account Approved!</h1>
            <p className="approved-subtitle">
              Your identity has been verified and your account is ready to use
            </p>

            <div className="account-details-card">
              <div className="account-header">
                <h2>Account Information</h2>
                <div className="account-status">
                  <span className="status-dot active"></span>
                  <span>Active</span>
                </div>
              </div>

              <div className="account-info">
                <div className="info-row">
                  <span className="label">Account Type:</span>
                  <span className="value">{applicationData?.accountType.toUpperCase()} ACCOUNT</span>
                </div>
                <div className="info-row">
                  <span className="label">Account Number:</span>
                  <span className="value monospace">{accountNumber}</span>
                </div>
                <div className="info-row">
                  <span className="label">Account Holder:</span>
                  <span className="value">{applicationData?.firstName} {applicationData?.lastName}</span>
                </div>
                <div className="info-row">
                  <span className="label">Opening Balance:</span>
                  <span className="value">$0.00</span>
                </div>
                <div className="info-row">
                  <span className="label">Status:</span>
                  <span className="value success">✓ Verified</span>
                </div>
              </div>
            </div>

            <div className="verification-summary">
              <h3>🔐 Verification Summary</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <div className="summary-icon">✓</div>
                  <div>
                    <h4>Identity Verified</h4>
                    <p>Credentials validated via blockchain</p>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">✓</div>
                  <div>
                    <h4>Privacy Protected</h4>
                    <p>Only required information was shared</p>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">✓</div>
                  <div>
                    <h4>KYC Compliant</h4>
                    <p>Meets all regulatory requirements</p>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">✓</div>
                  <div>
                    <h4>Instant Approval</h4>
                    <p>No manual review required</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="next-steps-card">
              <h3>What's Next?</h3>
              <ul className="next-steps-list">
                <li>
                  <strong>Fund Your Account:</strong> Transfer money or set up direct deposit
                </li>
                <li>
                  <strong>Get Your Card:</strong> Your debit card will arrive in 5-7 business days
                </li>
                <li>
                  <strong>Set Up Mobile Banking:</strong> Download our app to manage your account
                </li>
                <li>
                  <strong>Explore Services:</strong> Check out our savings, investments, and loans
                </li>
              </ul>
            </div>

            <div className="data-privacy-notice">
              <h4>🛡️ Your Data, Your Control</h4>
              <p>
                Thanks to Self-Sovereign Identity (SSI), you maintained control of your personal data throughout this process. 
                We verified only what was necessary, and <strong>you can revoke access anytime</strong> through your digital wallet.
              </p>
              <p className="privacy-highlight">
                Unlike traditional banking, we don't store unnecessary personal information. 
                Your credentials remain in your wallet, under your control.
              </p>
            </div>

            <div className="approved-actions">
              <button className="btn btn-primary" onClick={clearAndGoHome}>
                Go to Dashboard
              </button>
              <button className="btn-ghost" onClick={() => navigate('/apply')}>
                Open Another Account
              </button>
            </div>

            <div className="success-badge">
              <span className="badge-icon">✓</span>
              <span>Account Created Successfully - {new Date().toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

