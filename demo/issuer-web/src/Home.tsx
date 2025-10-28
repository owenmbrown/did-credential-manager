import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api/client'
import './styles.css'

export default function Home() {
  const navigate = useNavigate()
  const [did, setDid] = useState<string>('')
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    api.did().then((d) => setDid(d.did)).catch(() => {})
    api.health().then(setHealth).catch(() => {})
  }, [])

  return (
    <div className="container">
      <div className="header">
        <h1 className="dmv-title">Department of Motor Vehicles</h1>
        <div className="dmv-subtitle">Official Driver's License Issuing Authority</div>
        <div className="did">System DID: {did || '...'}</div>
      </div>

      <div className="dmv-hero">
        <div className="hero-content">
          <h2>Welcome to DMV</h2>
          <p className="hero-description">
            Apply for your driver's license online through our secure credential management system.
            Your identity and personal information are protected using blockchain technology.
          </p>
          
          <div className="dmv-features">
            <div className="feature-item">
              <div className="feature-icon">🔐</div>
              <h3>Secure Identity</h3>
              <p>Blockchain-based identity verification</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📄</div>
              <h3>Digital Credentials</h3>
              <p>Verifiable credentials for your license</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <h3>Fast Processing</h3>
              <p>Quick application and approval process</p>
            </div>
          </div>

          <div className="cta-buttons">
            <button className="btn btn-primary" onClick={() => navigate('/apply')}>
              Start New Application
            </button>
            <button className="btn btn-secondary" onClick={() => alert('Service coming soon!')}>
              Check Application Status
            </button>
          </div>
        </div>
      </div>

      <div className="dmv-info-grid">
        <div className="info-card">
          <h3>Required Documents</h3>
          <ul className="requirements-list">
            <li>✓ Proof of identity</li>
            <li>✓ Proof of residency</li>
            <li>✓ Vision test results</li>
            <li>✓ Social Security Number</li>
          </ul>
        </div>

        <div className="info-card">
          <h3>Important Information</h3>
          <ul className="info-list">
            <li><strong>Processing Time:</strong> 3-5 business days</li>
            <li><strong>Validity Period:</strong> 5 years</li>
            <li><strong>Renewal:</strong> Required before expiration</li>
            <li><strong>Privacy:</strong> Your data is encrypted and secure</li>
          </ul>
        </div>

        <div className="info-card">
          <h3>Need Help?</h3>
          <p className="help-text">
            Contact our support team or visit a local DMV office.
          </p>
          <button className="btn-ghost">Contact Support</button>
        </div>
      </div>

      {health && (
        <div className="system-status">
          <h3>System Status</h3>
          <div className="status-indicator">
            <span className="status-dot active"></span>
            <span>All systems operational</span>
          </div>
        </div>
      )}
    </div>
  )
}
