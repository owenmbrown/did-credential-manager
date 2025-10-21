import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Issuer from './pages/Issuer'
import Holder from './pages/Holder'
import Verifier from './pages/Verifier'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Issuer /> },
      { path: 'issuer', element: <Issuer /> },
      { path: 'holder', element: <Holder /> },
      { path: 'verifier', element: <Verifier /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
