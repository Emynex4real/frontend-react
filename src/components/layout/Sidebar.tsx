import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface NavItem {
  label: string
  icon: string
  path?: string
  children?: { label: string; path: string }[]
  permission?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'bi-speedometer2', path: '/' },
  {
    label: 'Branches',
    icon: 'bi-building',
    children: [
      { label: 'All Branches', path: '/branches' },
      { label: 'Add Branch', path: '/branches/new' },
    ],
    permission: 'manage_branches',
  },
  {
    label: 'Departments',
    icon: 'bi-diagram-3',
    children: [
      { label: 'All Departments', path: '/departments' },
      { label: 'Add Department', path: '/departments/new' },
    ],
    permission: 'manage_departments',
  },
  {
    label: 'Users',
    icon: 'bi-people',
    children: [
      { label: 'All Users', path: '/users' },
      { label: 'Add User', path: '/users/new' },
    ],
    permission: 'manage_users',
  },
  {
    label: 'Roles',
    icon: 'bi-shield-check',
    children: [
      { label: 'All Roles', path: '/roles' },
      { label: 'Add Role', path: '/roles/new' },
    ],
    permission: 'manage_roles',
  },
  {
    label: 'Report Templates',
    icon: 'bi-file-earmark-text',
    children: [
      { label: 'All Templates', path: '/reports' },
      { label: 'Create Template', path: '/reports/new' },
      { label: 'Form Builder', path: '/reports/builder' },
    ],
    permission: 'manage_reports',
  },
  {
    label: 'My Reports',
    icon: 'bi-journal-check',
    children: [
      { label: 'Submit Report', path: '/entries/new' },
      { label: 'My Submissions', path: '/entries' },
      { label: 'Summary', path: '/entries/summary' },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation()
  const { can } = useAuth()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const isChildActive = (item: NavItem) =>
    item.children?.some(c => location.pathname.startsWith(c.path)) ?? false

  const visibleItems = NAV_ITEMS.filter(
    item => !item.permission || can(item.permission)
  )

  return (
    <aside
      className="sidebar d-flex flex-column"
      style={{
        width: collapsed ? 72 : 260,
        minHeight: '100vh',
        background: '#1a1d23',
        transition: 'width 0.25s ease',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1040,
        overflowX: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        className="d-flex align-items-center px-3 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: 64 }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: '#f7941d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <i className="bi bi-layers-fill text-white" style={{ fontSize: 18 }} />
        </div>
        {!collapsed && (
          <span className="ms-2 fw-bold text-white" style={{ fontSize: 15, whiteSpace: 'nowrap' }}>
            Digital World
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-grow-1 py-2" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
        {visibleItems.map(item => {
          if (item.path) {
            // Simple link
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) =>
                  `d-flex align-items-center px-3 py-2 text-decoration-none nav-item-link ${isActive ? 'active' : ''}`
                }
                style={({ isActive }) => ({
                  color: isActive ? '#f7941d' : 'rgba(255,255,255,0.7)',
                  background: isActive ? 'rgba(247,148,29,0.12)' : 'transparent',
                  borderRadius: 8,
                  margin: '2px 8px',
                  transition: 'all 0.15s',
                })}
              >
                <i className={`bi ${item.icon}`} style={{ fontSize: 18, flexShrink: 0 }} />
                {!collapsed && <span className="ms-2" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{item.label}</span>}
              </NavLink>
            )
          }

          // Collapsible group
          const isOpen = openMenus[item.label] ?? isChildActive(item)
          return (
            <div key={item.label}>
              <button
                className="d-flex align-items-center w-100 px-3 py-2 border-0 text-start"
                onClick={() => toggleMenu(item.label)}
                style={{
                  background: 'transparent',
                  color: isChildActive(item) ? '#f7941d' : 'rgba(255,255,255,0.7)',
                  borderRadius: 8,
                  margin: '2px 8px',
                  width: 'calc(100% - 16px)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <i className={`bi ${item.icon}`} style={{ fontSize: 18, flexShrink: 0 }} />
                {!collapsed && (
                  <>
                    <span className="ms-2 flex-grow-1" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{item.label}</span>
                    <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: 11 }} />
                  </>
                )}
              </button>

              {!collapsed && isOpen && (
                <div className="ps-4">
                  {item.children?.map(child => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) =>
                        `d-flex align-items-center px-3 py-2 text-decoration-none ${isActive ? 'active' : ''}`
                      }
                      style={({ isActive }) => ({
                        color: isActive ? '#f7941d' : 'rgba(255,255,255,0.55)',
                        background: isActive ? 'rgba(247,148,29,0.1)' : 'transparent',
                        borderRadius: 6,
                        margin: '1px 8px',
                        fontSize: 13,
                        transition: 'all 0.15s',
                      })}
                    >
                      <i className="bi bi-dot" style={{ fontSize: 18 }} />
                      <span style={{ whiteSpace: 'nowrap' }}>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div
          className="px-3 py-3 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}
        >
          Digital World Admin v1.0
        </div>
      )}
    </aside>
  )
}
