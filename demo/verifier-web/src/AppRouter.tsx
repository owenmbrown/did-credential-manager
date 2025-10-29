import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './Home'
import Apply from './Apply'
import VerifyIdentity from './VerifyIdentity'
import Approved from './Approved'
import AdminDashboard from './AdminDashboard'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/verify" element={<VerifyIdentity />} />
        <Route path="/approved" element={<Approved />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

