import { NavLink } from 'react-router-dom'
import type { CSSProperties } from 'react'

const linkStyle: CSSProperties = { marginRight: 12 }

export default function Nav() {
  return (
    <nav style={{ marginBottom: 16 }}>
      <NavLink to="/issuer" style={linkStyle}>Issuer</NavLink>
      <NavLink to="/holder" style={linkStyle}>Holder</NavLink>
      <NavLink to="/verifier" style={linkStyle}>Verifier</NavLink>
    </nav>
  )
}
