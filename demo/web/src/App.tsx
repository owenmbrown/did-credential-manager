import { Outlet } from 'react-router-dom'
import Nav from './components/Nav'

export default function App() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif', padding: 16 }}>
      <h1>DID Credential Demo</h1>
      <Nav />
      <Outlet />
    </div>
  )
}
