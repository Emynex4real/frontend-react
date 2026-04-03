import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { branchManagerApi } from '../../services/api'
import type { User } from '../../types'

const ROLE_CONFIG: Record<number, { label: string; color: string; bg: string; icon: string }> = {
  3: { label: 'Staff',                color: '#10B981', bg: '#ECFDF5', icon: 'bi-person' },
  4: { label: 'Assistant Manager',    color: '#6366F1', bg: '#EEF2FF', icon: 'bi-person-workspace' },
  5: { label: 'Branch Administrator', color: '#0EA5E9', bg: '#F0F9FF', icon: 'bi-person-gear' },
}

export default function ManagerTeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('all')

  useEffect(() => {
    if (!user) return
    branchManagerApi.getBranchMembers(user.branch_id ?? 2)
      .then(res => { if (res.success && res.data) setMembers(res.data) })
      .finally(() => setLoading(false))
  }, [user])

  const filtered = members.filter(m => filterRole === 'all' || String(m.role_id) === filterRole)

  const countByRole = (id: number) => members.filter(m => m.role_id === id).length

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 1000 }}>
      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#09090B', margin: 0 }}>Branch Team</h1>
          <p style={{ color: '#71717A', margin: '4px 0 0', fontSize: 13 }}>
            Members in {user?.branch_name ?? 'your branch'} — {members.length} people
          </p>
        </div>
      </div>

      {/* Role Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[3, 4, 5].map(rid => {
          const cfg = ROLE_CONFIG[rid]
          const count = countByRole(rid)
          return (
            <button
              key={rid}
              onClick={() => setFilterRole(filterRole === String(rid) ? 'all' : String(rid))}
              style={{
                background: filterRole === String(rid) ? cfg.bg : '#fff',
                border: `1px solid ${filterRole === String(rid) ? cfg.color + '40' : 'rgba(0,0,0,0.06)'}`,
                borderRadius: 14, padding: '16px 18px', cursor: 'pointer', textAlign: 'left',
                transition: 'all .2s', boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: cfg.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                border: `1px solid ${cfg.color}25`,
              }}>
                <i className={`bi ${cfg.icon}`} style={{ color: cfg.color, fontSize: 16 }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#09090B' }}>{count}</div>
              <div style={{ fontSize: 12, color: '#71717A', fontWeight: 500, marginTop: 2 }}>{cfg.label}</div>
            </button>
          )
        })}
      </div>

      {/* Filter / Search Row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
            background: '#fff', fontSize: 13, color: '#09090B', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="all">All Roles</option>
          {[3, 4, 5].map(rid => (
            <option key={rid} value={String(rid)}>{ROLE_CONFIG[rid].label}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: '#A1A1AA', alignSelf: 'center' }}>
          {filtered.length} member{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Members List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array(4).fill(null).map((_, i) => <div key={i} style={{ height: 64, background: '#F4F4F5', borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#71717A' }}>
          <i className="bi bi-people" style={{ fontSize: 36, display: 'block', color: '#D4D4D8', marginBottom: 8 }} />
          <div style={{ fontWeight: 600, color: '#3F3F46' }}>No members found</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {filtered.map((member, idx) => {
            const cfg = ROLE_CONFIG[member.role_id] ?? { label: member.role_name, color: '#71717A', bg: '#F4F4F5', icon: 'bi-person' }
            const initials = member.full_name.split(' ').map(n => n[0]).join('')
            return (
              <div
                key={member.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: `${cfg.color}20`, color: cfg.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, flexShrink: 0,
                }}>
                  {initials}
                </div>

                {/* Name & email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#09090B' }}>{member.full_name}</div>
                  <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 1 }}>{member.email}</div>
                </div>

                {/* Department */}
                {member.department_name && (
                  <div style={{ fontSize: 12, color: '#71717A', minWidth: 120, textAlign: 'center' }}>
                    {member.department_name}
                  </div>
                )}

                {/* Role Badge */}
                <span style={{
                  padding: '4px 12px', borderRadius: 20,
                  background: cfg.bg, color: cfg.color,
                  fontSize: 11, fontWeight: 700,
                  border: `1px solid ${cfg.color}25`,
                }}>{cfg.label}</span>

                {/* Status */}
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: member.status === 'active' ? '#ECFDF5' : '#F4F4F5',
                  color: member.status === 'active' ? '#10B981' : '#A1A1AA',
                }}>{member.status}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
