import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './styles.css'

export default function Success() {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(true)
  const [verified, setVerified] = useState(false)

  // Simulate deletion process
  useEffect(() => {
    const timer = setTimeout(() => {
      setDeleting(false)
      setVerified(true)
    }, 2000) // 2 seconds to simulate deletion

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="container">
      <div className="success-container">
        <div className="success-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="40" fill="#10b981" opacity="0.15"/>
            <circle cx="40" cy="40" r="32" fill="#10b981" opacity="0.25"/>
            <path d="M25 40L35 50L55 30" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <h1 className="success-title">Credential Issued Successfully</h1>
        <p className="success-subtitle">Your driver's license application credential has been successfully issued</p>

        {deleting ? (
          <div className="deletion-status">
            <div className="spinner"></div>
            <p>Deleting personal data...</p>
            <span className="status-text">Removing all application information from DMV system</span>
          </div>
        ) : (
          <div className="deletion-complete">
            <div className="checkmark-animation">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="24" fill="#10b981"/>
                <path d="M14 24L21 31L34 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>✓ Data Deletion Complete</h3>
            <p className="deletion-message">
              Your personal data has been securely deleted from the DMV system
            </p>
            <p className="deletion-details">
              According to privacy protection policy, all application information has been permanently removed. Only your verifiable credential remains on the chain.
            </p>
          </div>
        )}

        <div className="success-info">
          <div className="info-item">
            <div className="info-icon">🔐</div>
            <div>
              <h4>Data Security</h4>
              <p>All personal information is encrypted and deleted immediately after issuance</p>
            </div>
          </div>
          <div className="info-item">
            <div className="info-icon">✅</div>
            <div>
              <h4>Valid Credential</h4>
              <p>Your verifiable credential has been successfully created and ready to use</p>
            </div>
          </div>
          <div className="info-item">
            <div className="info-icon">🔑</div>
            <div>
              <h4>Self-Sovereign Control</h4>
              <p>You have full control over your credential. DMV has no access to your personal data</p>
            </div>
          </div>
        </div>

        <div className="success-actions">
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Return to Home
          </button>
          <button className="btn-ghost" onClick={() => navigate('/apply')}>
            Submit New Application
          </button>
        </div>

        {verified && (
          <div className="verification-badge">
            <span className="badge-icon">✓</span>
            <span>Data deleted successfully - Verified</span>
          </div>
        )}
      </div>
    </div>
  )
}
