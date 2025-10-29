import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './styles.css'

export default function Apply() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    accountType: 'checking',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    ssn: '',
    address: '',
    city: '',
    state: '',
    zip: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Store application data in sessionStorage
    sessionStorage.setItem('bankApplication', JSON.stringify(formData))
    // Navigate to identity verification
    navigate('/verify')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="bank-container">
      <div className="apply-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← Back
        </button>
        <div>
          <h1>Account Application</h1>
          <p>Step 1 of 2: Basic Information</p>
        </div>
      </div>

      <div className="apply-content">
        <div className="apply-form-container">
          <form onSubmit={handleSubmit} className="apply-form">
            <div className="form-section">
              <h2>Account Selection</h2>
              <div className="form-group">
                <label>Account Type</label>
                <select 
                  name="accountType" 
                  value={formData.accountType} 
                  onChange={handleChange}
                  required
                >
                  <option value="checking">Checking Account</option>
                  <option value="savings">Savings Account (3.5% APY)</option>
                  <option value="investment">Investment Account</option>
                </select>
              </div>
            </div>

            <div className="form-section">
              <h2>Personal Information</h2>
              <p className="section-note">
                ℹ️ <strong>Note:</strong> This information will be cross-verified with your digital credentials
              </p>
              
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.doe@email.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Social Security Number *</label>
                <input
                  type="password"
                  name="ssn"
                  value={formData.ssn}
                  onChange={handleChange}
                  placeholder="XXX-XX-XXXX"
                  maxLength={11}
                  required
                />
                <small>🔒 Encrypted and secure</small>
              </div>
            </div>

            <div className="form-section">
              <h2>Address</h2>
              <div className="form-group">
                <label>Street Address *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main Street"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="San Francisco"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="CA"
                    maxLength={2}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>ZIP Code *</label>
                  <input
                    type="text"
                    name="zip"
                    value={formData.zip}
                    onChange={handleChange}
                    placeholder="94102"
                    maxLength={5}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="privacy-notice">
              <h3>🔐 Privacy Protection</h3>
              <p>
                With decentralized identity, <strong>you control your data</strong>. 
                We'll verify your credentials without storing unnecessary personal information.
                Only what's required for regulatory compliance will be retained.
              </p>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Continue to Identity Verification →
              </button>
            </div>
          </form>
        </div>

        <div className="apply-sidebar">
          <div className="info-card">
            <h3>Next Step</h3>
            <p>After submitting this form, you'll verify your identity using your digital wallet.</p>
            <div className="next-step-preview">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <strong>Scan QR Code</strong>
                  <p>Use your wallet app to scan</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <strong>Share Credentials</strong>
                  <p>Approve credential sharing</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <strong>Account Created</strong>
                  <p>Instant verification & approval</p>
                </div>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h3>Why Digital Identity?</h3>
            <ul className="benefits-list">
              <li>✅ No photocopies needed</li>
              <li>✅ Instant verification</li>
              <li>✅ Your data stays private</li>
              <li>✅ Reusable for future applications</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

