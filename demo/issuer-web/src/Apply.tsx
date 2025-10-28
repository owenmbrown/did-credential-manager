import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api/client'
import './styles.css'

type Address = {
  street?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

export default function Apply() {
  const navigate = useNavigate()
  const [did, setDid] = useState<string>('')

  // Subject DID (holder DID)
  const [subjectId, setSubjectId] = useState('did:peer:holder')

  // Person info (DMV style)
  const [firstName, setFirstName] = useState('Alice')
  const [lastName, setLastName] = useState('Wang')
  const [middleName, setMiddleName] = useState('')
  const [dob, setDob] = useState('1995-01-01') // YYYY-MM-DD
  const [gender, setGender] = useState('F') // M / F / X
  const [eyeColor, setEyeColor] = useState('Brown')
  const [heightCm, setHeightCm] = useState<number | ''>('')
  const [emails, setEmails] = useState('alice@example.com')

  // Address
  const [address, setAddress] = useState<Address>({
    street: '123 Main St',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101',
    country: 'US',
  })

  // Application fields (apply for driver license)
  const [applicationId, setApplicationId] = useState(() => `APP-${new Date().getFullYear()}-${Math.floor(Math.random()*9000+1000)}`)
  const [phone, setPhone] = useState('206-555-0101')
  const [ssnLast4, setSsnLast4] = useState('1234')
  const [isOrganDonor, setIsOrganDonor] = useState(false)
  const [residencyYears, setResidencyYears] = useState<number | ''>('')
  const [hasVisionTest, setHasVisionTest] = useState(false)

  // Results
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [offerRes, setOfferRes] = useState<{ invitationUrl: string; qrCode: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.did().then((d) => setDid(d.did)).catch(() => {})
  }, [])

  const fullName = useMemo(() => [firstName, middleName, lastName].filter(Boolean).join(' '), [firstName, middleName, lastName])

  const computedAge = useMemo(() => {
    if (!dob) return undefined
    try {
      const birth = new Date(dob)
      const now = new Date()
      let age = now.getFullYear() - birth.getFullYear()
      const m = now.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
      return age
    } catch {
      return undefined
    }
  }, [dob])

  function buildClaims() {
    const addr: Address = { ...address }
    const claims: any = {
      name: fullName,
      firstName,
      middleName: middleName || undefined,
      lastName,
      dateOfBirth: dob || undefined,
      gender: gender || undefined,
      eyeColor: eyeColor || undefined,
      heightCm: typeof heightCm === 'string' ? undefined : heightCm,
      age: computedAge,
      emails: emails ? emails.split(',').map((e) => e.trim()).filter(Boolean) : undefined,
      address: addr,
      application: {
        applicationId,
        phone: phone || undefined,
        ssnLast4: ssnLast4 || undefined,
        isOrganDonor,
        residencyYears: typeof residencyYears === 'string' ? undefined : residencyYears,
        hasVisionTest,
        submittedAt: new Date().toISOString(),
      },
    }
    return claims
  }

  async function submitApplicationVc() {
    setError(null)
    setResult(null)
    try {
      const res = await api.issue({
        credentialSubject: {
          id: subjectId,
          ...buildClaims(),
        },
        type: ['DriversLicenseApplication'],
      })
      setResult(res)
      // Navigate to success page after successful submission
      setTimeout(() => {
        navigate('/success')
      }, 1500)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function createOobOffer() {
    setError(null)
    setOfferRes(null)
    setCopied(false)
    try {
      const resp = await api.createCredentialOfferInvitation({
        credentialType: 'DriversLicenseApplication',
        credentialData: buildClaims(),
        ttl: 3600,
      })
      setOfferRes({ invitationUrl: resp.invitationUrl, qrCode: resp.qrCode })
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function copyInvitationUrl() {
    if (!offerRes) return
    try {
      await navigator.clipboard.writeText(offerRes.invitationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy:', e)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Driver's License Application</h1>
        <div className="did">System DID: {did || '...'}</div>
        <button className="btn-ghost back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>

      <div className="card">
        <h3>Holder DID</h3>
        <div className="row">
          <input value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="holder DID (subject id)" style={{ minWidth: 360 }} />
        </div>
      </div>

      <div className="card">
        <h3>Personal Information</h3>
        <div className="grid">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
          <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Middle name (optional)" />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
          <input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="Date of birth" type="date" />
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="M">Gender: M</option>
            <option value="F">Gender: F</option>
            <option value="X">Gender: X</option>
          </select>
          <input value={eyeColor} onChange={(e) => setEyeColor(e.target.value)} placeholder="Eye color" />
          <input value={heightCm} onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Height (cm)" type="number" min={0} />
          <input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="Emails (comma separated)" />
        </div>
        <div className="muted footer-hint">Age is auto-computed from DOB for convenience.</div>
      </div>

      <div className="card">
        <h3>Address</h3>
        <div className="grid">
          <input value={address.street || ''} onChange={(e) => setAddress({ ...address, street: e.target.value })} placeholder="Street" />
          <input value={address.city || ''} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" />
          <input value={address.state || ''} onChange={(e) => setAddress({ ...address, state: e.target.value })} placeholder="State/Province" />
          <input value={address.postalCode || ''} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} placeholder="Postal code" />
          <input value={address.country || ''} onChange={(e) => setAddress({ ...address, country: e.target.value })} placeholder="Country" />
        </div>
      </div>

      <div className="card">
        <h3>Application Details</h3>
        <div className="grid">
          <input value={applicationId} onChange={(e) => setApplicationId(e.target.value)} placeholder="Application ID" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
          <input value={ssnLast4} onChange={(e) => setSsnLast4(e.target.value)} placeholder="SSN last 4" />
          <input value={residencyYears} onChange={(e) => setResidencyYears(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Residency years" type="number" min={0} />
          <label className="row" style={{ alignItems: 'center' }}>
            <input type="checkbox" checked={isOrganDonor} onChange={(e) => setIsOrganDonor(e.target.checked)} />
            <span className="muted" style={{ marginLeft: 8 }}>Organ donor</span>
          </label>
          <label className="row" style={{ alignItems: 'center' }}>
            <input type="checkbox" checked={hasVisionTest} onChange={(e) => setHasVisionTest(e.target.checked)} />
            <span className="muted" style={{ marginLeft: 8 }}>Vision test passed</span>
          </label>
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" onClick={submitApplicationVc}>Submit Application VC</button>
        <button className="btn secondary" onClick={createOobOffer}>Create OOB Application Invite</button>
      </div>

      {error && <div className="muted danger" style={{ marginTop: 8 }}>{error}</div>}

      {result && (
        <div className="card">
          <h3>Issued VC Response</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {offerRes && (
        <div className="card">
          <h3>OOB Invitation</h3>
          <p className="muted">Scan the QR code with the wallet app, or copy the invitation URL to paste manually.</p>
          
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <button className="btn" onClick={copyInvitationUrl} style={{ minWidth: 180 }}>
              {copied ? '✓ Copied!' : 'Copy Invitation URL'}
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            <img className="qr" src={offerRes.qrCode} alt="Invitation QR" width={250} height={250} />
          </div>

          <div className="muted footer-hint" style={{ marginTop: 12 }}>
            Browser preview (testing): {
              (() => {
                try {
                  const u = new URL(offerRes.invitationUrl)
                  u.pathname = u.pathname.replace(/\/didcomm$/, '/invitations/accept')
                  return <a href={u.toString()} target="_blank" rel="noreferrer">View in Browser</a>
                } catch { return null }
              })()
            }
          </div>
        </div>
      )}
    </div>
  )
}
