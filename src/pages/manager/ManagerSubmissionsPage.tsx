import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { branchManagerApi } from '../../services/api'
import type { ReportEntry } from '../../types'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'Pending',  color: '#F59E0B', bg: '#FFFBEB', border: 'rgba(245,158,11,0.2)' },
  approved: { label: 'Approved', color: '#10B981', bg: '#ECFDF5', border: 'rgba(16,185,129,0.2)' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#FEF2F2', border: 'rgba(239,68,68,0.2)' },
}

const ROLE_COLORS: Record<string, string> = {
  'Staff': '#10B981', 'Assistant Manager': '#6366F1', 'Branch Administrator': '#0EA5E9',
}

interface ReviewModal {
  entry: ReportEntry
  action: 'approve' | 'reject'
  comment: string
  forwardToAdmin: boolean
}

export default function ManagerSubmissionsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [entries, setEntries] = useState<ReportEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [weekFilter, setWeekFilter] = useState('all')
  const [modal, setModal] = useState<ReviewModal | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const branchId = user?.branch_id ?? 2

  const load = useCallback(() => {
    setLoading(true)
    branchManagerApi.getBranchSubmissions(branchId)
      .then(res => { if (res.success && res.data) setEntries(res.data) })
      .finally(() => setLoading(false))
  }, [branchId])

  useEffect(() => { load() }, [load])

  const filtered = entries.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    if (roleFilter !== 'all' && e.submitter_role !== roleFilter) return false
    if (weekFilter !== 'all' && e.week_start !== weekFilter) return false
    return true
  })

  const weeks = [...new Set(entries.map(e => e.week_start).filter(Boolean) as string[])].sort((a, b) => b.localeCompare(a))
  const roles = [...new Set(entries.map(e => e.submitter_role))]

  const handleReview = async () => {
    if (!modal) return
    setSubmitting(true)
    try {
      await branchManagerApi.reviewSubmission(modal.entry.id, {
        status: modal.action === 'approve' ? 'approved' : 'rejected',
        comment: modal.comment,
      })
      setSuccess(modal.action === 'approve'
        ? `Submission approved${modal.forwardToAdmin ? ' and forwarded to Super Admin' : ''}.`
        : 'Submission rejected with feedback.')
      setModal(null)
      load()
      setTimeout(() => setSuccess(null), 4000)
    } finally {
      setSubmitting(false)
    }
  }

  const countBy = (status: string) => entries.filter(e => e.status === status).length

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 1200, position: 'relative' }}>

      {/* Success Toast */}
      {success && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#09090B', color: '#fff', padding: '12px 20px', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, fontWeight: 500,
        }}>
          <i className="bi bi-check-circle-fill" style={{ color: '#10B981', fontSize: 16 }} />
          {success}
        </div>
      )}

      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#09090B', margin: 0 }}>Branch Submissions</h1>
          <p style={{ color: '#71717A', margin: '4px 0 0', fontSize: 13 }}>
            Review and action report submissions from your branch team
          </p>
        </div>
        {/* Summary counters */}
        <div style={{ display: 'flex', gap: 10 }}>
          {(['pending', 'approved', 'rejected'] as const).map(s => {
            const cfg = STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                style={{
                  background: statusFilter === s ? cfg.bg : '#fff',
                  border: `1px solid ${statusFilter === s ? cfg.border : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
                  color: statusFilter === s ? cfg.color : '#52525B',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700 }}>{countBy(s)}</span>
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'All Statuses', value: 'all', setter: setStatusFilter, current: statusFilter, options: [
            { value: 'all', label: 'All Statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]},
          { label: 'All Roles', value: 'all', setter: setRoleFilter, current: roleFilter, options: [
            { value: 'all', label: 'All Roles' },
            ...roles.map(r => ({ value: r, label: r })),
          ]},
          { label: 'All Weeks', value: 'all', setter: setWeekFilter, current: weekFilter, options: [
            { value: 'all', label: 'All Weeks' },
            ...weeks.map(w => ({ value: w, label: w ? new Date(w).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : w })),
          ]},
        ].map(f => (
          <select
            key={f.label}
            value={f.current}
            onChange={e => f.setter(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
              background: '#fff', fontSize: 13, color: '#09090B', cursor: 'pointer', outline: 'none',
            }}
          >
            {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        <span style={{ fontSize: 12, color: '#A1A1AA', alignSelf: 'center', marginLeft: 4 }}>
          {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Submissions Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array(4).fill(null).map((_, i) => <div key={i} style={{ height: 72, background: '#F4F4F5', borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#71717A' }}>
          <i className="bi bi-inbox" style={{ fontSize: 40, display: 'block', color: '#D4D4D8', marginBottom: 10 }} />
          <div style={{ fontWeight: 600, color: '#3F3F46' }}>No submissions match the current filters</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 180px 160px 120px 130px 160px',
            padding: '12px 20px', background: '#F8FAFC',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '.06em',
          }}>
            <span>Submitter</span>
            <span>Report</span>
            <span>Week</span>
            <span>Role</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {filtered.map((entry, idx) => {
            const cfg = STATUS_CONFIG[entry.status ?? 'pending'] ?? STATUS_CONFIG.pending
            const roleColor = ROLE_COLORS[entry.submitter_role ?? ''] ?? '#71717A'
            return (
              <div
                key={entry.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 180px 160px 120px 130px 160px',
                  padding: '14px 20px', alignItems: 'center',
                  borderBottom: idx < filtered.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Submitter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: `${roleColor}20`, color: roleColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 12, flexShrink: 0,
                  }}>
                    {(entry.submitter_name ?? '?').split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#09090B' }}>{entry.submitter_name}</div>
                    {entry.status === 'rejected' && entry.rejection_comment && (
                      <div style={{ fontSize: 10, color: '#EF4444', marginTop: 1 }}>
                        <i className="bi bi-exclamation-circle me-1" />Feedback sent
                      </div>
                    )}
                  </div>
                </div>

                {/* Report Title */}
                <div style={{ fontSize: 12, color: '#52525B', fontWeight: 500 }}>{entry.report_title}</div>

                {/* Week */}
                <div style={{ fontSize: 12, color: '#71717A' }}>{entry.week_label}</div>

                {/* Role */}
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                  background: `${roleColor}15`, color: roleColor, fontSize: 11, fontWeight: 700,
                }}>
                  {entry.submitter_role}
                </span>

                {/* Status */}
                <span style={{
                  display: 'inline-block', padding: '4px 10px', borderRadius: 20,
                  background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                  fontSize: 11, fontWeight: 700,
                }}>
                  {cfg.label}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => navigate(`/manager/submissions/${entry.id}`)}
                    style={{
                      background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8,
                      padding: '5px 11px', fontSize: 11, fontWeight: 600, color: '#52525B', cursor: 'pointer',
                    }}
                  >View</button>
                  {entry.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setModal({ entry, action: 'approve', comment: '', forwardToAdmin: false })}
                        style={{
                          background: '#ECFDF5', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8,
                          padding: '5px 11px', fontSize: 11, fontWeight: 700, color: '#10B981', cursor: 'pointer',
                        }}
                      ><i className="bi bi-check2" /></button>
                      <button
                        onClick={() => setModal({ entry, action: 'reject', comment: '', forwardToAdmin: false })}
                        style={{
                          background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
                          padding: '5px 11px', fontSize: 11, fontWeight: 700, color: '#EF4444', cursor: 'pointer',
                        }}
                      ><i className="bi bi-x-lg" /></button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Review Modal ── */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 32, maxWidth: 480, width: '100%',
            boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: modal.action === 'approve' ? '#ECFDF5' : '#FEF2F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i
                  className={`bi ${modal.action === 'approve' ? 'bi-check2-circle' : 'bi-x-circle'}`}
                  style={{ fontSize: 20, color: modal.action === 'approve' ? '#10B981' : '#EF4444' }}
                />
              </div>
              <div>
                <h6 style={{ margin: 0, fontWeight: 700, color: '#09090B' }}>
                  {modal.action === 'approve' ? 'Approve Submission' : 'Reject Submission'}
                </h6>
                <p style={{ margin: 0, fontSize: 12, color: '#71717A' }}>
                  {modal.entry.submitter_name} — {modal.entry.report_title}
                </p>
              </div>
            </div>

            {/* Comment Field */}
            {modal.action === 'reject' ? (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3F3F46', marginBottom: 8 }}>
                  Rejection Reason * <span style={{ color: '#71717A', fontWeight: 400 }}>(required for rejection)</span>
                </label>
                <textarea
                  rows={4}
                  value={modal.comment}
                  onChange={e => setModal(m => m ? { ...m, comment: e.target.value } : m)}
                  placeholder="Explain what needs to be corrected or resubmitted..."
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10,
                    fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', color: '#09090B',
                  }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3F3F46', marginBottom: 8 }}>
                  Optional Comment
                </label>
                <textarea
                  rows={3}
                  value={modal.comment}
                  onChange={e => setModal(m => m ? { ...m, comment: e.target.value } : m)}
                  placeholder="Add an approval note (optional)..."
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10,
                    fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', color: '#09090B',
                  }}
                />
              </div>
            )}

            {/* Forward to Admin (only on approve) */}
            {modal.action === 'approve' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={modal.forwardToAdmin}
                  onChange={e => setModal(m => m ? { ...m, forwardToAdmin: e.target.checked } : m)}
                  style={{ width: 16, height: 16, accentColor: '#F97316' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>Forward to Super Admin</div>
                  <div style={{ fontSize: 11, color: '#71717A' }}>Send this submission to the Super Admin for final review</div>
                </div>
              </label>
            )}

            {/* Modal Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModal(null)}
                style={{
                  background: '#F4F4F5', border: 'none', borderRadius: 10, padding: '10px 20px',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#52525B',
                }}
              >Cancel</button>
              <button
                onClick={handleReview}
                disabled={submitting || (modal.action === 'reject' && !modal.comment.trim())}
                style={{
                  background: modal.action === 'approve' ? '#10B981' : '#EF4444',
                  color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  opacity: (submitting || (modal.action === 'reject' && !modal.comment.trim())) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                {submitting
                  ? <><span className="spinner-border spinner-border-sm" />Processing...</>
                  : modal.action === 'approve'
                    ? <><i className="bi bi-check2-circle" />Approve{modal.forwardToAdmin ? ' & Forward' : ''}</>
                    : <><i className="bi bi-send" />Send Rejection</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
