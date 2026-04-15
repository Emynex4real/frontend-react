import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { notificationsApi } from '../../services/api'
import type { Notification, NotificationType } from '../../types'

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  task_assigned:    { icon: 'bi-person-check-fill',   color: '#3B82F6', bg: '#EFF6FF' },
  task_updated:     { icon: 'bi-arrow-repeat',         color: '#F97316', bg: '#FFF7ED' },
  task_comment:     { icon: 'bi-chat-fill',            color: '#8B5CF6', bg: '#F5F3FF' },
  task_overdue:     { icon: 'bi-exclamation-triangle-fill', color: '#DC2626', bg: '#FEF2F2' },
  report_submitted: { icon: 'bi-file-earmark-check-fill',  color: '#10B981', bg: '#ECFDF5' },
  report_approved:  { icon: 'bi-check-circle-fill',   color: '#10B981', bg: '#ECFDF5' },
  report_rejected:  { icon: 'bi-x-circle-fill',       color: '#EF4444', bg: '#FEF2F2' },
}

export default function NotificationDropdown() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: notifsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(),
    refetchInterval: 30000, // poll every 30s
    staleTime: 10000,
  })

  const notifications: Notification[] = notifsData?.data ?? []
  const unreadCount = notifications.filter(n => !n.read).length

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) markReadMutation.mutate(n.id)
    setOpen(false)
    if (n.reference_type === 'task' && n.reference_id) navigate('/tasks')
    else if (n.reference_type === 'submission' && n.reference_id) navigate(`/submissions/${n.reference_id}`)
  }

  return (
    <>
      <style>{`
        .notif-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 380px;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06);
          z-index: 2000;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          overflow: hidden;
          animation: notif-drop 0.2s cubic-bezier(0.16,1,0.3,1);
          transform-origin: top right;
        }
        @keyframes notif-drop {
          from { opacity: 0; transform: scale(0.95) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .notif-item:last-child { border-bottom: none; }
        .notif-item:hover { background: rgba(0,0,0,0.02); }
        .notif-item.unread { background: rgba(249,115,22,0.03); }
        .notif-item.unread:hover { background: rgba(249,115,22,0.06); }
        .notif-list {
          max-height: 380px;
          overflow-y: auto;
        }
        .notif-list::-webkit-scrollbar { width: 3px; }
        .notif-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        @media (max-width: 420px) {
          .notif-dropdown { width: calc(100vw - 16px); right: -8px; }
        }
      `}</style>

      <div style={{ position: 'relative' }} ref={dropdownRef}>
        {/* Bell Button */}
        <button
          onClick={() => setOpen(o => !o)}
          className="btn vision-icon-btn position-relative p-0"
          style={{ border: 'none', background: open ? 'rgba(249,115,22,0.08)' : 'transparent', color: open ? '#F97316' : undefined }}
          title="Notifications"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <i className="bi bi-bell" style={{ fontSize: 18 }} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 6, right: 6,
                minWidth: unreadCount > 9 ? 16 : 8,
                height: unreadCount > 9 ? 16 : 8,
                background: '#F97316',
                borderRadius: '50%',
                border: '2px solid #FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1,
              }}
            >
              {unreadCount > 9 ? '9+' : ''}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="notif-dropdown">
            {/* Header */}
            <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#09090B' }}>Notifications</div>
                {unreadCount > 0 && (
                  <div style={{ fontSize: 12, color: '#71717A', marginTop: 1 }}>{unreadCount} unread</div>
                )}
              </div>
              <div className="d-flex align-items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    style={{ fontSize: 11, fontWeight: 700, color: '#F97316', background: 'none', border: '1px solid #FED7AA', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="notif-list">
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#A1A1AA' }}>
                  <i className="bi bi-bell-slash" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                  <div style={{ fontSize: 13 }}>You're all caught up!</div>
                </div>
              ) : (
                notifications.map(n => {
                  const cfg = TYPE_CONFIG[n.type]
                  return (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      {/* Icon */}
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`bi ${cfg.icon}`} style={{ fontSize: 16, color: cfg.color }} />
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: '#09090B', lineHeight: 1.35, marginBottom: 2 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#71717A', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {n.body}
                        </div>
                        <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4 }}>
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      {/* Unread dot */}
                      {!n.read && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316', flexShrink: 0, marginTop: 4 }} />
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                <button
                  onClick={() => { setOpen(false); navigate('/tasks') }}
                  style={{ fontSize: 12, fontWeight: 700, color: '#F97316', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  View all tasks <i className="bi bi-arrow-right" style={{ fontSize: 11 }} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
