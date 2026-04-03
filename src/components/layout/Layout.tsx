import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'

export default function Layout() {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)   // mobile drawer
  const [collapsed, setCollapsed] = useState(false)        // desktop collapse
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(false) // close drawer when going desktop
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close mobile drawer when route changes
  const handleOverlayClick = () => setSidebarOpen(false)

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

  const desktopSidebarWidth = collapsed ? 80 : 280

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6f9' }}>
      {/* ── Mobile overlay backdrop ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={handleOverlayClick}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 1039,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main content area ── */}
      <div
        style={{
          marginLeft: isMobile ? 0 : desktopSidebarWidth,
          flex: 1,
          transition: 'margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0,
        }}
      >
        <Navbar
          collapsed={collapsed}
          isMobile={isMobile}
          onToggle={() => isMobile ? setSidebarOpen(o => !o) : setCollapsed(c => !c)}
        />

        <main
          style={{
            marginTop: 64,
            padding: isMobile ? '16px 12px' : '28px 32px',
            flex: 1,
          }}
        >
          <Outlet context={{ closeSidebar: () => setSidebarOpen(false) }} />
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
