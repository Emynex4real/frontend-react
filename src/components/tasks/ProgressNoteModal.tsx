import { useState } from 'react'
import type { Task } from '../../types'
import { format } from 'date-fns'

interface Props {
  task: Task
  onClose: () => void
  onSave: (note: string) => void
  isPending: boolean
}

export default function ProgressNoteModal({ task, onClose, onSave, isPending }: Props) {
  const [note, setNote] = useState(task.progress_note ?? '')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!note.trim()) { setError('Please write a progress update before saving.'); return }
    onSave(note.trim())
  }

  return (
    <>
      <style>{`
        .pnm-overlay {
          position: fixed; inset: 0; z-index: 1070;
          background: rgba(0,0,0,0.42); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 16px;
          animation: pnm-in 0.18s ease;
        }
        @keyframes pnm-in { from { opacity:0 } to { opacity:1 } }
        .pnm-card {
          background: #fff; border-radius: 18px; width: 100%; max-width: 480px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.16);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          animation: pnm-up 0.22s cubic-bezier(0.16,1,0.3,1); overflow: hidden;
        }
        @keyframes pnm-up { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div className="pnm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="pnm-card">

          {/* Header */}
          <div style={{ padding: '20px 24px 16px', background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', borderBottom: '1px solid #BBF7D0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg,#10B981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                <i className="bi bi-journal-text" style={{ fontSize: 18, color: '#fff' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#09090B', margin: 0 }}>Progress Note</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#52525B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
              </div>
              <button onClick={onClose} style={{ border: 'none', background: 'rgba(0,0,0,0.07)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#52525B', flexShrink: 0 }}>
                <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Previous note banner */}
            {task.progress_note && task.progress_note_at && (
              <div style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 4 }}>
                  Last update · {format(new Date(task.progress_note_at), 'MMM d, yyyy')}
                  {task.progress_note_author ? ` by ${task.progress_note_author}` : ''}
                </div>
                <div style={{ fontSize: 13, color: '#3F3F46', lineHeight: 1.6 }}>{task.progress_note}</div>
              </div>
            )}

            {/* Guidance */}
            <p style={{ margin: 0, fontSize: 13, color: '#71717A', lineHeight: 1.6 }}>
              Write a brief update on where things stand — what's been done, what's next, any blockers. This is visible to you and the task creator.
            </p>

            {/* Textarea */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Update <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                rows={5}
                value={note}
                onChange={e => { setNote(e.target.value); if (error) setError('') }}
                placeholder="e.g. Sales and compliance data collected. Ana is finalising headcount KPIs. On track for the due date — no blockers."
                style={{ width: '100%', border: `1.5px solid ${error ? '#EF4444' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#FAFAFA', boxSizing: 'border-box', lineHeight: 1.6 }}
                onFocus={e => { e.target.style.borderColor = '#10B981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }}
                onBlur={e => { e.target.style.borderColor = error ? '#EF4444' : 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none' }}
                autoFocus
              />
              {error && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{error}</div>}
              <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4, textAlign: 'right' }}>{note.length} chars</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 24px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} disabled={isPending} style={{ background: '#F4F4F5', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: '#52525B', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !note.trim()}
              style={{
                background: note.trim() && !isPending ? 'linear-gradient(135deg,#10B981,#059669)' : '#E4E4E7',
                color: note.trim() && !isPending ? '#fff' : '#A1A1AA',
                border: 'none', borderRadius: 10, padding: '10px 22px',
                fontSize: 13, fontWeight: 700, cursor: note.trim() && !isPending ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: note.trim() && !isPending ? '0 4px 12px rgba(16,185,129,0.25)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {isPending
                ? <><span className="spinner-border spinner-border-sm" />Saving...</>
                : <><i className="bi bi-check-lg" />Save Update</>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
