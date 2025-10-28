import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './Home'
import Apply from './Apply'
import Success from './Success'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/success" element={<Success />} />
      </Routes>
    </BrowserRouter>
  )
}
