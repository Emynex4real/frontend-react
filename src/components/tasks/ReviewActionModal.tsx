import { useState } from 'react'
import type { Task } from '../../types'

interface Props {
  task: Task
  mode: 'approve' | 'reject'
  onClose: () => void
  onApprove: (id: number) => void
  onReject: (id: number, reason: string) => void
  isPending: boolean
}

export default function ReviewActionModal({ task, mode, onClose, onApprove, onReject, isPending }: Props) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (mode === 'reject') {
      if (!reason.trim()) { setError('A rejection reason is required.'); return }
      onReject(task.id, reason.trim())
    } else {
      onApprove(task.id)
    }
  }

  return (
    <>
      <style>{`
        .ram-overlay {
          position: fixed; inset: 0; z-index: 1070;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          backdrop-filter: blur(4px);
          animation: ram-in 0.18s ease;
        }
        @keyframes ram-in { from { opacity:0 } to { opacity:1 } }
        .ram-card {
          background: #fff; border-radius: 18px; width: 100%; max-width: 460px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.18);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          animation: ram-up 0.22s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        @keyframes ram-up { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div className="ram-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="ram-card">
          {/* Header */}
          <div style={{
            padding: '20px 24px 16px',
            background: mode === 'approve' ? 'linear-gradient(135deg,#F0FDF4,#DCFCE7)' : 'linear-gradient(135deg,#FEF2F2,#FEE2E2)',
            borderBottom: `1px solid ${mode === 'approve' ? '#BBF7D0' : '#FECACA'}`,
          }}>
            <div className="d-flex align-items-center gap-3">
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: mode === 'approve' ? '#10B981' : '#EF4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${mode === 'approve' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                <i className={`bi ${mode === 'approve' ? 'bi-check-lg' : 'bi-x-lg'}`} style={{ fontSize: 20, color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#09090B', margin: 0 }}>
                  {mode === 'approve' ? 'Approve Task' : 'Reject Task'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#71717A' }}>{task.title}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px' }}>
            {mode === 'approve' ? (
              <p style={{ fontSize: 14, color: '#3F3F46', lineHeight: 1.6, margin: 0 }}>
                Approving this task will mark it as <strong>Done</strong> and notify the assignees.
                This action confirms the work has been completed to your satisfaction.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 14, color: '#3F3F46', lineHeight: 1.6, marginBottom: 16 }}>
                  The task will be returned to <strong>Needs Revision</strong> and the assignees will be notified with your feedback.
                </p>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  Rejection Reason <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={e => { setReason(e.target.value); setError('') }}
                  placeholder="Explain what needs to be revised or corrected..."
                  style={{
                    width: '100%', border: `1px solid ${error ? '#EF4444' : 'rgba(0,0,0,0.1)'}`,
                    borderRadius: 10, padding: '10px 14px', fontSize: 14,
                    outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                    background: '#FAFAFA', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = error ? '#EF4444' : 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none' }}
                  autoFocus
                />
                {error && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}><i className="bi bi-exclamation-circle" style={{ marginRight: 4 }} />{error}</div>}
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} disabled={isPending} style={{ background: '#F4F4F5', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: '#52525B', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                background: isPending ? '#E4E4E7' : mode === 'approve' ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#EF4444,#DC2626)',
                color: isPending ? '#A1A1AA' : '#fff',
                border: 'none', borderRadius: 10, padding: '10px 22px',
                fontSize: 13, fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: isPending ? 'none' : `0 4px 12px ${mode === 'approve' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                transition: 'all 0.2s',
              }}
            >
              {isPending
                ? <><span className="spinner-border spinner-border-sm" />Processing...</>
                : mode === 'approve'
                  ? <><i className="bi bi-check-lg" />Approve Task</>
                  : <><i className="bi bi-x-lg" />Reject & Return</>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
