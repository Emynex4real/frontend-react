import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { tasksApi } from '../../services/api';

interface NavItem {
  label: string;
  icon: string;
  path?: string;
  children?: { label: string; path: string }[];
  permission?: string;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'bi-grid-1x2', path: '/' },
  { label: 'Task Manager', icon: 'bi-kanban', path: '/tasks', permission: 'manage_reports' },
  {
    label: 'Branches',
    icon: 'bi-buildings',
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
    ],
  },
  {
    label: 'Report Review',
    icon: 'bi-clipboard2-check',
    children: [
      { label: 'All Submissions', path: '/submissions' },
      { label: 'Pending Review', path: '/submissions?status=pending' },
    ],
    permission: 'approve_reports',
  },
];

const MANAGER_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'bi-grid-1x2', path: '/manager' },
  { label: 'Task Manager', icon: 'bi-kanban', path: '/manager/tasks' },
  {
    label: 'Branch Templates',
    icon: 'bi-file-earmark-text',
    children: [
      { label: 'My Templates',    path: '/manager/templates' },
      { label: 'Create Template', path: '/manager/templates/new' },
    ],
  },
  {
    label: 'Branch Submissions',
    icon: 'bi-clipboard2-check',
    children: [
      { label: 'All Submissions', path: '/manager/submissions' },
      { label: 'Pending Review',  path: '/manager/submissions?status=pending' },
    ],
  },
  {
    label: 'Branch Team',
    icon: 'bi-people',
    children: [
      { label: 'Team Members', path: '/manager/team' },
    ],
  },
  {
    label: 'My Reports',
    icon: 'bi-journal-check',
    children: [
      { label: 'Assigned to Me',  path: '/my-reports' },
      { label: 'My Submissions',  path: '/my-submissions' },
    ],
  },
];

const STAFF_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'bi-grid-1x2', path: '/staff' },
  { label: 'My Tasks', icon: 'bi-list-check', path: '/my-tasks' },
  {
    label: 'My Reports',
    icon: 'bi-journal-check',
    children: [
      { label: 'Assigned Reports', path: '/my-reports' },
      { label: 'My Submissions',   path: '/my-submissions' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
}

export default function Sidebar({ collapsed, mobileOpen, isMobile, onClose }: SidebarProps) {
  const location = useLocation();
  const { can, isAdmin, isManager } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const { data: taskStatsData } = useQuery({
    queryKey: ['task-stats'],
    queryFn: () => tasksApi.getStats(),
    staleTime: 60000,
    enabled: isAdmin(),
  });
  const overdueCount: number = (taskStatsData?.data as { overdue?: number } | undefined)?.overdue ?? 0;

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobile) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => {
      const isCurrentlyOpen = !!prev[label];
      const allClosed: Record<string, boolean> = {};
      Object.keys(prev).forEach((k) => { allClosed[k] = false; });
      return { ...allClosed, [label]: !isCurrentlyOpen };
    });
  };

  const isChildActive = (item: NavItem) =>
    item.children?.some((c) => location.pathname.startsWith(c.path.split('?')[0])) ?? false;

  const rawItems = isAdmin() ? ADMIN_NAV_ITEMS : isManager() ? MANAGER_NAV_ITEMS : STAFF_NAV_ITEMS;
  const visibleItems = rawItems.filter(
    (item: NavItem) => !item.permission || can(item.permission)
  );

  const roleBadge = isAdmin() ? null : isManager()
    ? { label: 'Branch Manager', color: '#0EA5E9' }
    : null;

  // Desktop: width based on collapsed; Mobile: always full-width (280px) drawer
  const sidebarWidth = isMobile ? 280 : collapsed ? 80 : 280;

  // Mobile: translate off-screen when closed
  const translateX = isMobile && !mobileOpen ? '-100%' : '0%';

  return (
    <>
      <style>{`
        .sidebar-vision-light {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          border-right: 1px solid rgba(0, 0, 0, 0.04);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          box-shadow: 1px 0 24px rgba(0, 0, 0, 0.06);
        }

        .vision-nav-item {
          color: #52525B;
          border-radius: 12px;
          margin: 2px 12px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-weight: 500;
          font-size: 14px;
        }

        .vision-nav-item:hover {
          background: rgba(0, 0, 0, 0.03);
          color: #09090B;
        }

        .vision-nav-item.active, .vision-nav-item.active-parent {
          background: #FFFFFF;
          color: #F97316;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.02);
        }

        .submenu-container {
          position: relative;
        }
        .submenu-container::before {
          content: '';
          position: absolute;
          left: 28px;
          top: 0;
          bottom: 12px;
          width: 1px;
          background: rgba(0, 0, 0, 0.06);
          border-radius: 2px;
        }

        .vision-child-item {
          color: #71717A;
          font-size: 13px;
          border-radius: 8px;
          transition: all 0.2s ease;
          position: relative;
        }
        
        .vision-child-item:hover {
          color: #09090B;
          background: rgba(0, 0, 0, 0.02);
        }

        .vision-child-item.active {
          color: #F97316;
          font-weight: 600;
          background: rgba(249, 115, 22, 0.06);
        }

        .sidebar-nav-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-nav-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        
        .brand-logo-box {
          background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2), inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .manager-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .nav-section-label {
          font-size: 10px;
          font-weight: 700;
          color: #A1A1AA;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 8px 24px 4px;
        }

        .sidebar-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(0,0,0,0.04);
          border-radius: 8px;
          color: #71717A;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .sidebar-close-btn:hover {
          background: rgba(0,0,0,0.08);
          color: #09090B;
        }
      `}</style>

      <aside
        className="sidebar-vision-light d-flex flex-column"
        style={{
          width: sidebarWidth,
          minHeight: '100vh',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1040,
          overflowX: 'hidden',
          transform: `translateX(${translateX})`,
        }}
      >
        {/* Brand / Logo */}
        <div
          className="d-flex align-items-center px-3"
          style={{ height: 64, borderBottom: '1px solid rgba(0,0,0,0.03)', flexShrink: 0, gap: 12 }}
        >
          <div
            className="brand-logo-box"
            style={{
              width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <i className="bi bi-layers-half text-white" style={{ fontSize: 16 }} />
          </div>

          {/* Show title when not collapsed (desktop) or on mobile when open */}
          {(isMobile || !collapsed) && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.4px', color: '#09090B', whiteSpace: 'nowrap' }}>
                Digital World
              </div>
              {roleBadge && (
                <div
                  className="manager-badge"
                  style={{ background: `${roleBadge.color}15`, color: roleBadge.color, marginTop: 2 }}
                >
                  <i className="bi bi-person-badge-fill" style={{ fontSize: 9 }} />
                  {roleBadge.label}
                </div>
              )}
            </div>
          )}

          {/* Mobile close button */}
          {isMobile && (
            <button className="sidebar-close-btn ms-auto" onClick={onClose} title="Close menu">
              <i className="bi bi-x-lg" style={{ fontSize: 15 }} />
            </button>
          )}
        </div>

        {/* Navigation Area */}
        <nav
          className="sidebar-nav-scroll flex-grow-1 py-3"
          style={{ overflowY: 'auto', overflowX: 'hidden' }}
        >
          {visibleItems.map((item) => {
            if (item.path) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className={({ isActive }) =>
                    `d-flex align-items-center px-3 py-2 text-decoration-none vision-nav-item ${isActive ? 'active' : ''}`
                  }
                >
                  <i className={`bi ${item.icon}`} style={{ fontSize: 18, flexShrink: 0, opacity: 0.9 }} />
                  {(isMobile || !collapsed) && (
                    <>
                      <span className="ms-3 flex-grow-1" style={{ whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                      {item.path === '/tasks' && overdueCount > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 800, color: '#fff',
                          background: '#EF4444', borderRadius: 20,
                          padding: '1px 6px', marginLeft: 4, flexShrink: 0,
                        }}>
                          {overdueCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            }

            const isOpen = openMenus[item.label] ?? isChildActive(item);
            const parentActive = isChildActive(item);

            return (
              <div key={item.label} className="mb-1">
                <button
                  className={`d-flex align-items-center w-100 px-3 py-2 border-0 text-start vision-nav-item ${parentActive ? 'active-parent' : ''}`}
                  onClick={() => toggleMenu(item.label)}
                  style={{ background: parentActive ? '#FFFFFF' : 'transparent', cursor: 'pointer' }}
                >
                  <i className={`bi ${item.icon}`} style={{ fontSize: 18, flexShrink: 0, opacity: 0.9 }} />
                  {(isMobile || !collapsed) && (
                    <>
                      <span className="ms-3 flex-grow-1" style={{ whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                      <i
                        className="bi bi-chevron-right"
                        style={{
                          fontSize: 10,
                          color: '#A1A1AA',
                          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}
                      />
                    </>
                  )}
                </button>

                {/* Submenu */}
                {(isMobile || !collapsed) && (
                  <div
                    style={{
                      maxHeight: isOpen ? '400px' : '0px',
                      overflow: 'hidden',
                      transition: 'max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div className="submenu-container py-1 mt-1 mb-2" style={{ paddingLeft: 46, paddingRight: 12 }}>
                      {item.children?.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end
                          className={({ isActive }) =>
                            `d-block py-2 px-3 text-decoration-none vision-child-item mb-1 ${isActive ? 'active' : ''}`
                          }
                        >
                          <span style={{ whiteSpace: 'nowrap' }}>{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {(isMobile || !collapsed) && (
          <div
            className="px-4 py-3"
            style={{
              borderTop: '1px solid rgba(0,0,0,0.03)',
              color: '#A1A1AA',
              fontSize: 12,
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Platform</span>
            <span>v2.0</span>
          </div>
        )}
      </aside>
    </>
  );
}