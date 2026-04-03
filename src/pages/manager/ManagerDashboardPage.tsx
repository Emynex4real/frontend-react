import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { branchManagerApi } from '../../services/api'

interface BranchStats {
  total_templates: number
  total_submissions: number
  pending_review: number
  approved: number
  rejected: number
  compliance_rate: number
}

export default function ManagerDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<BranchStats | null>(null)
  const [loading, setLoading] = useState(true)

  const branchId = user?.branch_id ?? 0
  const branchName = user?.branch_name ?? 'Your Branch'
  const firstName = user?.full_name?.split(' ')[0] ?? 'Manager'

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const dateStr = now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    branchManagerApi.getBranchStats(branchId)
      .then(res => {
        if (res.success && res.data) setStats(res.data as BranchStats)
      })
      .finally(() => setLoading(false))
  }, [branchId])

  const statCards = [
    { label: 'Templates Created',  value: stats?.total_templates  ?? 0, icon: 'bi-file-earmark-text', color: '#6366F1', bg: '#EEF2FF' },
    { label: 'Total Submissions',  value: stats?.total_submissions ?? 0, icon: 'bi-send-check',        color: '#0EA5E9', bg: '#F0F9FF' },
    { label: 'Pending Review',     value: stats?.pending_review    ?? 0, icon: 'bi-hourglass-split',   color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Compliance Rate',    value: `${stats?.compliance_rate ?? 0}%`, icon: 'bi-graph-up-arrow', color: '#10B981', bg: '#ECFDF5' },
  ]

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 1200 }}>
      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-5" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{
              background: '#EFF6FF', color: '#3B82F6', padding: '3px 10px',
              borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
            }}>
              <i className="bi bi-person-badge-fill me-1" />Branch Manager
            </span>
            <span style={{ fontSize: 12, color: '#A1A1AA' }}>{branchName}</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#09090B', margin: 0 }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ color: '#71717A', marginTop: 4, fontSize: 13 }}>{dateStr}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/manager/templates/new')}
            style={{
              background: '#09090B', color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            }}
          >
            <i className="bi bi-plus-lg" />New Template
          </button>
          <button
            onClick={() => navigate('/manager/submissions')}
            style={{
              background: '#fff', color: '#09090B', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10,
              padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <i className="bi bi-clipboard2-check" />Review Submissions
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {(loading ? Array(4).fill(null) : statCards).map((card, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 16, padding: '20px 24px',
            border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}>
            {loading ? (
              <div style={{ height: 60, background: '#F4F4F5', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: card.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={`bi ${card.icon}`} style={{ color: card.color, fontSize: 16 }} />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#09090B', lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: 12, color: '#71717A', marginTop: 4, fontWeight: 500 }}>{card.label}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* My Templates */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h6 style={{ fontWeight: 700, color: '#09090B', margin: 0, fontSize: 14 }}>
              <i className="bi bi-file-earmark-text me-2" style={{ color: '#6366F1' }} />My Templates
            </h6>
            <button
              onClick={() => navigate('/manager/templates')}
              style={{ background: 'none', border: 'none', color: '#F97316', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >View all →</button>
          </div>
          {[
            { title: 'Staff Weekly Activity Report',         targets: 'Staff',                color: '#10B981' },
            { title: 'Assistant Manager Performance Report', targets: 'Assistant Manager',    color: '#6366F1' },
            { title: 'Branch Admin Compliance Report',       targets: 'Branch Administrator', color: '#0EA5E9' },
          ].map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 10, background: '#F8FAFC', marginBottom: 8,
              border: '1px solid rgba(0,0,0,0.03)',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>{t.title}</div>
                <div style={{ fontSize: 11, color: '#71717A', marginTop: 1 }}>For: {t.targets}</div>
              </div>
              <span style={{
                background: `${t.color}15`, color: t.color, fontSize: 10, fontWeight: 700,
                padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '.04em',
              }}>Active</span>
            </div>
          ))}
          <button
            onClick={() => navigate('/manager/templates/new')}
            style={{
              width: '100%', marginTop: 4, background: 'none', border: '1px dashed rgba(0,0,0,0.1)',
              borderRadius: 10, padding: '8px', color: '#71717A', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 500,
            }}
          >
            <i className="bi bi-plus-lg" />Create New Template
          </button>
        </div>

        {/* Recent Submissions */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h6 style={{ fontWeight: 700, color: '#09090B', margin: 0, fontSize: 14 }}>
              <i className="bi bi-inbox me-2" style={{ color: '#F59E0B' }} />Pending Reviews
            </h6>
            <button
              onClick={() => navigate('/manager/submissions')}
              style={{ background: 'none', border: 'none', color: '#F97316', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >View all →</button>
          </div>
          {[
            { name: 'Mary Smith',  role: 'Staff',                report: 'Staff Weekly Activity Report',         status: 'pending' },
            { name: 'Ana Cruz',    role: 'Assistant Manager',    report: 'Assistant Manager Performance Report', status: 'pending' },
          ].map((s, i) => (
            <div
              key={i}
              onClick={() => navigate('/manager/submissions')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.15)',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#F59E0B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {s.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#71717A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.report}</div>
              </div>
              <span style={{
                background: '#FFFBEB', color: '#F59E0B', fontSize: 10, fontWeight: 700,
                padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
                border: '1px solid rgba(245,158,11,0.2)', flexShrink: 0,
              }}>Pending</span>
            </div>
          ))}
          {stats?.pending_review === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#71717A', fontSize: 13 }}>
              <i className="bi bi-check-circle" style={{ fontSize: 24, color: '#10B981', display: 'block', marginBottom: 6 }} />
              All caught up! No pending reviews.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
