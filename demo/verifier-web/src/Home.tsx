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
    <div className="bank-container">
      {/* Header */}
      <div className="bank-header">
        <h1>🏦 SecureBank</h1>
        <p>Trusted Financial Services Since 2025</p>
      </div>

      {/* Hero Section */}
      <div className="bank-hero">
        <div className="hero-content">
          <h2>Open Your Account in Minutes</h2>
          <p className="hero-description">
            Experience the future of banking with decentralized identity verification.
            No more paperwork - just scan and verify your credentials instantly.
          </p>
          
          <div className="bank-features">
            <div className="feature-item">
              <div className="feature-icon">🔐</div>
              <h3>Privacy-First</h3>
              <p>Your data stays with you. We only verify what we need.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <h3>Instant Verification</h3>
              <p>Open an account in under 2 minutes with SSI</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✅</div>
              <h3>Trusted</h3>
              <p>Blockchain-verified credentials you control</p>
            </div>
          </div>

          <div className="cta-buttons">
            <button className="btn btn-primary" onClick={() => navigate('/apply')}>
              Open New Account
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin')}>
              Admin Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Account Types */}
      <div className="account-types">
        <h2>Choose Your Account</h2>
        <div className="account-grid">
          <div className="account-card">
            <h3>💳 Checking Account</h3>
            <ul>
              <li>No monthly fees</li>
              <li>Free debit card</li>
              <li>Mobile banking</li>
              <li>Direct deposit</li>
            </ul>
            <button className="btn-ghost" onClick={() => navigate('/apply')}>
              Learn More
            </button>
          </div>

          <div className="account-card featured">
            <div className="featured-badge">Most Popular</div>
            <h3>💰 Savings Account</h3>
            <ul>
              <li>3.5% APY</li>
              <li>No minimum balance</li>
              <li>Unlimited transfers</li>
              <li>FDIC insured</li>
            </ul>
            <button className="btn btn-primary" onClick={() => navigate('/apply')}>
              Open Account
            </button>
          </div>

          <div className="account-card">
            <h3>📈 Investment Account</h3>
            <ul>
              <li>Commission-free trades</li>
              <li>Stocks & ETFs</li>
              <li>Portfolio tools</li>
              <li>Expert guidance</li>
            </ul>
            <button className="btn-ghost" onClick={() => navigate('/apply')}>
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="requirements-section">
        <h2>What You'll Need</h2>
        <div className="requirements-grid">
          <div className="requirement-item">
            <div className="requirement-icon">🪪</div>
            <h3>Government ID</h3>
            <p>A valid driver's license or state ID credential</p>
          </div>
          <div className="requirement-item">
            <div className="requirement-icon">📱</div>
            <h3>Digital Wallet</h3>
            <p>A compatible wallet app with your credentials</p>
          </div>
          <div className="requirement-item">
            <div className="requirement-icon">⏱️</div>
            <h3>2 Minutes</h3>
            <p>That's all it takes to verify and open your account</p>
          </div>
        </div>
      </div>

      {/* System Status */}
      {health && (
        <div className="system-status">
          <div className="status-indicator">
            <span className="status-dot active"></span>
            <span>System Online | DID: {did.slice(0, 20)}...</span>
          </div>
        </div>
      )}
    </div>
  )
}

