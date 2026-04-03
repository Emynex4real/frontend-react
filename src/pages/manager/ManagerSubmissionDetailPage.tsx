import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { branchManagerApi } from '../../services/api'
import type { ReportEntry } from '../../types'

export default function ManagerSubmissionDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<ReportEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [forwardToAdmin, setForwardToAdmin] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    branchManagerApi.getBranchSubmissions(user.branch_id ?? 2)
      .then(res => {
        if (res.success && res.data) {
          const found = res.data.find(e => e.id === Number(id))
          setEntry(found ?? null)
        }
      })
      .finally(() => setLoading(false))
  }, [id, user])

  const handleSubmit = async () => {
    if (!entry || !action) return
    if (action === 'reject' && !comment.trim()) return
    setSubmitting(true)
    try {
      await branchManagerApi.reviewSubmission(entry.id, {
        status: action === 'approve' ? 'approved' : 'rejected',
        comment,
      })
      setDone(action === 'approve'
        ? `Submission approved${forwardToAdmin ? ' and forwarded to Super Admin' : ''}.`
        : 'Submission rejected with feedback.')
      setAction(null)
    } finally {
      setSubmitting(false)
    }
  }

  const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
    pending:  { color: '#F59E0B', bg: '#FFFBEB', label: 'Pending Review' },
    approved: { color: '#10B981', bg: '#ECFDF5', label: 'Approved' },
    rejected: { color: '#EF4444', bg: '#FEF2F2', label: 'Rejected' },
  }

  if (loading) return (
    <div style={{ padding: 32 }}>
      <div style={{ height: 200, background: '#F4F4F5', borderRadius: 16 }} />
    </div>
  )

  if (!entry) return (
    <div style={{ padding: 32, textAlign: 'center', color: '#71717A' }}>
      <i className="bi bi-exclamation-circle" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
      Submission not found.
      <br /><button onClick={() => navigate('/manager/submissions')} style={{ marginTop: 12, background: 'none', border: 'none', color: '#F97316', cursor: 'pointer', fontWeight: 600 }}>← Back to Submissions</button>
    </div>
  )

  const cfg = STATUS_CFG[entry.status] ?? STATUS_CFG.pending

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 800 }}>
      {/* Back */}
      <button
        onClick={() => navigate('/manager/submissions')}
        style={{ background: 'none', border: 'none', color: '#71717A', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <i className="bi bi-arrow-left" /> Back to Submissions
      </button>

      {/* Success Banner */}
      {done && (
        <div style={{ background: '#ECFDF5', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="bi bi-check-circle-fill" style={{ color: '#10B981', fontSize: 18 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>{done}</span>
        </div>
      )}

      {/* Header Card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#09090B', margin: '0 0 6px' }}>{entry.report_title}</h1>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#71717A' }}>
                <i className="bi bi-person me-1" />{entry.submitter_name}
                <span style={{
                  marginLeft: 8, padding: '1px 7px', borderRadius: 20,
                  background: `${cfg.color}15`, color: cfg.color, fontSize: 11, fontWeight: 700,
                }}>{entry.submitter_role}</span>
              </span>
              <span style={{ fontSize: 12, color: '#A1A1AA' }}>
                <i className="bi bi-calendar3 me-1" />{entry.week_label}
              </span>
              <span style={{ fontSize: 12, color: '#A1A1AA' }}>
                <i className="bi bi-clock me-1" />{new Date(entry.created_at).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          <span style={{ padding: '6px 14px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, border: `1px solid ${cfg.color}25` }}>
            {cfg.label}
          </span>
        </div>

        {/* Rejection comment if any */}
        {entry.status === 'rejected' && entry.rejection_comment && (
          <div style={{
            marginTop: 16, background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 10, padding: '12px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
              <i className="bi bi-exclamation-triangle-fill me-1" />Rejection Feedback
            </div>
            <div style={{ fontSize: 13, color: '#7F1D1D' }}>{entry.rejection_comment}</div>
          </div>
        )}
      </div>

      {/* Report Data */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <h6 style={{ fontWeight: 700, color: '#09090B', margin: '0 0 16px', fontSize: 14 }}>
          <i className="bi bi-file-text me-2" style={{ color: '#6366F1' }} />Report Content
        </h6>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {Object.entries(entry.data as Record<string, string | number>).map(([key, value]) => (
            <div key={key} style={{
              background: '#F8FAFC', borderRadius: 10, padding: '12px 14px',
              gridColumn: String(value).length > 60 ? 'span 2' : 'auto',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
                {key.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: 13, color: '#09090B', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{String(value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Actions (only if pending and not done) */}
      {entry.status === 'pending' && !done && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid rgba(0,0,0,0.06)' }}>
          <h6 style={{ fontWeight: 700, color: '#09090B', margin: '0 0 16px', fontSize: 14 }}>
            <i className="bi bi-clipboard2-check me-2" style={{ color: '#F97316' }} />Review This Submission
          </h6>

          {/* Action Select */}
          {!action ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setAction('approve')}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: '2px solid rgba(16,185,129,0.2)',
                  background: '#ECFDF5', color: '#10B981', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <i className="bi bi-check2-circle" style={{ fontSize: 18 }} />Approve
              </button>
              <button
                onClick={() => setAction('reject')}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: '2px solid rgba(239,68,68,0.2)',
                  background: '#FEF2F2', color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <i className="bi bi-x-circle" style={{ fontSize: 18 }} />Reject
              </button>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3F3F46', marginBottom: 8 }}>
                {action === 'reject' ? 'Rejection Reason *' : 'Approval Comment (optional)'}
              </label>
              <textarea
                rows={4}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={action === 'reject' ? 'What needs to be corrected?' : 'Add an approval note...'}
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10,
                  fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 14, color: '#09090B',
                }}
              />
              {action === 'approve' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
                  <input type="checkbox" checked={forwardToAdmin} onChange={e => setForwardToAdmin(e.target.checked)} style={{ accentColor: '#F97316' }} />
                  <span style={{ fontSize: 13, color: '#52525B', fontWeight: 500 }}>Forward to Super Admin for final review</span>
                </label>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setAction(null)} style={{ background: '#F4F4F5', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#52525B' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || (action === 'reject' && !comment.trim())}
                  style={{
                    background: action === 'approve' ? '#10B981' : '#EF4444',
                    color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    opacity: (submitting || (action === 'reject' && !comment.trim())) ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                >
                  {submitting ? <><span className="spinner-border spinner-border-sm" />Processing...</>
                    : action === 'approve'
                      ? <><i className="bi bi-check2-circle" />Confirm Approval</>
                      : <><i className="bi bi-send" />Send Rejection</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
