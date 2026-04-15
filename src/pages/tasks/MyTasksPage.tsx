import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, format, isPast, isToday } from 'date-fns'
import { tasksApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import type { Task, TaskStatus, TaskPriority, TaskType, AuthUser } from '../../types'
import SubmitForReviewModal from '../../components/tasks/SubmitForReviewModal'

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; icon: string }> = {
  backlog:        { label: 'Backlog',        color: '#71717A', bg: '#F4F4F5',  icon: 'bi-inbox' },
  todo:           { label: 'To Do',          color: '#3B82F6', bg: '#EFF6FF',  icon: 'bi-circle' },
  in_progress:    { label: 'In Progress',    color: '#F97316', bg: '#FFF7ED',  icon: 'bi-play-circle-fill' },
  in_review:      { label: 'In Review',      color: '#8B5CF6', bg: '#F5F3FF',  icon: 'bi-eye-fill' },
  needs_revision: { label: 'Needs Revision', color: '#DC2626', bg: '#FEF2F2',  icon: 'bi-exclamation-triangle-fill' },
  done:           { label: 'Done',           color: '#10B981', bg: '#ECFDF5',  icon: 'bi-check-circle-fill' },
  cancelled:      { label: 'Cancelled',      color: '#A1A1AA', bg: '#F4F4F5',  icon: 'bi-x-circle' },
}

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

function getDueDateLabel(due?: string) {
  if (!due) return null
  const d = new Date(due)
  if (isPast(d) && !isToday(d)) return { text: `${Math.ceil((Date.now() - d.getTime()) / 86400000)}d overdue`, color: '#DC2626', bg: '#FEF2F2' }
  if (isToday(d)) return { text: 'Due today', color: '#D97706', bg: '#FFFBEB' }
  return { text: format(d, 'MMM d'), color: '#52525B', bg: '#F4F4F5' }
}

const FILTER_TABS: { key: string; label: string; icon: string }[] = [
  { key: 'all',            label: 'All Tasks',       icon: 'bi-list-ul' },
  { key: 'active',         label: 'Active',          icon: 'bi-play-circle' },
  { key: 'needs_revision', label: 'Needs Revision',  icon: 'bi-exclamation-triangle' },
  { key: 'in_review',      label: 'In Review',       icon: 'bi-eye' },
  { key: 'done',           label: 'Done',            icon: 'bi-check-circle' },
]

const AVATAR_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EF4444']

function Avatar({ name, size = 28, index = 0 }: { name: string; size?: number; index?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: AVATAR_COLORS[index % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

// ─── Staff Detail Panel ───────────────────────────────────────────────────────

function StaffDetailPanel({ task, currentUser, onClose, onAddComment }: {
  task: Task | null
  currentUser: AuthUser
  onClose: () => void
  onAddComment: (taskId: number, body: string) => void
}) {
  const [tab, setTab] = useState<'details' | 'comments' | 'activity'>('details')
  const [comment, setComment] = useState('')
  const isVisible = !!task
  const stCfg = task ? STATUS_CONFIG[task.status] : null
  const prCfg = task ? PRIORITY_CONFIG[task.priority] : null
  const isDelegatedToMe = task ? (task.delegated_to ?? []).includes(currentUser.id) : false

  const ACTION_ICONS: Record<string, string> = {
    created: 'bi-plus-circle', status_changed: 'bi-arrow-repeat', assigned: 'bi-person-plus',
    commented: 'bi-chat', priority_changed: 'bi-flag', due_date_changed: 'bi-calendar',
    subtask_completed: 'bi-check2-square', edited: 'bi-pencil',
  }

  const handleSendComment = () => {
    if (!task || !comment.trim()) return
    onAddComment(task.id, comment.trim())
    setComment('')
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1040, background: 'rgba(0,0,0,0.2)', opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none', transition: 'opacity 0.25s', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, maxWidth: '95vw', background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', zIndex: 1050, transform: isVisible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif' }}>
        {task && (
          <>
            {/* Header */}
            <div style={{ padding: '18px 22px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex gap-2 flex-wrap">
                  {stCfg && <span style={{ fontSize: 11, fontWeight: 700, color: stCfg.color, background: stCfg.bg, padding: '3px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}><i className={`bi ${stCfg.icon}`} style={{ fontSize: 10 }} />{stCfg.label}</span>}
                  {prCfg && <span style={{ fontSize: 11, fontWeight: 700, color: prCfg.color, background: prCfg.bg, padding: '3px 10px', borderRadius: 20 }}>{prCfg.label}</span>}
                  {isDelegatedToMe && <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', padding: '3px 10px', borderRadius: 20 }}><i className="bi bi-person-check-fill" style={{ marginRight: 4 }} />Delegated to you</span>}
                </div>
                <button onClick={onClose} style={{ border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#52525B', flexShrink: 0 }}>
                  <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
                </button>
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#09090B', margin: '0 0 14px', lineHeight: 1.35 }}>{task.title}</h2>
              {/* Tabs */}
              <div className="d-flex" style={{ gap: 0 }}>
                {(['details', 'comments', 'activity'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 16px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: tab === t ? '#F97316' : '#71717A', borderBottom: `2px solid ${tab === t ? '#F97316' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                    {t === 'comments' ? `Comments (${task.comments.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

              {/* ── Details Tab ── */}
              {tab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Delegation instruction — most important context for the staff member */}
                  {isDelegatedToMe && task.delegate_note && (
                    <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#3B82F6,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="bi bi-person-check-fill" style={{ fontSize: 14, color: '#fff' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#1E40AF' }}>Delegated to you by your manager</div>
                          {task.delegated_at && <div style={{ fontSize: 11, color: '#3B82F6' }}>{formatDistanceToNow(new Date(task.delegated_at), { addSuffix: true })}</div>}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>What you need to do:</div>
                      <p style={{ fontSize: 13, color: '#1e3a5f', margin: 0, lineHeight: 1.7, background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #BFDBFE', fontStyle: 'italic' }}>"{task.delegate_note}"</p>
                    </div>
                  )}

                  {/* Revision reason */}
                  {task.status === 'needs_revision' && task.revision_reason && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="bi bi-exclamation-triangle-fill" />Revision Required
                      </div>
                      <p style={{ fontSize: 13, color: '#7F1D1D', margin: 0, lineHeight: 1.6 }}>{task.revision_reason}</p>
                    </div>
                  )}

                  {/* Achievement report — shown after submission */}
                  {task.achievement_summary && (
                    <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="bi bi-send-fill" />Your Submission
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', marginBottom: 4 }}>Summary</div>
                        <p style={{ fontSize: 13, color: '#3F3F46', margin: 0, lineHeight: 1.6 }}>{task.achievement_summary}</p>
                      </div>
                      {(task.key_outcomes ?? []).length > 0 && (
                        <div style={{ marginBottom: 8 }}>
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
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', marginBottom: 4 }}>Challenges Faced</div>
                          <p style={{ fontSize: 13, color: '#3F3F46', margin: 0, lineHeight: 1.6 }}>{task.challenges_faced}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#FAFAFA', borderRadius: 10, padding: 14, border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 4 }}>From</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#09090B' }}>{task.creator_name ?? '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 4 }}>Due Date</div>
                      <div style={{ fontSize: 12, color: '#09090B', fontWeight: 500 }}>{task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 4 }}>Type</div>
                      <div style={{ fontSize: 12, color: '#52525B', fontWeight: 500, textTransform: 'capitalize' }}>{task.type}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 4 }}>Created</div>
                      <div style={{ fontSize: 12, color: '#52525B' }}>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</div>
                    </div>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
                      <p style={{ fontSize: 13, color: '#3F3F46', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{task.description}</p>
                    </div>
                  )}

                  {/* Subtasks — read-only for staff */}
                  {task.subtasks.length > 0 && (
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525B', textTransform: 'uppercase' }}>Subtasks</div>
                        <span style={{ fontSize: 11, color: '#71717A' }}>{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                      </div>
                      <div style={{ height: 4, background: '#F4F4F5', borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${task.subtasks.length ? (task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100 : 0}%`, background: '#10B981', borderRadius: 4 }} />
                      </div>
                      {task.subtasks.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: s.completed ? '#F0FDF4' : '#FAFAFA', border: `1px solid ${s.completed ? '#BBF7D0' : 'rgba(0,0,0,0.05)'}`, marginBottom: 6 }}>
                          <i className={`bi ${s.completed ? 'bi-check-circle-fill' : 'bi-circle'}`} style={{ color: s.completed ? '#10B981' : '#D4D4D8', fontSize: 14, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: s.completed ? '#52525B' : '#09090B', textDecoration: s.completed ? 'line-through' : 'none', flex: 1 }}>{s.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Comments Tab ── */}
              {tab === 'comments' && (
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
                  <div style={{ flex: 1 }}>
                    {task.comments.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#A1A1AA' }}>
                        <i className="bi bi-chat" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No comments yet</div>
                        <div style={{ fontSize: 13 }}>Ask a question or leave an update for your manager.</div>
                      </div>
                    )}
                    {task.comments.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                        <Avatar name={c.author_name} size={30} index={c.author_id % 6} />
                        <div style={{ flex: 1 }}>
                          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#09090B' }}>{c.author_name}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#71717A', background: '#F4F4F5', padding: '1px 7px', borderRadius: 20 }}>{c.author_role}</span>
                            <span style={{ fontSize: 11, color: '#A1A1AA' }}>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#3F3F46', background: '#F9F9F9', padding: '10px 12px', borderRadius: 10, lineHeight: 1.6, border: '1px solid rgba(0,0,0,0.05)' }}>{c.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comment input */}
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16, marginTop: 8 }}>
                    <div className="d-flex gap-2 align-items-start">
                      <Avatar name={currentUser.full_name} size={30} index={currentUser.id % 6} />
                      <div style={{ flex: 1 }}>
                        <textarea
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          placeholder="Ask a question or leave an update... (Ctrl+Enter to send)"
                          rows={3}
                          style={{ width: '100%', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '10px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', background: '#FAFAFA', boxSizing: 'border-box', lineHeight: 1.5 }}
                          onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)' }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none' }}
                          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && comment.trim()) handleSendComment() }}
                        />
                        <div className="d-flex justify-content-between align-items-center" style={{ marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: '#A1A1AA' }}>Visible to your manager and task creator</span>
                          <button
                            onClick={handleSendComment}
                            disabled={!comment.trim()}
                            style={{ background: comment.trim() ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#E4E4E7', color: comment.trim() ? '#fff' : '#A1A1AA', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: comment.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5, boxShadow: comment.trim() ? '0 2px 8px rgba(249,115,22,0.25)' : 'none', transition: 'all 0.2s' }}
                          >
                            <i className="bi bi-send" />Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Activity Tab ── */}
              {tab === 'activity' && (
                <div>
                  {task.activity.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#A1A1AA' }}>
                      <i className="bi bi-clock-history" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
                      <div style={{ fontSize: 13 }}>No activity yet.</div>
                    </div>
                  )}
                  {task.activity.map(a => (
                    <div key={a.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`bi ${ACTION_ICONS[a.action] ?? 'bi-activity'}`} style={{ fontSize: 12, color: '#71717A' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#3F3F46', lineHeight: 1.5 }}>
                          <strong>{a.actor_name}</strong>{' '}
                          {a.action === 'status_changed' ? `changed status to "${a.to_value}"` :
                            a.action === 'commented' ? `commented: "${a.to_value}"` :
                            a.action === 'created' ? 'created this task' :
                            a.action === 'assigned' ? 'was assigned' :
                            a.action}
                        </div>
                        <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2 }}>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function MyTaskRow({ task, userId, onAction, onView }: {
  task: Task
  userId: number
  onAction: (t: Task, action: string) => void
  onView: (t: Task) => void
}) {
  const st = STATUS_CONFIG[task.status]
  const pr = PRIORITY_CONFIG[task.priority]
  const due = getDueDateLabel(task.due_date)
  const completedSubs = task.subtasks.filter(s => s.completed).length
  const isDelegatedToMe = (task.delegated_to ?? []).includes(userId)

  const canStart = task.status === 'todo' || task.status === 'backlog'
  const canSubmit = task.status === 'in_progress'
  const canResubmit = task.status === 'needs_revision'

  return (
    <div
      style={{ background: '#fff', borderRadius: 12, border: task.status === 'needs_revision' ? '1px solid #FECACA' : isDelegatedToMe ? '1px solid #BFDBFE' : '1px solid rgba(0,0,0,0.06)', padding: '14px 18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'box-shadow 0.18s' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)')}
    >
      <div className="d-flex align-items-start gap-3 flex-wrap">
        {/* Left: type icon */}
        <div style={{ width: 36, height: 36, borderRadius: 9, background: '#F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <i className={`bi ${TYPE_ICONS[task.type]}`} style={{ fontSize: 16, color: '#71717A' }} />
        </div>

        {/* Center: main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
            <button onClick={() => onView(task)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#09090B', textAlign: 'left' }}>
              {task.title}
            </button>
            {task.scope === 'branch' && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', background: '#EFF6FF', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                <i className="bi bi-buildings" style={{ fontSize: 9, marginRight: 3 }} />Branch Task
              </span>
            )}
            {isDelegatedToMe && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', background: '#DBEAFE', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                <i className="bi bi-person-check-fill" style={{ fontSize: 9, marginRight: 3 }} />Delegated to you
              </span>
            )}
            {task.comments.length > 0 && (
              <span style={{ fontSize: 11, color: '#71717A', display: 'flex', alignItems: 'center', gap: 3 }}>
                <i className="bi bi-chat" style={{ fontSize: 10 }} />{task.comments.length}
              </span>
            )}
          </div>

          {/* Revision reason banner */}
          {task.status === 'needs_revision' && task.revision_reason && (
            <div style={{ fontSize: 12, color: '#7F1D1D', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 10px', marginBottom: 8, display: 'flex', gap: 6 }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
              <span><strong>Revision needed:</strong> {task.revision_reason}</span>
            </div>
          )}

          {/* Delegation instruction preview */}
          {isDelegatedToMe && task.delegate_note && (
            <div style={{ fontSize: 12, color: '#1E40AF', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '6px 10px', marginBottom: 8, display: 'flex', gap: 6 }}>
              <i className="bi bi-person-check-fill" style={{ color: '#3B82F6', flexShrink: 0, marginTop: 1 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Instruction:</strong> {task.delegate_note}</span>
            </div>
          )}

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Status */}
            <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className={`bi ${st.icon}`} style={{ fontSize: 10 }} />{st.label}
            </span>
            {/* Priority */}
            <span style={{ fontSize: 11, fontWeight: 600, color: pr.color, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: pr.dot }} />{pr.label}
            </span>
            {/* Due */}
            {due && <span style={{ fontSize: 11, fontWeight: 600, color: due.color, background: due.bg, padding: '2px 8px', borderRadius: 20 }}>{due.text}</span>}
            {/* Subtasks */}
            {task.subtasks.length > 0 && (
              <span style={{ fontSize: 11, color: '#71717A' }}>
                <i className="bi bi-check2-square" style={{ marginRight: 3 }} />{completedSubs}/{task.subtasks.length}
              </span>
            )}
            {/* Created by */}
            <span style={{ fontSize: 11, color: '#A1A1AA' }}>
              from <strong>{task.creator_name}</strong> · {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="d-flex gap-2 align-items-center flex-wrap" style={{ flexShrink: 0 }}>
          {/* View details button */}
          <button
            onClick={() => onView(task)}
            style={{ background: '#F4F4F5', color: '#52525B', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <i className="bi bi-eye" />View
          </button>
          {canStart && (
            <button
              onClick={() => onAction(task, 'start')}
              style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(249,115,22,0.25)' }}
            >
              <i className="bi bi-play-fill" />Start Task
            </button>
          )}
          {canSubmit && (
            <button
              onClick={() => onAction(task, 'submit')}
              style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }}
            >
              <i className="bi bi-send" />Submit for Review
            </button>
          )}
          {canResubmit && (
            <button
              onClick={() => onAction(task, 'resubmit')}
              style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(249,115,22,0.25)' }}
            >
              <i className="bi bi-arrow-repeat" />Resubmit
            </button>
          )}
          {task.status === 'in_review' && (
            <span style={{ fontSize: 11, color: '#8B5CF6', background: '#F5F3FF', padding: '6px 12px', borderRadius: 8, fontWeight: 600 }}>
              <i className="bi bi-hourglass-split" style={{ marginRight: 5 }} />Awaiting Review
            </span>
          )}
          {task.status === 'done' && (
            <span style={{ fontSize: 11, color: '#10B981', background: '#ECFDF5', padding: '6px 12px', borderRadius: 8, fontWeight: 600 }}>
              <i className="bi bi-check-circle-fill" style={{ marginRight: 5 }} />Completed
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('all')
  const [submitTarget, setSubmitTarget] = useState<{ task: Task; mode: 'submit' | 'resubmit' } | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [search, setSearch] = useState('')

  const userId = user?.id ?? 0
  const branchId = user?.branch_id

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['my-tasks', userId],
    queryFn: () => tasksApi.getMyTasks(userId, branchId),
    staleTime: 30000,
  })

  const tasks: Task[] = useMemo(() => tasksData?.data ?? [], [tasksData])

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (activeTab === 'active') return t.status === 'in_progress' || t.status === 'todo' || t.status === 'backlog'
      if (activeTab === 'needs_revision') return t.status === 'needs_revision'
      if (activeTab === 'in_review') return t.status === 'in_review'
      if (activeTab === 'done') return t.status === 'done'
      return t.status !== 'cancelled'
    })
  }, [tasks, activeTab, search])

  // Stats
  const stats = useMemo(() => ({
    active: tasks.filter(t => ['todo', 'in_progress', 'backlog'].includes(t.status)).length,
    in_review: tasks.filter(t => t.status === 'in_review').length,
    needs_revision: tasks.filter(t => t.status === 'needs_revision').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'done' && t.status !== 'cancelled').length,
  }), [tasks])

  // Mutations
  const startMutation = useMutation({
    mutationFn: (id: number) => tasksApi.updateStatus(id, 'in_progress'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-tasks', userId] }),
  })
  const submitMutation = useMutation({
    mutationFn: ({ id, summary, outcomes, challenges, revisionResponse }: { id: number; summary: string; outcomes: string[]; challenges: string; revisionResponse: string }) =>
      tasksApi.submitForReview(id, summary, outcomes, challenges, revisionResponse),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-tasks', userId] }); setSubmitTarget(null) },
  })
  const resubmitMutation = useMutation({
    mutationFn: ({ id, summary, outcomes, challenges, revisionResponse }: { id: number; summary: string; outcomes: string[]; challenges: string; revisionResponse: string }) =>
      tasksApi.resubmit(id, summary, outcomes, challenges, revisionResponse),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-tasks', userId] }); setSubmitTarget(null) },
  })
  const commentMutation = useMutation({
    mutationFn: ({ taskId, body }: { taskId: number; body: string }) => tasksApi.addComment(taskId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-tasks', userId] }),
  })

  const handleAction = (task: Task, action: string) => {
    if (action === 'start') startMutation.mutate(task.id)
    if (action === 'submit') setSubmitTarget({ task, mode: 'submit' })
    if (action === 'resubmit') setSubmitTarget({ task, mode: 'resubmit' })
  }

  const handleSubmitConfirm = (summary: string, outcomes: string[], challenges: string, revisionResponse: string) => {
    if (!submitTarget) return
    if (submitTarget.mode === 'submit') submitMutation.mutate({ id: submitTarget.task.id, summary, outcomes, challenges, revisionResponse })
    else resubmitMutation.mutate({ id: submitTarget.task.id, summary, outcomes, challenges, revisionResponse })
  }

  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  return (
    <>
      <style>{`
        .mt-tab-btn {
          padding: 8px 16px; border: none; background: transparent;
          font-size: 13px; font-weight: 600; color: #71717A;
          border-bottom: 2px solid transparent; cursor: pointer;
          transition: all 0.15s; white-space: nowrap;
        }
        .mt-tab-btn.active { color: #F97316; border-color: #F97316; }
        .mt-tab-btn:hover:not(.active) { color: #09090B; }
        .mt-stat-card {
          background: #fff; border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.06);
          padding: 14px 18px;
          display: flex; align-items: center; gap: 12px;
          flex: 1; min-width: 120px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
      `}</style>

      <div style={{ padding: '28px 28px 48px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif', background: '#F8F8FB', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#09090B', margin: 0, letterSpacing: '-0.5px' }}>
            My Tasks
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#71717A' }}>
            Hey {firstName} — here are all tasks assigned to you
            {user?.branch_name && <span> and <strong>{user.branch_name}</strong></span>}
          </p>
        </div>

        {/* Stats row */}
        <div className="d-flex flex-wrap gap-3" style={{ marginBottom: 24 }}>
          {[
            { label: 'Active', value: stats.active, color: '#F97316', bg: '#FFF7ED', icon: 'bi-play-circle-fill' },
            { label: 'In Review', value: stats.in_review, color: '#8B5CF6', bg: '#F5F3FF', icon: 'bi-eye-fill' },
            { label: 'Needs Revision', value: stats.needs_revision, color: '#DC2626', bg: '#FEF2F2', icon: 'bi-exclamation-triangle-fill' },
            { label: 'Completed', value: stats.done, color: '#10B981', bg: '#ECFDF5', icon: 'bi-check-circle-fill' },
            ...(stats.overdue > 0 ? [{ label: 'Overdue', value: stats.overdue, color: '#DC2626', bg: '#FEF2F2', icon: 'bi-alarm-fill' }] : []),
          ].map(s => (
            <div key={s.label} className="mt-stat-card">
              <div style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`bi ${s.icon}`} style={{ fontSize: 16, color: s.color }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#09090B', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#71717A', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '0 20px' }}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2" style={{ paddingTop: 16, paddingBottom: 0 }}>
              {/* Tabs */}
              <div className="d-flex" style={{ gap: 2 }}>
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab.key}
                    className={`mt-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <i className={`bi ${tab.icon}`} style={{ marginRight: 5 }} />
                    {tab.label}
                    {tab.key === 'needs_revision' && stats.needs_revision > 0 && (
                      <span style={{ marginLeft: 5, background: '#EF4444', color: '#fff', borderRadius: 20, padding: '0 5px', fontSize: 10, fontWeight: 800 }}>{stats.needs_revision}</span>
                    )}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <i className="bi bi-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#A1A1AA', fontSize: 12 }} />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '7px 12px 7px 30px', fontSize: 12, outline: 'none', width: 200, background: '#FAFAFA' }}
                />
              </div>
            </div>
          </div>

          {/* Task list */}
          <div style={{ padding: '16px 20px' }}>
            {isLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#A1A1AA' }}>
                <span className="spinner-border spinner-border-sm" style={{ marginRight: 8 }} />Loading your tasks...
              </div>
            )}
            {!isLoading && filteredTasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#A1A1AA' }}>
                <i className="bi bi-inbox" style={{ fontSize: 40, display: 'block', marginBottom: 10 }} />
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No tasks here</div>
                <div style={{ fontSize: 13 }}>
                  {activeTab === 'all' ? 'You have no tasks assigned yet.' : `No tasks in "${FILTER_TABS.find(t => t.key === activeTab)?.label}" right now.`}
                </div>
              </div>
            )}
            {!isLoading && filteredTasks.map(task => (
              <MyTaskRow key={task.id} task={task} userId={userId} onAction={handleAction} onView={setDetailTask} />
            ))}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {user && (
        <StaffDetailPanel
          task={detailTask}
          currentUser={user}
          onClose={() => setDetailTask(null)}
          onAddComment={(taskId, body) => commentMutation.mutate({ taskId, body })}
        />
      )}

      {/* Submit / Resubmit Modal */}
      {submitTarget && (
        <SubmitForReviewModal
          task={submitTarget.task}
          mode={submitTarget.mode}
          onClose={() => setSubmitTarget(null)}
          onSubmit={handleSubmitConfirm}
          isPending={submitMutation.isPending || resubmitMutation.isPending}
        />
      )}
    </>
  )
}
