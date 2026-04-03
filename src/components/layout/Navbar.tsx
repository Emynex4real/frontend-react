import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  collapsed: boolean;
  isMobile: boolean;
  onToggle: () => void;
}

export default function Navbar({ collapsed, isMobile, onToggle }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials =
    user?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? 'U';

  // On mobile, navbar always goes from left:0. On desktop it offsets by sidebar width.
  const desktopLeft = collapsed ? 80 : 280;

  return (
    <>
      <style>{`
        .navbar-vision-light {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(32px) saturate(180%);
          -webkit-backdrop-filter: blur(32px) saturate(180%);
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
        }
        
        /* Spotlight Search */
        .spotlight-search {
          background: rgba(0, 0, 0, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.02);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .spotlight-search:focus-within {
          background: #FFFFFF;
          border-color: rgba(249, 115, 22, 0.3);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1), 0 4px 12px rgba(0, 0, 0, 0.03);
        }
        .spotlight-input {
          background: transparent;
          border: none;
          box-shadow: none !important;
          font-size: 14px;
          color: #09090B;
          min-width: 0;
        }
        .spotlight-input::placeholder {
          color: #A1A1AA;
        }
        
        /* Nav Icons */
        .vision-icon-btn {
          color: #71717A;
          transition: all 0.2s ease;
          border-radius: 10px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vision-icon-btn:hover {
          background: rgba(0, 0, 0, 0.04);
          color: #09090B;
        }

        /* Premium Dropdown */
        .vision-dropdown-menu {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 16px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0,0,0,0.03);
          padding: 8px;
        }
        .vision-dropdown-item {
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #3F3F46;
          padding: 10px 14px;
          transition: all 0.15s ease;
        }
        .vision-dropdown-item:hover {
          background: rgba(0, 0, 0, 0.04);
          color: #09090B;
        }
        .vision-dropdown-item.danger {
          color: #EF4444;
        }
        .vision-dropdown-item.danger:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #DC2626;
        }

        /* Mobile navbar search: hide placeholder text on very small screens */
        @media (max-width: 480px) {
          .spotlight-input::placeholder {
            font-size: 12px;
          }
        }
      `}</style>

      <header
        className="navbar-vision-light d-flex align-items-center"
        style={{
          height: 64,
          position: 'fixed',
          top: 0,
          left: isMobile ? 0 : desktopLeft,
          right: 0,
          zIndex: 1030,
          transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          padding: '0 20px',
          gap: 12,
        }}
      >
        {/* Hamburger / Toggle Button */}
        <button
          className="btn vision-icon-btn p-0"
          onClick={onToggle}
          style={{ border: 'none', flexShrink: 0 }}
          title={isMobile ? 'Open menu' : 'Toggle sidebar'}
        >
          <i className={`bi ${isMobile ? 'bi-list' : 'bi-layout-sidebar'}`} style={{ fontSize: isMobile ? 22 : 20 }} />
        </button>

        {/* Global Search */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="spotlight-search d-flex align-items-center px-3 py-1">
            <i className="bi bi-search" style={{ color: '#A1A1AA', fontSize: 14, flexShrink: 0 }} />
            <input
              type="search"
              className="form-control spotlight-input ms-2"
              placeholder={isMobile ? 'Search...' : 'Search workspaces, reports, or users...'}
            />
            <div 
              className="d-none d-md-flex align-items-center justify-content-center ms-2"
              style={{ 
                background: '#FFFFFF', 
                border: '1px solid rgba(0,0,0,0.06)', 
                borderRadius: 6, 
                padding: '2px 6px', 
                fontSize: 11, 
                color: '#71717A', 
                fontWeight: 600,
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                flexShrink: 0,
              }}
            >
              ⌘K
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2" style={{ flexShrink: 0 }}>
          {/* Notifications */}
          <button
            className="btn vision-icon-btn position-relative p-0"
            style={{ border: 'none' }}
          >
            <i className="bi bi-bell" style={{ fontSize: 18 }} />
            <span
              className="position-absolute"
              style={{ 
                top: 8, 
                right: 8, 
                width: 8, 
                height: 8, 
                background: '#F97316', 
                borderRadius: '50%',
                border: '2px solid #FFF'
              }}
            />
          </button>

          <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.06)', margin: '0 4px' }} />

          {/* User Profile Dropdown */}
          <div className="dropdown">
            <button
              className="btn d-flex align-items-center gap-2 p-1"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{ border: 'none', background: 'transparent', borderRadius: 100 }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  boxShadow: '0 2px 8px rgba(249, 115, 22, 0.25)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div className="text-start d-none d-lg-block" style={{ marginTop: '-2px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#09090B', lineHeight: 1.2, letterSpacing: '-0.2px' }}>
                  {user?.full_name ?? 'Guest User'}
                </div>
                <div style={{ fontSize: 12, color: '#71717A', fontWeight: 500 }}>
                  {user?.role_name ?? 'Administrator'}
                </div>
              </div>
              <i className="bi bi-chevron-down d-none d-lg-block" style={{ fontSize: 11, color: '#A1A1AA' }} />
            </button>

            <ul className="dropdown-menu dropdown-menu-end vision-dropdown-menu" style={{ minWidth: 240, marginTop: '12px' }}>
              <li className="px-3 py-2 mb-2">
                <span className="d-block" style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Signed in as
                </span>
                <span className="d-block text-truncate mt-1" style={{ fontSize: 14, color: '#09090B', fontWeight: 500 }}>
                  {user?.username ?? 'user@digitalworld.com'}
                </span>
              </li>
              <li><hr className="dropdown-divider mx-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }} /></li>
              <li>
                <button className="dropdown-item vision-dropdown-item d-flex align-items-center gap-3" onClick={() => navigate('/profile')}>
                  <i className="bi bi-person" style={{ fontSize: 16, opacity: 0.8 }} /> My Profile
                </button>
              </li>
              <li>
                <button className="dropdown-item vision-dropdown-item d-flex align-items-center gap-3" onClick={() => navigate('/settings')}>
                  <i className="bi bi-gear" style={{ fontSize: 16, opacity: 0.8 }} /> Preferences
                </button>
              </li>
              <li><hr className="dropdown-divider mx-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }} /></li>
              <li>
                <button
                  className="dropdown-item vision-dropdown-item danger d-flex align-items-center gap-3"
                  onClick={handleLogout}
                >
                  <i className="bi bi-box-arrow-right" style={{ fontSize: 16 }} /> Sign out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>
    </>
  );
}