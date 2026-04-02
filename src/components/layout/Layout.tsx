import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'

export default function Layout() {
  const { user, loading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border" style={{ color: '#f7941d' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6f9' }}>
      <Sidebar collapsed={collapsed} />

      <div
        style={{
          marginLeft: collapsed ? 72 : 260,
          flex: 1,
          transition: 'margin-left 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Navbar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

        <main style={{ marginTop: 64, padding: '28px 32px', flex: 1 }}>
          <Outlet />
        </main>

        <footer
          className="text-center py-3"
          style={{ fontSize: 12, color: '#adb5bd', borderTop: '1px solid #e9ecef' }}
        >
          © {new Date().getFullYear()} Digital World Admin Reporting System
        </footer>
      </div>
    </div>
  )
}
