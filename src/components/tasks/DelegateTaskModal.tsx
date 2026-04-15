import { useState } from 'react'
import type { Task, User } from '../../types'

interface Props {
  task: Task
  branchStaff: User[]
  currentUserId: number
  onClose: () => void
  onDelegate: (userIds: number[], userNames: string[], note: string) => void
  isPending: boolean
}

const AVATAR_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EF4444']

function Avatar({ name, size = 28, index = 0 }: { name: string; size?: number; index?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: AVATAR_COLORS[index % AVATAR_COLORS.length],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36,
    }}>
      {initials}
    </div>
  )
}

export default function DelegateTaskModal({ task, branchStaff, currentUserId, onClose, onDelegate, isPending }: Props) {
  const [selected, setSelected] = useState<number[]>(task.delegated_to ?? [])
  const [note, setNote] = useState(task.delegate_note ?? '')
  const [noteError, setNoteError] = useState('')

  const eligibleStaff = branchStaff.filter(u => u.id !== currentUserId)

  const toggle = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSubmit = () => {
    if (selected.length === 0) return
    if (!note.trim()) { setNoteError('Please provide an instruction for the delegatee(s).'); return }
    const names = eligibleStaff.filter(u => selected.includes(u.id)).map(u => u.full_name)
    onDelegate(selected, names, note.trim())
  }

  const canSubmit = selected.length > 0 && note.trim().length > 0

  return (
    <>
      <style>{`
        .dlg-overlay {
          position: fixed; inset: 0; z-index: 1070;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 16px;
          animation: dlg-in 0.18s ease;
        }
        @keyframes dlg-in { from { opacity:0 } to { opacity:1 } }
        .dlg-card {
          background: #fff; border-radius: 18px; width: 100%; max-width: 520px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.18);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          animation: dlg-up 0.22s cubic-bezier(0.16,1,0.3,1); overflow: hidden;
        }
        @keyframes dlg-up { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        .dlg-staff-row {
          display: flex; align-items: center; gap: 12;
          padding: 10px 14px; border-radius: 12px;
          border: 1.5px solid rgba(0,0,0,0.07);
          background: #FAFAFA; cursor: pointer;
          transition: all 0.15s; margin-bottom: 8px;
        }
        .dlg-staff-row:hover { border-color: #3B82F6; background: #EFF6FF; }
        .dlg-staff-row.selected { border-color: #3B82F6; background: #EFF6FF; }
      `}</style>

      <div className="dlg-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="dlg-card">

          {/* Header */}
          <div style={{ padding: '20px 24px 16px', background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', borderBottom: '1px solid #BFDBFE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg,#3B82F6,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                <i className="bi bi-people-fill" style={{ fontSize: 18, color: '#fff' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#09090B', margin: 0 }}>Delegate Task</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#52525B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
              </div>
              <button onClick={onClose} style={{ border: 'none', background: 'rgba(0,0,0,0.07)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#52525B', flexShrink: 0 }}>
                <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '60vh', overflowY: 'auto' }}>

            {/* Existing delegation banner */}
            {(task.delegated_to ?? []).length > 0 && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-info-circle-fill" style={{ color: '#F97316', fontSize: 14, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#7C2D12' }}>
                  Already delegated to <strong>{(task.delegated_names ?? []).join(', ')}</strong>. Saving will update the delegation.
                </span>
              </div>
            )}

            {/* Staff picker */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Select Staff Member(s) <span style={{ color: '#EF4444' }}>*</span>
              </div>
              {eligibleStaff.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#A1A1AA', fontSize: 13 }}>
                  <i className="bi bi-people" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                  No branch staff available to delegate to.
                </div>
              )}
              {eligibleStaff.map((u, i) => {
                const isSelected = selected.includes(u.id)
                return (
                  <div
                    key={u.id}
                    className={`dlg-staff-row${isSelected ? ' selected' : ''}`}
                    onClick={() => toggle(u.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <Avatar name={u.full_name} size={36} index={i} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#09090B' }}>{u.full_name}</div>
                      <div style={{ fontSize: 11, color: '#71717A' }}>{u.role_name ?? 'Staff'}{u.department_name ? ` · ${u.department_name}` : ''}</div>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', border: `2px solid ${isSelected ? '#3B82F6' : '#D4D4D8'}`,
                      background: isSelected ? '#3B82F6' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s',
                    }}>
                      {isSelected && <i className="bi bi-check" style={{ color: '#fff', fontSize: 11 }} />}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Instruction note */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Instruction / Delegation Note <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <p style={{ fontSize: 12, color: '#71717A', margin: '0 0 8px' }}>
                Tell the delegatee(s) exactly what you need them to do, what to deliver, and by when.
              </p>
              <textarea
                rows={4}
                value={note}
                onChange={e => { setNote(e.target.value); if (noteError) setNoteError('') }}
                placeholder="e.g. Please compile all department KPIs and the compliance data. Send me the spreadsheet by Thursday so I can write the final summary..."
                style={{ width: '100%', border: `1.5px solid ${noteError ? '#EF4444' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#FAFAFA', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = '#3B82F6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)' }}
                onBlur={e => { e.target.style.borderColor = noteError ? '#EF4444' : 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none' }}
              />
              {noteError && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{noteError}</div>}
            </div>

            {/* Selected summary */}
            {selected.length > 0 && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-check-circle-fill" style={{ color: '#10B981', fontSize: 14, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#065F46' }}>
                  Delegating to: <strong>{eligibleStaff.filter(u => selected.includes(u.id)).map(u => u.full_name).join(', ')}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 24px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} disabled={isPending} style={{ background: '#F4F4F5', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: '#52525B', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isPending}
              style={{
                background: canSubmit && !isPending ? 'linear-gradient(135deg,#3B82F6,#2563EB)' : '#E4E4E7',
                color: canSubmit && !isPending ? '#fff' : '#A1A1AA',
                border: 'none', borderRadius: 10, padding: '10px 22px',
                fontSize: 13, fontWeight: 700, cursor: canSubmit && !isPending ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: canSubmit && !isPending ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {isPending
                ? <><span className="spinner-border spinner-border-sm" />Delegating...</>
                : <><i className="bi bi-people-fill" />Delegate Task</>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
