import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface NavbarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Navbar({ collapsed, onToggle }: NavbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = user?.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  return (
    <header
      className="d-flex align-items-center px-4"
      style={{
        height: 64,
        background: '#fff',
        borderBottom: '1px solid #e9ecef',
        position: 'fixed',
        top: 0,
        left: collapsed ? 72 : 260,
        right: 0,
        zIndex: 1030,
        transition: 'left 0.25s ease',
        gap: 12,
      }}
    >
      {/* Toggle */}
      <button
        className="btn btn-sm"
        onClick={onToggle}
        style={{ border: 'none', background: 'transparent', padding: '6px 8px', borderRadius: 6 }}
        title="Toggle sidebar"
      >
        <i className="bi bi-list" style={{ fontSize: 22, color: '#495057' }} />
      </button>

      {/* Search */}
      <div className="flex-grow-1" style={{ maxWidth: 400 }}>
        <div className="input-group input-group-sm">
          <span className="input-group-text bg-light border-end-0">
            <i className="bi bi-search text-muted" />
          </span>
          <input
            type="search"
            className="form-control bg-light border-start-0"
            placeholder="Search..."
            style={{ boxShadow: 'none' }}
          />
        </div>
      </div>

      <div className="ms-auto d-flex align-items-center gap-3">
        {/* Notifications */}
        <button
          className="btn btn-sm position-relative"
          style={{ border: 'none', background: 'transparent', padding: '6px 8px' }}
        >
          <i className="bi bi-bell" style={{ fontSize: 20, color: '#495057' }} />
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill"
            style={{ background: '#f7941d', fontSize: 10 }}
          >
            3
          </span>
        </button>

        {/* User dropdown */}
        <div className="dropdown">
          <button
            className="btn d-flex align-items-center gap-2 p-1 rounded-3"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            style={{ border: 'none', background: 'transparent' }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#f7941d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {initials}
            </div>
            <div className="text-start d-none d-md-block">
              <div style={{ fontSize: 13, fontWeight: 600, color: '#212529', lineHeight: 1.2 }}>
                {user?.full_name ?? 'User'}
              </div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>{user?.role_name ?? ''}</div>
            </div>
            <i className="bi bi-chevron-down text-muted" style={{ fontSize: 11 }} />
          </button>

          <ul className="dropdown-menu dropdown-menu-end shadow-sm" style={{ minWidth: 190 }}>
            <li>
              <span className="dropdown-item-text text-muted" style={{ fontSize: 12 }}>
                Signed in as <strong>{user?.username}</strong>
              </span>
            </li>
            <li><hr className="dropdown-divider my-1" /></li>
            <li>
              <button className="dropdown-item d-flex align-items-center gap-2" onClick={() => navigate('/profile')}>
                <i className="bi bi-person" /> Profile
              </button>
            </li>
            <li>
              <button className="dropdown-item d-flex align-items-center gap-2" onClick={() => navigate('/settings')}>
                <i className="bi bi-gear" /> Settings
              </button>
            </li>
            <li><hr className="dropdown-divider my-1" /></li>
            <li>
              <button
                className="dropdown-item d-flex align-items-center gap-2 text-danger"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right" /> Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}
