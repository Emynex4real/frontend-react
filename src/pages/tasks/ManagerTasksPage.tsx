import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { formatDistanceToNow, format, isPast, isToday } from 'date-fns'
import { tasksApi, usersApi, branchesApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import type { Task, TaskStatus, TaskPriority, TaskType, SubTask, TaskAttachment } from '../../types'
import CreateTaskModal from '../../components/tasks/CreateTaskModal'
import ReviewActionModal from '../../components/tasks/ReviewActionModal'
import SubmitForReviewModal from '../../components/tasks/SubmitForReviewModal'
import DelegateTaskModal from '../../components/tasks/DelegateTaskModal'
import ProgressNoteModal from '../../components/tasks/ProgressNoteModal'

// ─── Config ───────────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: 'todo',           label: 'To Do',          color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'in_progress',    label: 'In Progress',    color: '#F97316', bg: '#FFF7ED' },
  { id: 'in_review',      label: 'In Review',      color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'needs_revision', label: 'Needs Revision', color: '#DC2626', bg: '#FEF2F2' },
  { id: 'done',           label: 'Done',           color: '#10B981', bg: '#ECFDF5' },
]

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: 'Critical', color: '#DC2626', bg: '#FEF2F2', dot: '#DC2626' },
  high:     { label: 'High',     color: '#EA580C', bg: '#FFF7ED', dot: '#F97316' },
  medium:   { label: 'Medium',   color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  low:      { label: 'Low',      color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
}

const TYPE_ICONS: Record<TaskType, string> = {
  general: 'bi-clipboard', compliance: 'bi-shield-check', operations: 'bi-gear',
  hr: 'bi-people', finance: 'bi-currency-dollar', it: 'bi-cpu', sales: 'bi-graph-up-arrow',
}

const AVATAR_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EF4444']

function getFileStyle(type: string, name: string): { icon: string; color: string; bg: string } {
  if (type.startsWith('image/')) return { icon: 'bi-file-image', color: '#EC4899', bg: '#FDF2F8' }
  if (type.startsWith('video/')) return { icon: 'bi-camera-video', color: '#8B5CF6', bg: '#F5F3FF' }
  if (type === 'application/pdf' || name.endsWith('.pdf')) return { icon: 'bi-file-earmark-text', color: '#EF4444', bg: '#FEF2F2' }
  if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return { icon: 'bi-file-earmark-text', color: '#3B82F6', bg: '#EFF6FF' }
  if (type.includes('excel') || type.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) return { icon: 'bi-file-earmark-text', color: '#10B981', bg: '#ECFDF5' }
  if (type.includes('powerpoint') || type.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return { icon: 'bi-file-earmark-text', color: '#F97316', bg: '#FFF7ED' }
  return { icon: 'bi-file-earmark', color: '#71717A', bg: '#F4F4F5' }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function Avatar({ name, size = 26, index = 0 }: { name: string; size?: number; index?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: AVATAR_COLORS[index % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, border: '2px solid #fff', boxSizing: 'border-box' }} title={name}>
      {initials}
    </div>
  )
}

function getDueDateLabel(due?: string) {
  if (!due) return null
  const d = new Date(due)
  if (isPast(d) && !isToday(d)) return { text: `${Math.ceil((Date.now() - d.getTime()) / 86400000)}d overdue`, color: '#DC2626', bg: '#FEF2F2' }
  if (isToday(d)) return { text: 'Due today', color: '#D97706', bg: '#FFFBEB' }
  return { text: format(d, 'MMM d'), color: '#52525B', bg: '#F4F4F5' }
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function ManagerTaskCard({ task, onSelect, isReviewable }: { task: Task; onSelect: (t: Task) => void; isReviewable?: boolean }) {
  const pCfg = PRIORITY_CONFIG[task.priority]
  const due = getDueDateLabel(task.due_date)
  const completedSubs = task.subtasks.filter((s: SubTask) => s.completed).length

  return (
    <div
      onClick={() => onSelect(task)}
      style={{
        background: '#fff', borderRadius: 10, padding: '12px 14px', marginBottom: 8,
        border: isReviewable ? '1px solid #DDD6FE' : task.status === 'needs_revision' ? '1px solid #FECACA' : '1px solid rgba(0,0,0,0.06)',
        borderLeft: `3px solid ${pCfg.dot}`,
        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.18s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
    >
      <div className="d-flex align-items-center gap-2 mb-2">
        <span style={{ fontSize: 10, fontWeight: 700, color: '#52525B', background: '#F4F4F5', padding: '2px 7px', borderRadius: 20 }}>
          <i className={`bi ${TYPE_ICONS[task.type]}`} style={{ fontSize: 10, marginRight: 3 }} />
          {task.type}
        </span>
        {task.scope === 'branch' && <span style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', background: '#EFF6FF', padding: '2px 7px', borderRadius: 20 }}>Branch</span>}
        {isReviewable && <span style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', background: '#F5F3FF', padding: '2px 7px', borderRadius: 20, marginLeft: 'auto' }}>Review</span>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B', lineHeight: 1.4, marginBottom: 8 }}>{task.title}</div>
      {task.subtasks.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ height: 3, background: '#F4F4F5', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(completedSubs / task.subtasks.length) * 100}%`, background: '#10B981', borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 10, color: '#71717A', marginTop: 3 }}>{completedSubs}/{task.subtasks.length} subtasks</div>
        </div>
      )}
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex gap-1">
          <span style={{ fontSize: 10, fontWeight: 700, color: pCfg.color, background: pCfg.bg, padding: '2px 6px', borderRadius: 20 }}>{pCfg.label}</span>
          {due && <span style={{ fontSize: 10, fontWeight: 600, color: due.color, background: due.bg, padding: '2px 6px', borderRadius: 20 }}>{due.text}</span>}
        </div>
        <div className="d-flex">
          {(task.assignee_names ?? []).slice(0, 3).map((name, i) => (
            <div key={i} style={{ marginLeft: i > 0 ? -6 : 0 }}><Avatar name={name} size={20} index={i} /></div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Task Detail Slide Panel (simplified for manager) ────────────────────────

function ManagerDetailPanel({ task, onClose, onApprove, onReject, onToggleSubtask, onAddComment }: {
  task: Task | null
  onClose: () => void
  onApprove: (t: Task) => void
  onReject: (t: Task) => void
  onToggleSubtask: (taskId: number, subtaskId: string) => void
  onAddComment: (taskId: number, body: string) => void
}) {
  const [comment, setComment] = useState('')
  const isVisible = !!task
  const pCfg = task ? PRIORITY_CONFIG[task.priority] : null
  const col = task ? COLUMNS.find(c => c.id === task.status) : null

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1040, background: 'rgba(0,0,0,0.2)', opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none', transition: 'opacity 0.25s', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '95vw', background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', zIndex: 1050, transform: isVisible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif', overflowY: 'auto' }}>
        {task && (
          <>
            {/* Header */}
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex gap-2 flex-wrap">
                  {col && <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: col.bg, padding: '3px 10px', borderRadius: 20 }}>{col.label}</span>}
                  {pCfg && <span style={{ fontSize: 11, fontWeight: 700, color: pCfg.color, background: pCfg.bg, padding: '3px 10px', borderRadius: 20 }}>{pCfg.label}</span>}
                  {task.scope === 'branch' && <span style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', background: '#EFF6FF', padding: '3px 10px', borderRadius: 20 }}>Branch Task</span>}
                </div>
                <button onClick={onClose} style={{ border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#52525B' }}>
                  <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
                </button>
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#09090B', margin: 0, lineHeight: 1.35 }}>{task.title}</h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
              {/* Submission note + approve/reject for in_review */}
              {task.status === 'in_review' && (
                <div style={{ marginBottom: 16 }}>
                  {task.submission_note && (
                    <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#8B5CF6', marginBottom: 3 }}>Submission Note</div>
                      <div style={{ fontSize: 13, color: '#4C1D95', lineHeight: 1.5 }}>{task.submission_note}</div>
                    </div>
                  )}
                  <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#ECFDF5)', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>Ready for your review</div>
                    <div className="d-flex gap-2">
                      <button onClick={() => onReject(task)} style={{ background: '#fff', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <i className="bi bi-x-lg" style={{ marginRight: 5 }} />Reject
                      </button>
                      <button onClick={() => onApprove(task)} style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 8px rgba(16,185,129,0.25)' }}>
                        <i className="bi bi-check-lg" style={{ marginRight: 5 }} />Approve
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Revision reason */}
              {task.status === 'needs_revision' && task.revision_reason && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 3 }}>Revision Required</div>
                  <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>{task.revision_reason}</div>
                </div>
              )}

              {/* Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, background: '#FAFAFA', borderRadius: 10, padding: 14, border: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 4 }}>Assignee(s)</div>
                  <div className="d-flex flex-wrap gap-1">
                    {(task.assignee_names ?? []).map((name, i) => (
                      <div key={i} className="d-flex align-items-center gap-1" style={{ fontSize: 12, fontWeight: 500, color: '#09090B' }}>
                        <Avatar name={name} size={18} index={i} />{name}
                      </div>
                    ))}
                    {(task.assignee_names ?? []).length === 0 && <span style={{ fontSize: 12, color: '#A1A1AA' }}>—</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 4 }}>Due Date</div>
                  <div style={{ fontSize: 12, color: '#09090B', fontWeight: 500 }}>
                    {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 4 }}>Created</div>
                  <div style={{ fontSize: 12, color: '#52525B' }}>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 4 }}>Type</div>
                  <div style={{ fontSize: 12, color: '#09090B', fontWeight: 500 }}>{task.type}</div>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
                  <p style={{ fontSize: 13, color: '#3F3F46', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{task.description}</p>
                </div>
              )}

              {/* Delegation info */}
              {(task.delegated_to ?? []).length > 0 && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="bi bi-people-fill" />Delegated To
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: task.delegate_note ? 10 : 0 }}>
                    {(task.delegated_names ?? []).map((name, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #BFDBFE', borderRadius: 20, padding: '3px 10px 3px 6px' }}>
                        <Avatar name={name} size={20} index={i} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1E40AF' }}>{name}</span>
                      </div>
                    ))}
                  </div>
                  {task.delegate_note && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', marginBottom: 3 }}>Instruction given:</div>
                      <p style={{ fontSize: 12, color: '#1E3A5F', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>"{task.delegate_note}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Progress note */}
              {task.progress_note && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="bi bi-journal-text" />Progress Note
                    {task.progress_note_at && <span style={{ fontWeight: 400, color: '#A1A1AA', fontSize: 10, textTransform: 'none' }}>· {format(new Date(task.progress_note_at), 'MMM d, h:mm a')}{task.progress_note_author ? ` by ${task.progress_note_author}` : ''}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: '#065F46', margin: 0, lineHeight: 1.6 }}>{task.progress_note}</p>
                </div>
              )}

              {/* Structured achievement report (shown after submission) */}
              {task.achievement_summary && (
                <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="bi bi-send-fill" />Achievement Report Submitted
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', marginBottom: 4 }}>Summary</div>
                    <p style={{ fontSize: 13, color: '#3F3F46', margin: 0, lineHeight: 1.6 }}>{task.achievement_summary}</p>
                  </div>
                  {(task.key_outcomes ?? []).length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', marginBottom: 6 }}>Key Outcomes</div>
                      {(task.key_outcomes ?? []).map((o, i) => (
                        <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 4 }}>
                          <i className="bi bi-check-circle-fill" style={{ color: '#10B981', fontSize: 12, marginTop: 2, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: '#3F3F46', lineHeight: 1.5 }}>{o}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {task.challenges_faced && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', marginBottom: 4 }}>Challenges Faced</div>
                      <p style={{ fontSize: 13, color: '#3F3F46', margin: 0, lineHeight: 1.6 }}>{task.challenges_faced}</p>
                    </div>
                  )}
                  {task.revision_response && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309', marginBottom: 4 }}>How Feedback Was Addressed</div>
                      <p style={{ fontSize: 13, color: '#3F3F46', margin: 0, lineHeight: 1.6 }}>{task.revision_response}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Attached Evidence — shown to manager reviewer */}
              {(task.attachments ?? []).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="bi bi-paperclip" style={{ color: '#F97316', fontSize: 13 }} />
                    Attached Evidence
                    <span style={{ background: '#F97316', color: '#fff', borderRadius: 20, padding: '0 6px', fontSize: 10, fontWeight: 800 }}>{(task.attachments ?? []).length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(task.attachments ?? []).map((att: TaskAttachment) => {
                      const fs = getFileStyle(att.type, att.name)
                      const isImage = att.type.startsWith('image/')
                      return (
                        <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: '10px 12px' }}>
                          {isImage && att.url !== '#' ? (
                            <img src={att.url} alt={att.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(0,0,0,0.08)' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: fs.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className={`bi ${fs.icon}`} style={{ fontSize: 18, color: fs.color }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#09090B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                            <div style={{ fontSize: 10, color: '#A1A1AA', marginTop: 2 }}>
                              {formatBytes(att.size)} · {att.uploader_name} · {formatDistanceToNow(new Date(att.uploaded_at), { addSuffix: true })}
                            </div>
                          </div>
                          {att.url !== '#' && (
                            <a href={att.url} download={att.name} target="_blank" rel="noreferrer" style={{ width: 30, height: 30, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }} title="Download">
                              <i className="bi bi-download" style={{ fontSize: 12, color: '#3B82F6' }} />
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Subtasks */}
              {task.subtasks.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#52525B', textTransform: 'uppercase' }}>Subtasks</div>
                    <span style={{ fontSize: 11, color: '#71717A' }}>{task.subtasks.filter((s: SubTask) => s.completed).length}/{task.subtasks.length}</span>
                  </div>
                  <div style={{ height: 4, background: '#F4F4F5', borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${task.subtasks.length ? (task.subtasks.filter((s: SubTask) => s.completed).length / task.subtasks.length) * 100 : 0}%`, background: '#10B981', borderRadius: 4 }} />
                  </div>
                  {task.subtasks.map((s: SubTask) => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: s.completed ? '#F0FDF4' : '#FAFAFA', border: `1px solid ${s.completed ? '#BBF7D0' : 'rgba(0,0,0,0.05)'}`, marginBottom: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={s.completed} onChange={() => onToggleSubtask(task.id, s.id)} style={{ accentColor: '#10B981', width: 15, height: 15, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: s.completed ? '#52525B' : '#09090B', textDecoration: s.completed ? 'line-through' : 'none', flex: 1 }}>{s.title}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Comments */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', marginBottom: 10 }}>Comments ({task.comments.length})</div>
                {task.comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <Avatar name={c.author_name} size={28} index={c.author_id % 6} />
                    <div style={{ flex: 1 }}>
                      <div className="d-flex gap-2 mb-1">
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{c.author_name}</span>
                        <span style={{ fontSize: 11, color: '#A1A1AA' }}>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#3F3F46', background: '#F9F9F9', padding: '8px 10px', borderRadius: 8, lineHeight: 1.5 }}>{c.body}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 12 }}>
                  <Avatar name="Manager" size={28} index={1} />
                  <div style={{ flex: 1 }}>
                    <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." rows={2}
                      style={{ width: '100%', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && comment.trim()) { onAddComment(task.id, comment.trim()); setComment('') } }}
                    />
                    <button onClick={() => { if (comment.trim()) { onAddComment(task.id, comment.trim()); setComment('') } }} disabled={!comment.trim()}
                      style={{ background: comment.trim() ? '#F97316' : '#E4E4E7', color: comment.trim() ? '#fff' : '#A1A1AA', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: comment.trim() ? 'pointer' : 'not-allowed', marginTop: 6 }}>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagerTasksPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'my' | 'board' | 'review'>('my')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<{ task: Task; mode: 'approve' | 'reject' } | null>(null)
  const [submitTarget, setSubmitTarget] = useState<{ task: Task; mode: 'submit' | 'resubmit' } | null>(null)
  const [delegateTarget, setDelegateTarget] = useState<Task | null>(null)
  const [progressTarget, setProgressTarget] = useState<Task | null>(null)
  const [search, setSearch] = useState('')
  const [boardView, setBoardView] = useState<'kanban' | 'list'>('kanban')

  const managerId = user?.id ?? 0
  const branchId = user?.branch_id ?? 0

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['manager-tasks', managerId],
    queryFn: () => tasksApi.getManagerTasks(managerId, branchId),
    staleTime: 30000,
  })
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.getAll(), staleTime: 60000 })
  const { data: branchesData } = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.getAll(), staleTime: 60000 })

  const allTasks: Task[] = useMemo(() => tasksData?.data ?? [], [tasksData])
  const users = useMemo(() => usersData?.data ?? [], [usersData])
  const branches = useMemo(() => branchesData?.data ?? [], [branchesData])

  // My tasks: assigned to me (created by admin or others)
  const myTasks = useMemo(() => allTasks.filter(t => t.assigned_to.includes(managerId) && t.created_by !== managerId), [allTasks, managerId])
  // Tasks I created for my staff
  const boardTasks = useMemo(() => allTasks.filter(t => t.created_by === managerId || (t.scope === 'branch' && t.assigned_branch_id === branchId)), [allTasks, managerId, branchId])
  // Tasks awaiting my review (I created them and they're in_review)
  const reviewTasks = useMemo(() => allTasks.filter(t => t.created_by === managerId && t.status === 'in_review'), [allTasks, managerId])

  // Kanban grouped for board tab
  const kanbanCols = useMemo(() =>
    COLUMNS.reduce((acc, col) => {
      acc[col.id] = boardTasks.filter(t => t.status === col.id)
      return acc
    }, {} as Record<TaskStatus, Task[]>)
  , [boardTasks])

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) => tasksApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manager-tasks', managerId] }),
  })
  const subtaskMutation = useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: number; subtaskId: string }) => tasksApi.toggleSubtask(taskId, subtaskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manager-tasks', managerId] }),
  })
  const commentMutation = useMutation({
    mutationFn: ({ taskId, body }: { taskId: number; body: string }) => tasksApi.addComment(taskId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manager-tasks', managerId] }),
  })
  const approveMutation = useMutation({
    mutationFn: (id: number) => tasksApi.approve(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manager-tasks', managerId] }); setReviewTarget(null) },
  })
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => tasksApi.reject(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manager-tasks', managerId] }); setReviewTarget(null) },
  })
  const submitMutation = useMutation({
    mutationFn: ({ id, summary, outcomes, challenges, revisionResponse }: { id: number; summary: string; outcomes: string[]; challenges: string; revisionResponse: string }) =>
      tasksApi.submitForReview(id, summary, outcomes, challenges, revisionResponse, []),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manager-tasks', managerId] }); setSubmitTarget(null) },
  })
  const resubmitMutation = useMutation({
    mutationFn: ({ id, summary, outcomes, challenges, revisionResponse }: { id: number; summary: string; outcomes: string[]; challenges: string; revisionResponse: string }) =>
      tasksApi.resubmit(id, summary, outcomes, challenges, revisionResponse),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manager-tasks', managerId] }); setSubmitTarget(null) },
  })
  const delegateMutation = useMutation({
    mutationFn: ({ id, userIds, userNames, note }: { id: number; userIds: number[]; userNames: string[]; note: string }) =>
      tasksApi.delegate(id, userIds, userNames, note),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['manager-tasks', managerId] }); setDelegateTarget(null) },
  })
  const progressNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => tasksApi.addProgressNote(id, note),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['manager-tasks', managerId] })
      setProgressTarget(null)
      // refresh selected task panel if open
      setSelectedTask(prev => prev?.id === vars.id ? { ...prev, progress_note: vars.note, progress_note_at: new Date().toISOString(), progress_note_author: user?.full_name } : prev)
    },
  })

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const taskId = parseInt(result.draggableId)
    const newStatus = result.destination.droppableId as TaskStatus
    const task = allTasks.find(t => t.id === taskId)
    if (task && task.status !== newStatus) statusMutation.mutate({ id: taskId, status: newStatus })
  }

  const branchStaff = useMemo(() => users.filter(u => u.branch_id === branchId || u.branch_id === undefined), [users, branchId])

  const firstName = user?.full_name?.split(' ')[0] ?? 'Manager'
  const branchName = user?.branch_name ?? 'Your Branch'

  return (
    <>
      <style>{`
        .mgt-tab-btn {
          padding: 10px 20px; border: none; background: transparent;
          font-size: 13px; font-weight: 600; color: #71717A;
          border-bottom: 2px solid transparent; cursor: pointer;
          transition: all 0.15s; white-space: nowrap;
        }
        .mgt-tab-btn.active { color: #F97316; border-color: #F97316; }
        .mgt-tab-btn:hover:not(.active) { color: #09090B; }
        .mgt-my-row {
          background: #fff; border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.06);
          padding: 14px 18px; margin-bottom: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          transition: box-shadow 0.18s;
          cursor: pointer;
        }
        .mgt-my-row:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
        .kanban-col-mgr {
          background: rgba(0,0,0,0.02); border-radius: 12px;
          min-width: 230px; width: 230px; flex-shrink: 0;
          display: flex; flex-direction: column;
          max-height: calc(100vh - 220px);
        }
        .kanban-col-body-mgr { flex:1; overflow-y:auto; padding: 4px 8px 8px; min-height: 60px; }
        .kanban-col-body-mgr::-webkit-scrollbar { width: 3px; }
        .kanban-col-body-mgr::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
        .mgt-page-wrap {
          margin: -28px -32px;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 64px);
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          background: #F8F8FB;
        }
        .mgt-content-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 24px 28px 32px;
        }
        .mgt-content-scroll::-webkit-scrollbar { width: 5px; }
        .mgt-content-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        @media (max-width: 991px) {
          .mgt-page-wrap { margin: -16px -12px; height: calc(100vh - 64px); }
        }
      `}</style>

      <div className="mgt-page-wrap">
        {/* Header — always visible, no sticky overlap */}
        <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '20px 28px 0', flexShrink: 0 }}>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#3B82F6,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-kanban text-white" style={{ fontSize: 14 }} />
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: '#09090B', margin: 0 }}>Tasks — {branchName}</h1>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#71717A' }}>Hey {firstName} — manage and review your branch tasks</p>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              style={{ background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(59,130,246,0.25)' }}
            >
              <i className="bi bi-plus-lg" />Assign Task
            </button>
          </div>
          {/* Tabs */}
          <div className="d-flex">
            <button className={`mgt-tab-btn ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>
              <i className="bi bi-person-fill" style={{ marginRight: 5 }} />My Tasks ({myTasks.length})
            </button>
            <button className={`mgt-tab-btn ${tab === 'board' ? 'active' : ''}`} onClick={() => setTab('board')}>
              <i className="bi bi-kanban" style={{ marginRight: 5 }} />Branch Board ({boardTasks.filter(t => t.status !== 'done').length})
            </button>
            <button className={`mgt-tab-btn ${tab === 'review' ? 'active' : ''}`} onClick={() => setTab('review')}>
              <i className="bi bi-eye-fill" style={{ marginRight: 5 }} />Pending Review
              {reviewTasks.length > 0 && <span style={{ marginLeft: 6, background: '#8B5CF6', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>{reviewTasks.length}</span>}
            </button>
          </div>
        </div>

        <div className="mgt-content-scroll">

          {/* ── My Tasks Tab ── */}
          {tab === 'my' && (
            <div>
              {isLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#A1A1AA' }}><span className="spinner-border spinner-border-sm" /></div>}
              {!isLoading && myTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#A1A1AA' }}>
                  <i className="bi bi-inbox" style={{ fontSize: 40, display: 'block', marginBottom: 10 }} />
                  <div style={{ fontSize: 15, fontWeight: 600 }}>No tasks assigned to you</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Tasks assigned to you by the Admin will appear here.</div>
                </div>
              )}
              {myTasks.map(task => {
                const st = COLUMNS.find(c => c.id === task.status)
                const due = getDueDateLabel(task.due_date)
                const canStart    = task.status === 'todo' || task.status === 'backlog'
                const canSubmit   = task.status === 'in_progress'
                const canResubmit = task.status === 'needs_revision'
                const isDelegated = (task.delegated_to ?? []).length > 0
                const hasPNote    = !!task.progress_note
                return (
                  <div key={task.id} className="mgt-my-row" onClick={() => setSelectedTask(task)}>
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title row */}
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#09090B' }}>{task.title}</span>
                          {st && <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 20 }}>{st.label}</span>}
                          {due && <span style={{ fontSize: 10, fontWeight: 600, color: due.color, background: due.bg, padding: '2px 8px', borderRadius: 20 }}>{due.text}</span>}
                          {/* Delegation badge */}
                          {isDelegated && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <i className="bi bi-people-fill" style={{ fontSize: 9 }} />
                              Delegated → {(task.delegated_names ?? []).join(', ')}
                            </span>
                          )}
                          {/* Progress note badge */}
                          {hasPNote && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <i className="bi bi-journal-check" style={{ fontSize: 9 }} />Note logged
                            </span>
                          )}
                        </div>
                        {/* Revision reason */}
                        {task.status === 'needs_revision' && task.revision_reason && (
                          <div style={{ fontSize: 12, color: '#7F1D1D', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, padding: '5px 9px', marginTop: 4, display: 'inline-flex', gap: 5 }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#DC2626', flexShrink: 0 }} />
                            {task.revision_reason}
                          </div>
                        )}
                        {/* Progress note preview */}
                        {task.progress_note && (
                          <div style={{ fontSize: 12, color: '#3F3F46', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 7, padding: '5px 9px', marginTop: 4, display: 'flex', gap: 5 }}>
                            <i className="bi bi-journal-text" style={{ color: '#10B981', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{task.progress_note}</span>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 5 }}>
                          Assigned by <strong>{task.creator_name}</strong> · {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="d-flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                        {canStart && (
                          <button onClick={() => statusMutation.mutate({ id: task.id, status: 'in_progress' })}
                            style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="bi bi-play-fill" />Start
                          </button>
                        )}
                        {(canStart || canSubmit) && (
                          <button onClick={() => setDelegateTarget(task)}
                            style={{ background: isDelegated ? '#EFF6FF' : '#F4F4F5', color: isDelegated ? '#2563EB' : '#52525B', border: `1px solid ${isDelegated ? '#BFDBFE' : 'rgba(0,0,0,0.08)'}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="bi bi-people" />{isDelegated ? 'Delegated' : 'Delegate'}
                          </button>
                        )}
                        {canSubmit && (
                          <button onClick={() => setProgressTarget(task)}
                            style={{ background: hasPNote ? '#ECFDF5' : '#F4F4F5', color: hasPNote ? '#059669' : '#52525B', border: `1px solid ${hasPNote ? '#BBF7D0' : 'rgba(0,0,0,0.08)'}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="bi bi-journal-text" />{hasPNote ? 'Update Note' : 'Progress Note'}
                          </button>
                        )}
                        {canSubmit && (
                          <button onClick={() => setSubmitTarget({ task, mode: 'submit' })}
                            style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="bi bi-send" />Submit for Review
                          </button>
                        )}
                        {canResubmit && (
                          <button onClick={() => setSubmitTarget({ task, mode: 'resubmit' })}
                            style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="bi bi-arrow-repeat" />Resubmit
                          </button>
                        )}
                        {task.status === 'in_review' && (
                          <span style={{ fontSize: 11, color: '#8B5CF6', background: '#F5F3FF', padding: '6px 10px', borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="bi bi-hourglass-split" />Awaiting Review
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Branch Board Tab ── */}
          {tab === 'board' && (
            <div>
              <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
                <div className="d-flex align-items-center gap-3">
                  <div style={{ position: 'relative' }}>
                    <i className="bi bi-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#A1A1AA', fontSize: 12 }} />
                    <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '7px 12px 7px 28px', fontSize: 12, outline: 'none', width: 200, background: '#fff' }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#A1A1AA' }}>{boardTasks.length} tasks</span>
                </div>
                {/* View toggle */}
                <div style={{ display: 'flex', background: '#F4F4F5', borderRadius: 9, padding: 3, gap: 2 }}>
                  <button
                    onClick={() => setBoardView('kanban')}
                    style={{ background: boardView === 'kanban' ? '#fff' : 'transparent', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: boardView === 'kanban' ? '#09090B' : '#71717A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: boardView === 'kanban' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}
                  >
                    <i className="bi bi-kanban" style={{ fontSize: 12 }} />Kanban
                  </button>
                  <button
                    onClick={() => setBoardView('list')}
                    style={{ background: boardView === 'list' ? '#fff' : 'transparent', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: boardView === 'list' ? '#09090B' : '#71717A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: boardView === 'list' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}
                  >
                    <i className="bi bi-list-ul" style={{ fontSize: 12 }} />List
                  </button>
                </div>
              </div>

              {/* ── List View ── */}
              {boardView === 'list' && (
                <div>
                  {COLUMNS.map(col => {
                    const colTasks = (kanbanCols[col.id] ?? []).filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
                    if (colTasks.length === 0) return null
                    return (
                      <div key={col.id} style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#09090B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: col.bg, padding: '1px 8px', borderRadius: 20 }}>{colTasks.length}</span>
                        </div>
                        {colTasks.map(task => {
                          const pCfg = PRIORITY_CONFIG[task.priority]
                          const due = getDueDateLabel(task.due_date)
                          return (
                            <div
                              key={task.id}
                              className="mgt-my-row"
                              onClick={() => setSelectedTask(task)}
                              style={{ borderLeft: `3px solid ${pCfg.dot}` }}
                            >
                              <div className="d-flex align-items-center gap-3 flex-wrap">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#09090B' }}>{task.title}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: pCfg.color, background: pCfg.bg, padding: '2px 8px', borderRadius: 20 }}>{pCfg.label}</span>
                                    {due && <span style={{ fontSize: 10, fontWeight: 600, color: due.color, background: due.bg, padding: '2px 8px', borderRadius: 20 }}>{due.text}</span>}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11, color: '#A1A1AA' }}>
                                      <i className={`bi ${TYPE_ICONS[task.type]}`} style={{ marginRight: 3 }} />{task.type}
                                    </span>
                                    {task.subtasks.length > 0 && (
                                      <span style={{ fontSize: 11, color: '#71717A' }}>
                                        <i className="bi bi-check2-square" style={{ marginRight: 3 }} />
                                        {task.subtasks.filter((s: SubTask) => s.completed).length}/{task.subtasks.length} subtasks
                                      </span>
                                    )}
                                    <div className="d-flex" style={{ marginLeft: 4 }}>
                                      {(task.assignee_names ?? []).slice(0, 3).map((name, i) => (
                                        <div key={i} style={{ marginLeft: i > 0 ? -6 : 0 }}><Avatar name={name} size={18} index={i} /></div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="d-flex gap-2" onClick={e => e.stopPropagation()}>
                                  {task.status === 'in_review' && task.created_by === managerId && (
                                    <>
                                      <button onClick={() => setReviewTarget({ task, mode: 'reject' })} style={{ background: '#fff', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                        <i className="bi bi-x-lg" style={{ marginRight: 4 }} />Reject
                                      </button>
                                      <button onClick={() => setReviewTarget({ task, mode: 'approve' })} style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                        <i className="bi bi-check-lg" style={{ marginRight: 4 }} />Approve
                                      </button>
                                    </>
                                  )}
                                  {task.status === 'needs_revision' && (
                                    <span style={{ fontSize: 11, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '6px 10px', borderRadius: 8, fontWeight: 600 }}>
                                      <i className="bi bi-arrow-counterclockwise" style={{ marginRight: 4 }} />Needs Revision
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                  {boardTasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#A1A1AA' }}>
                      <i className="bi bi-inbox" style={{ fontSize: 40, display: 'block', marginBottom: 10 }} />
                      <div style={{ fontSize: 15, fontWeight: 600 }}>No tasks found</div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Kanban View ── */}
              {boardView === 'kanban' && (
              <DragDropContext onDragEnd={onDragEnd}>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
                  {COLUMNS.map(col => {
                    const colTasks = (kanbanCols[col.id] ?? []).filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
                    return (
                      <div key={col.id} className="kanban-col-mgr">
                        <div style={{ padding: '10px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div className="d-flex align-items-center gap-2">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#09090B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: col.color, background: col.bg, padding: '1px 6px', borderRadius: 20 }}>{colTasks.length}</span>
                          </div>
                        </div>
                        <Droppable droppableId={col.id}>
                          {(provided, snap) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="kanban-col-body-mgr" style={{ background: snap.isDraggingOver ? 'rgba(249,115,22,0.04)' : undefined }}>
                              {colTasks.map((task, idx) => (
                                <Draggable key={task.id} draggableId={String(task.id)} index={idx}>
                                  {(prov) => (
                                    <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                                      <ManagerTaskCard task={task} onSelect={setSelectedTask} isReviewable={task.status === 'in_review' && task.created_by === managerId} />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              {colTasks.length === 0 && !snap.isDraggingOver && (
                                <div style={{ textAlign: 'center', padding: '20px 0', color: '#D4D4D8', fontSize: 11 }}><i className="bi bi-inbox" style={{ fontSize: 18, display: 'block', marginBottom: 4 }} />Empty</div>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )
                  })}
                </div>
              </DragDropContext>
              )}
            </div>
          )}

          {/* ── Pending Review Tab ── */}
          {tab === 'review' && (
            <div>
              {reviewTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#A1A1AA' }}>
                  <i className="bi bi-check-circle" style={{ fontSize: 40, display: 'block', marginBottom: 10 }} />
                  <div style={{ fontSize: 15, fontWeight: 600 }}>All caught up!</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>No tasks are waiting for your review right now.</div>
                </div>
              )}
              {reviewTasks.map(task => {
                const pCfg = PRIORITY_CONFIG[task.priority]
                const due = getDueDateLabel(task.due_date)
                return (
                  <div key={task.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #DDD6FE', padding: '14px 18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="d-flex align-items-start gap-3 flex-wrap">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#09090B' }}>{task.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', background: '#F5F3FF', padding: '2px 8px', borderRadius: 20 }}>In Review</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: pCfg.color, background: pCfg.bg, padding: '2px 8px', borderRadius: 20 }}>{pCfg.label}</span>
                          {due && <span style={{ fontSize: 10, fontWeight: 600, color: due.color, background: due.bg, padding: '2px 8px', borderRadius: 20 }}>{due.text}</span>}
                        </div>
                        {task.submission_note && (
                          <div style={{ fontSize: 12, color: '#4C1D95', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 7, padding: '5px 9px', marginTop: 6, display: 'flex', gap: 5 }}>
                            <i className="bi bi-send-fill" style={{ color: '#8B5CF6', flexShrink: 0 }} />
                            <span><strong>Note:</strong> {task.submission_note}</span>
                          </div>
                        )}
                        <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                          {(task.assignee_names ?? []).map((n, i) => <div key={i} className="d-flex align-items-center gap-1" style={{ fontSize: 11, color: '#52525B' }}><Avatar name={n} size={18} index={i} />{n}</div>)}
                          <span style={{ fontSize: 11, color: '#A1A1AA' }}>submitted {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button onClick={() => setReviewTarget({ task, mode: 'reject' })} style={{ background: '#fff', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          <i className="bi bi-x-lg" style={{ marginRight: 5 }} />Reject
                        </button>
                        <button onClick={() => setReviewTarget({ task, mode: 'approve' })} style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 8px rgba(16,185,129,0.25)' }}>
                          <i className="bi bi-check-lg" style={{ marginRight: 5 }} />Approve
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <ManagerDetailPanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onApprove={t => setReviewTarget({ task: t, mode: 'approve' })}
        onReject={t => setReviewTarget({ task: t, mode: 'reject' })}
        onToggleSubtask={(taskId, subtaskId) => subtaskMutation.mutate({ taskId, subtaskId })}
        onAddComment={(taskId, body) => commentMutation.mutate({ taskId, body })}
      />

      {/* Create Task Modal (branch-scoped) */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        users={branchStaff}
        branches={branches.filter(b => b.id === branchId)}
        editingTask={null}
        scopeLocked="individual"
        branchLocked={branchId}
      />

      {/* Review Modal */}
      {reviewTarget && (
        <ReviewActionModal
          task={reviewTarget.task}
          mode={reviewTarget.mode}
          onClose={() => setReviewTarget(null)}
          onApprove={id => approveMutation.mutate(id)}
          onReject={(id, reason) => rejectMutation.mutate({ id, reason })}
          isPending={approveMutation.isPending || rejectMutation.isPending}
        />
      )}

      {/* Submit / Resubmit Achievement Modal */}
      {submitTarget && (
        <SubmitForReviewModal
          task={submitTarget.task}
          mode={submitTarget.mode}
          onClose={() => setSubmitTarget(null)}
          onSubmit={(summary, outcomes, challenges, revisionResponse) => {
            if (submitTarget.mode === 'submit')
              submitMutation.mutate({ id: submitTarget.task.id, summary, outcomes, challenges, revisionResponse })
            else
              resubmitMutation.mutate({ id: submitTarget.task.id, summary, outcomes, challenges, revisionResponse })
          }}
          isPending={submitMutation.isPending || resubmitMutation.isPending}
        />
      )}

      {/* Delegate Modal */}
      {delegateTarget && (
        <DelegateTaskModal
          task={delegateTarget}
          branchStaff={branchStaff}
          currentUserId={managerId}
          onClose={() => setDelegateTarget(null)}
          onDelegate={(userIds, userNames, note) =>
            delegateMutation.mutate({ id: delegateTarget.id, userIds, userNames, note })
          }
          isPending={delegateMutation.isPending}
        />
      )}

      {/* Progress Note Modal */}
      {progressTarget && (
        <ProgressNoteModal
          task={progressTarget}
          onClose={() => setProgressTarget(null)}
          onSave={note => progressNoteMutation.mutate({ id: progressTarget.id, note })}
          isPending={progressNoteMutation.isPending}
        />
      )}
    </>
  )
}
