import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { branchManagerApi } from '../../services/api'
import type { Report } from '../../types'

const ROLE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  3: { label: 'Staff',                color: '#10B981', bg: '#ECFDF5' },
  4: { label: 'Assistant Manager',    color: '#6366F1', bg: '#EEF2FF' },
  5: { label: 'Branch Administrator', color: '#0EA5E9', bg: '#F0F9FF' },
  2: { label: 'Branch Manager (Self)',color: '#F97316', bg: '#FFF7ED' },
}

export default function ManagerTemplatesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    branchManagerApi.getMyTemplates(user.id)
      .then(res => { if (res.success && res.data) setTemplates(res.data) })
      .finally(() => setLoading(false))
  }, [user])

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 1100 }}>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#09090B', margin: 0 }}>Branch Templates</h1>
          <p style={{ color: '#71717A', margin: '4px 0 0', fontSize: 13 }}>
            Report templates you've created for your branch team
          </p>
        </div>
        <button
          onClick={() => navigate('/manager/templates/new')}
          style={{
            background: '#09090B', color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          <i className="bi bi-plus-lg" />Create Template
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12,
        padding: '12px 16px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <i className="bi bi-info-circle-fill" style={{ color: '#3B82F6', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#1D4ED8' }}>
          You can only see and manage templates you have created. Templates created by the Super Admin are assigned separately.
        </span>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {Array(3).fill(null).map((_, i) => (
            <div key={i} style={{ height: 160, background: '#F4F4F5', borderRadius: 16 }} />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#71717A' }}>
          <i className="bi bi-file-earmark-plus" style={{ fontSize: 40, display: 'block', marginBottom: 12, color: '#D4D4D8' }} />
          <div style={{ fontWeight: 600, fontSize: 15, color: '#3F3F46' }}>No templates yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Create your first report template for your branch team</div>
          <button
            onClick={() => navigate('/manager/templates/new')}
            style={{
              marginTop: 16, background: '#09090B', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            <i className="bi bi-plus-lg me-2" />Create First Template
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {templates.map(tpl => {
            const targetRoleInfo = tpl.target_roles.map(rid => ROLE_LABELS[rid]).filter(Boolean)
            return (
              <div key={tpl.id} style={{
                background: '#fff', borderRadius: 16, padding: 24,
                border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease', cursor: 'default',
              }}>
                {/* Category / Priority pills */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <span style={{
                    background: '#F8FAFC', color: '#52525B', padding: '2px 9px',
                    borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1px solid rgba(0,0,0,0.06)',
                  }}>{tpl.category}</span>
                  <span style={{
                    background: tpl.priority === 'high' ? '#FEF2F2' : '#FFFBEB',
                    color: tpl.priority === 'high' ? '#EF4444' : '#F59E0B',
                    padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    textTransform: 'capitalize',
                  }}>{tpl.priority}</span>
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#09090B', margin: '0 0 6px 0' }}>{tpl.title}</h3>
                <p style={{ fontSize: 12, color: '#71717A', margin: '0 0 16px 0', lineHeight: 1.5 }}>{tpl.description}</p>

                {/* Target Roles */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                    Assigned to
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {targetRoleInfo.map((r, i) => (
                      <span key={i} style={{
                        background: r.bg, color: r.color, padding: '3px 10px',
                        borderRadius: 20, fontSize: 11, fontWeight: 700,
                      }}>{r.label}</span>
                    ))}
                  </div>
                </div>

                {/* Field count */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#A1A1AA' }}>
                    <i className="bi bi-list-ul me-1" />{tpl.fields?.length ?? 0} fields
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{
                      background: 'none', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12, color: '#52525B', cursor: 'pointer', fontWeight: 500,
                    }}>
                      <i className="bi bi-pencil me-1" />Edit
                    </button>
                    <button
                      onClick={() => navigate('/manager/submissions?template=' + tpl.id)}
                      style={{
                        background: '#F97316', border: 'none', borderRadius: 8,
                        padding: '5px 12px', fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 600,
                      }}
                    >View Submissions</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
