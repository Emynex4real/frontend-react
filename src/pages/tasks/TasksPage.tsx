import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { formatDistanceToNow, format, isPast, isToday, isTomorrow } from 'date-fns'
import { tasksApi, usersApi, branchesApi } from '../../services/api'
import type { Task, TaskStatus, TaskPriority, TaskType, TaskFilter, SubTask, TaskActivity } from '../../types'
import { useAuth } from '../../context/AuthContext'
import CreateTaskModal from '../../components/tasks/CreateTaskModal'
import ReviewActionModal from '../../components/tasks/ReviewActionModal'

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: 'backlog',        label: 'Backlog',        color: '#71717A', bg: '#F4F4F5' },
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
  general:    'bi-clipboard',
  compliance: 'bi-shield-check',
  operations: 'bi-gear',
  hr:         'bi-people',
  finance:    'bi-currency-dollar',
  it:         'bi-cpu',
  sales:      'bi-graph-up-arrow',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getDueDateLabel(due?: string) {
  if (!due) return null
  const d = new Date(due)
  if (isPast(d) && !isToday(d)) return { text: `${Math.ceil((Date.now() - d.getTime()) / 86400000)}d overdue`, color: '#DC2626', bg: '#FEF2F2' }
  if (isToday(d)) return { text: 'Due today', color: '#D97706', bg: '#FFFBEB' }
  if (isTomorrow(d)) return { text: 'Due tomorrow', color: '#EA580C', bg: '#FFF7ED' }
  return { text: format(d, 'MMM d'), color: '#52525B', bg: '#F4F4F5' }
}

function getActivityIcon(action: TaskActivity['action']) {
  const map: Record<string, string> = {
    created: 'bi-plus-circle-fill',
    status_changed: 'bi-arrow-right-circle-fill',
    assigned: 'bi-person-plus-fill',
    commented: 'bi-chat-fill',
    priority_changed: 'bi-flag-fill',
    due_date_changed: 'bi-calendar-event-fill',
    subtask_completed: 'bi-check-circle-fill',
    edited: 'bi-pencil-fill',
  }
  return map[action] || 'bi-circle-fill'
}

function getActivityText(a: TaskActivity) {
  const map: Record<string, string> = {
    created: 'created this task',
    status_changed: `moved from ${a.from_value?.replace('_', ' ')} → ${a.to_value?.replace('_', ' ')}`,
    assigned: `assigned to ${a.to_value}`,
    commented: `commented: "${a.to_value}"`,
    priority_changed: `changed priority to ${a.to_value}`,
    due_date_changed: `updated due date to ${a.to_value}`,
    subtask_completed: `completed subtask: "${a.to_value}"`,
    edited: 'edited task details',
  }
  return map[a.action] || a.action
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EF4444']
function Avatar({ name, size = 26, index = 0 }: { name: string; size?: number; index?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: AVATAR_COLORS[index % AVATAR_COLORS.length],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38,
      border: '2px solid #fff', boxSizing: 'border-box',
    }} title={name}>
      {getInitials(name)}
    </div>
  )
}

// ─── Task Card (Kanban) ───────────────────────────────────────────────────────

function TaskCard({ task, onSelect }: { task: Task; index?: number; onSelect: (t: Task) => void }) {
  const pCfg = PRIORITY_CONFIG[task.priority]
  const due = getDueDateLabel(task.due_date)
  const completedSubs = task.subtasks.filter(s => s.completed).length
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done' && task.status !== 'cancelled'

  return (
    <div
      className="task-card"
      style={{ border: isOverdue ? '1px solid #FCA5A5' : '1px solid rgba(0,0,0,0.06)', borderLeft: `3px solid ${pCfg.dot}` }}
      onClick={() => onSelect(task)}
    >
      {/* Type + Scope badge */}
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="task-type-badge">
          <i className={`bi ${TYPE_ICONS[task.type]}`} style={{ fontSize: 10 }} />
          {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
        </span>
        {task.scope === 'branch' && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#3B82F6', background: '#EFF6FF', padding: '1px 6px', borderRadius: 20 }}>
            <i className="bi bi-buildings" style={{ fontSize: 9, marginRight: 3 }} />Branch
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B', lineHeight: 1.4, marginBottom: 8 }}>
        {task.title}
      </div>

      {/* Subtask progress */}
      {task.subtasks.length > 0 && (
        <div className="mb-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#71717A', marginBottom: 3 }}>
            <span>{completedSubs}/{task.subtasks.length} subtasks</span>
          </div>
          <div style={{ height: 3, background: '#F4F4F5', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(completedSubs / task.subtasks.length) * 100}%`, background: '#10B981', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="d-flex align-items-center justify-content-between" style={{ marginTop: 8 }}>
        <div className="d-flex align-items-center gap-1">
          {/* Priority */}
          <span style={{ fontSize: 10, fontWeight: 700, color: pCfg.color, background: pCfg.bg, padding: '2px 6px', borderRadius: 20 }}>
            {pCfg.label}
          </span>
          {/* Due date */}
          {due && <span style={{ fontSize: 10, fontWeight: 600, color: due.color, background: due.bg, padding: '2px 6px', borderRadius: 20 }}>{due.text}</span>}
        </div>
        {/* Assignee avatars */}
        <div className="d-flex" style={{ gap: -4 }}>
          {(task.assignee_names ?? []).slice(0, 3).map((name, i) => (
            <div key={i} style={{ marginLeft: i > 0 ? -6 : 0 }}>
              <Avatar name={name} size={22} index={i} />
            </div>
          ))}
        </div>
      </div>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mt-2">
          {task.labels.slice(0, 3).map(l => (
            <span key={l} style={{ fontSize: 10, color: '#52525B', background: '#F4F4F5', padding: '1px 6px', borderRadius: 20 }}>{l}</span>
          ))}
        </div>
      )}

      {/* Comments count */}
      {task.comments.length > 0 && (
        <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 6 }}>
          <i className="bi bi-chat" style={{ fontSize: 10, marginRight: 3 }} />{task.comments.length}
        </div>
      )}
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function TaskDetailPanel({
  task, onClose, onStatusChange, onToggleSubtask, onAddComment, onEdit, onApprove, onReject,
}: {
  task: Task | null
  onClose: () => void
  onStatusChange: (id: number, status: TaskStatus) => void
  onToggleSubtask: (taskId: number, subtaskId: string) => void
  onAddComment: (taskId: number, body: string) => void
  onEdit: (task: Task) => void
  onApprove: (task: Task) => void
  onReject: (task: Task) => void
}) {
  const [tab, setTab] = useState<'details' | 'comments' | 'activity'>('details')
  const [comment, setComment] = useState('')
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const isVisible = !!task

  useEffect(() => { if (!isVisible) setTab('details') }, [isVisible])

  const pCfg = task ? PRIORITY_CONFIG[task.priority] : null
  const due = task ? getDueDateLabel(task.due_date) : null
  const completedSubs = task ? task.subtasks.filter(s => s.completed).length : 0
  const col = task ? COLUMNS.find(c => c.id === task.status) : null

  const handleComment = () => {
    if (!task || !comment.trim()) return
    onAddComment(task.id, comment.trim())
    setComment('')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1040,
          background: 'rgba(0,0,0,0.25)',
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 520, maxWidth: '95vw',
          background: '#FFFFFF',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
          zIndex: 1050,
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
          display: 'flex', flexDirection: 'column',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
          overflowY: 'auto',
        }}
      >
        {task && (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {/* Status pill */}
                  <select
                    value={task.status}
                    onChange={e => onStatusChange(task.id, e.target.value as TaskStatus)}
                    style={{
                      background: col?.bg, color: col?.color, border: `1px solid ${col?.color}40`,
                      borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  {/* Priority */}
                  {pCfg && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: pCfg.color, background: pCfg.bg, padding: '3px 10px', borderRadius: 20 }}>
                      <i className="bi bi-flag-fill" style={{ fontSize: 9, marginRight: 4 }} />{pCfg.label}
                    </span>
                  )}
                  {/* Scope */}
                  {task.scope === 'branch' ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', background: '#EFF6FF', padding: '3px 10px', borderRadius: 20 }}>
                      <i className="bi bi-buildings" style={{ fontSize: 10, marginRight: 4 }} />Branch Task
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#8B5CF6', background: '#F5F3FF', padding: '3px 10px', borderRadius: 20 }}>
                      <i className="bi bi-person-fill" style={{ fontSize: 10, marginRight: 4 }} />Individual Task
                    </span>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm" style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#52525B' }} onClick={() => onEdit(task)}>
                    <i className="bi bi-pencil" style={{ marginRight: 4 }} />Edit
                  </button>
                  <button className="btn btn-sm" style={{ border: 'none', borderRadius: 8, padding: '4px 8px', color: '#71717A' }} onClick={onClose}>
                    <i className="bi bi-x-lg" style={{ fontSize: 16 }} />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#09090B', letterSpacing: '-0.3px', lineHeight: 1.35, marginBottom: 16 }}>
                {task.title}
              </h2>

              {/* Tabs */}
              <div className="d-flex gap-1">
                {(['details', 'comments', 'activity'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      border: 'none', background: 'transparent', padding: '8px 14px',
                      fontSize: 13, fontWeight: tab === t ? 700 : 500,
                      color: tab === t ? '#F97316' : '#71717A',
                      borderBottom: tab === t ? '2px solid #F97316' : '2px solid transparent',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {t === 'comments' ? `Comments (${task.comments.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {/* ── Details Tab ── */}
              {tab === 'details' && (
                <div>
                  {/* Needs Revision banner */}
                  {task.status === 'needs_revision' && task.revision_reason && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10 }}>
                      <i className="bi bi-exclamation-triangle-fill" style={{ color: '#DC2626', fontSize: 16, flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 3 }}>Revision Required</div>
                        <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>{task.revision_reason}</div>
                      </div>
                    </div>
                  )}
                  {/* Submission note banner */}
                  {task.status === 'in_review' && task.submission_note && (
                    <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10 }}>
                      <i className="bi bi-send-fill" style={{ color: '#8B5CF6', fontSize: 14, flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#8B5CF6', marginBottom: 3 }}>Submission Note</div>
                        <div style={{ fontSize: 13, color: '#4C1D95', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{task.submission_note}</div>
                      </div>
                    </div>
                  )}
                  {/* Tagged reviewers */}
                  {task.status === 'in_review' && (task.tagged_reviewer_names ?? []).length > 0 && (
                    <div style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tagged for Review</div>
                      <div className="d-flex flex-wrap gap-2">
                        {(task.tagged_reviewer_names ?? []).map((name, i) => (
                          <span key={i} style={{ fontSize: 12, color: '#52525B', background: '#F4F4F5', padding: '3px 10px', borderRadius: 20 }}>
                            <i className="bi bi-person" style={{ marginRight: 4 }} />{name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Approve / Reject actions (admin/creator reviewing) */}
                  {task.status === 'in_review' && (
                    <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#ECFDF5)', border: '1px solid #BBF7D0', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>This task is awaiting your review</div>
                        <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>Approve to mark complete, or reject with a reason.</div>
                      </div>
                      <div className="d-flex gap-2">
                        <button onClick={() => onReject(task)} style={{ background: '#fff', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          <i className="bi bi-x-lg" style={{ marginRight: 6 }} />Reject
                        </button>
                        <button onClick={() => onApprove(task)} style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(16,185,129,0.25)' }}>
                          <i className="bi bi-check-lg" style={{ marginRight: 6 }} />Approve
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Meta grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, background: '#FAFAFA', borderRadius: 12, padding: 16, border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Type</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className={`bi ${TYPE_ICONS[task.type]}`} style={{ color: '#F97316', fontSize: 14 }} />
                        {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Due Date</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {task.due_date ? (
                          <span style={{ color: due?.color ?? '#09090B' }}>
                            <i className="bi bi-calendar3" style={{ marginRight: 5 }} />
                            {format(new Date(task.due_date), 'MMM d, yyyy')}
                            {due && <span style={{ fontSize: 11, marginLeft: 6, background: due.bg, padding: '1px 6px', borderRadius: 20 }}>{due.text}</span>}
                          </span>
                        ) : <span style={{ color: '#A1A1AA' }}>No due date</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Created By</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#09090B', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Avatar name={task.creator_name ?? 'A'} size={20} index={0} />
                        {task.creator_name}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Created</div>
                      <div style={{ fontSize: 13, color: '#52525B' }}>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</div>
                    </div>
                    {task.scope === 'branch' && task.assigned_branch_name && (
                      <div style={{ gridColumn: '1/-1' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Assigned Branch</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="bi bi-buildings" />
                          {task.assigned_branch_name}
                          <span style={{ fontSize: 11, color: '#71717A', fontWeight: 400 }}>(all staff can view)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assignees */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Assignees</div>
                    <div className="d-flex flex-wrap gap-2">
                      {(task.assignee_names ?? []).map((name, i) => (
                        <div key={i} className="d-flex align-items-center gap-2" style={{ background: '#F4F4F5', borderRadius: 20, padding: '4px 10px 4px 4px', fontSize: 12, fontWeight: 500, color: '#09090B' }}>
                          <Avatar name={name} size={22} index={i} />
                          {name}
                        </div>
                      ))}
                      {(task.assignee_names ?? []).length === 0 && <span style={{ fontSize: 13, color: '#A1A1AA' }}>No assignees</span>}
                    </div>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Description</div>
                      <p style={{ fontSize: 14, color: '#3F3F46', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{task.description}</p>
                    </div>
                  )}

                  {/* Labels */}
                  {task.labels.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Labels</div>
                      <div className="d-flex flex-wrap gap-2">
                        {task.labels.map(l => (
                          <span key={l} style={{ fontSize: 12, color: '#52525B', background: '#F4F4F5', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)' }}>{l}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subtasks */}
                  {task.subtasks.length > 0 && (
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subtasks</div>
                        <span style={{ fontSize: 11, color: '#71717A' }}>{completedSubs}/{task.subtasks.length} completed</span>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 4, background: '#F4F4F5', borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${task.subtasks.length ? (completedSubs / task.subtasks.length) * 100 : 0}%`, background: '#10B981', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <div className="d-flex flex-column gap-2">
                        {task.subtasks.map((s: SubTask) => (
                          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: s.completed ? '#F0FDF4' : '#FAFAFA', border: `1px solid ${s.completed ? '#BBF7D0' : 'rgba(0,0,0,0.06)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                            <input
                              type="checkbox"
                              checked={s.completed}
                              onChange={() => onToggleSubtask(task.id, s.id)}
                              style={{ width: 16, height: 16, accentColor: '#10B981', cursor: 'pointer', flexShrink: 0 }}
                            />
                            <span style={{ fontSize: 13, color: s.completed ? '#52525B' : '#09090B', textDecoration: s.completed ? 'line-through' : 'none', flex: 1 }}>
                              {s.title}
                            </span>
                            {s.completed && <i className="bi bi-check-circle-fill" style={{ color: '#10B981', fontSize: 14 }} />}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Comments Tab ── */}
              {tab === 'comments' && (
                <div>
                  {task.comments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#A1A1AA' }}>
                      <i className="bi bi-chat-square" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                      <div style={{ fontSize: 13 }}>No comments yet. Be the first to comment.</div>
                    </div>
                  )}
                  <div className="d-flex flex-column gap-3 mb-4">
                    {task.comments.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                        <Avatar name={c.author_name} size={32} index={c.author_id % 6} />
                        <div style={{ flex: 1 }}>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#09090B' }}>{c.author_name}</span>
                            <span style={{ fontSize: 11, color: '#A1A1AA' }}>{c.author_role}</span>
                            <span style={{ fontSize: 11, color: '#A1A1AA', marginLeft: 'auto' }}>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#3F3F46', lineHeight: 1.6, background: '#F9F9F9', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)', whiteSpace: 'pre-wrap' }}>
                            {c.body}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Comment input */}
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
                    <div className="d-flex gap-2">
                      <Avatar name="Admin User" size={32} index={0} />
                      <div style={{ flex: 1 }}>
                        <textarea
                          ref={commentRef}
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          placeholder="Write a comment..."
                          rows={3}
                          style={{ width: '100%', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '10px 12px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                          onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)' }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none' }}
                          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleComment() }}
                        />
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <span style={{ fontSize: 11, color: '#A1A1AA' }}>Ctrl+Enter to submit</span>
                          <button
                            onClick={handleComment}
                            disabled={!comment.trim()}
                            style={{ background: comment.trim() ? '#F97316' : '#E4E4E7', color: comment.trim() ? '#fff' : '#A1A1AA', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: comment.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                          >
                            <i className="bi bi-send" style={{ marginRight: 6 }} />Send
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
                      <i className="bi bi-activity" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                      <div style={{ fontSize: 13 }}>No activity recorded yet.</div>
                    </div>
                  )}
                  <div style={{ position: 'relative' }}>
                    {[...task.activity].reverse().map((a, i) => (
                      <div key={a.id} style={{ display: 'flex', gap: 10, paddingBottom: 16, position: 'relative' }}>
                        {/* Timeline line */}
                        {i < task.activity.length - 1 && (
                          <div style={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 1, background: 'rgba(0,0,0,0.06)' }} />
                        )}
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFF7ED', border: '1px solid #FDBA74', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                          <i className={`bi ${getActivityIcon(a.action)}`} style={{ fontSize: 12, color: '#F97316' }} />
                        </div>
                        <div style={{ flex: 1, paddingTop: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>{a.actor_name}</span>
                          <span style={{ fontSize: 13, color: '#52525B' }}> {getActivityText(a)}</span>
                          <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2 }}>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── List View Row ────────────────────────────────────────────────────────────

function TaskListRow({ task, onSelect }: { task: Task; onSelect: (t: Task) => void }) {
  const pCfg = PRIORITY_CONFIG[task.priority]
  const col = COLUMNS.find(c => c.id === task.status)!
  const due = getDueDateLabel(task.due_date)
  const completedSubs = task.subtasks.filter(s => s.completed).length

  return (
    <tr className="task-list-row" onClick={() => onSelect(task)} style={{ cursor: 'pointer' }}>
      <td style={{ padding: '12px 16px', width: 32 }}>
        <i className={`bi ${TYPE_ICONS[task.type]}`} style={{ color: '#A1A1AA', fontSize: 14 }} title={task.type} />
      </td>
      <td style={{ padding: '12px 8px', maxWidth: 320 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B', marginBottom: 2 }}>{task.title}</div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {task.scope === 'branch' && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#3B82F6', background: '#EFF6FF', padding: '1px 6px', borderRadius: 20 }}>
              <i className="bi bi-buildings" style={{ fontSize: 9, marginRight: 3 }} />Branch
            </span>
          )}
          {task.labels.slice(0, 2).map(l => (
            <span key={l} style={{ fontSize: 10, color: '#52525B', background: '#F4F4F5', padding: '1px 6px', borderRadius: 20 }}>{l}</span>
          ))}
        </div>
      </td>
      <td style={{ padding: '12px 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: col.bg, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{col.label}</span>
      </td>
      <td style={{ padding: '12px 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: pCfg.color, background: pCfg.bg, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: pCfg.dot, flexShrink: 0 }} />
          {pCfg.label}
        </span>
      </td>
      <td style={{ padding: '12px 8px' }}>
        <div className="d-flex" style={{ gap: -4 }}>
          {(task.assignee_names ?? []).slice(0, 3).map((name, i) => (
            <div key={i} style={{ marginLeft: i > 0 ? -6 : 0 }}>
              <Avatar name={name} size={24} index={i} />
            </div>
          ))}
          {(task.assignee_names ?? []).length === 0 && <span style={{ fontSize: 12, color: '#A1A1AA' }}>—</span>}
        </div>
      </td>
      <td style={{ padding: '12px 8px' }}>
        {due ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: due.color, background: due.bg, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{due.text}</span>
        ) : <span style={{ fontSize: 12, color: '#A1A1AA' }}>—</span>}
      </td>
      <td style={{ padding: '12px 8px' }}>
        {task.subtasks.length > 0 ? (
          <span style={{ fontSize: 11, color: '#52525B' }}>{completedSubs}/{task.subtasks.length}</span>
        ) : <span style={{ fontSize: 12, color: '#A1A1AA' }}>—</span>}
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [reviewTarget, setReviewTarget] = useState<{ task: Task; mode: 'approve' | 'reject' } | null>(null)
  const [filters, setFilters] = useState<TaskFilter>({ search: '', status: '', priority: '', type: '', scope: '' })

  const { data: tasksData } = useQuery({ queryKey: ['tasks'], queryFn: () => tasksApi.getAll(), staleTime: 30000 })
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.getAll(), staleTime: 60000 })
  const { data: branchesData } = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.getAll(), staleTime: 60000 })

  const tasks = useMemo(() => tasksData?.data ?? [], [tasksData])
  const users = useMemo(() => usersData?.data ?? [], [usersData])
  const branches = useMemo(() => branchesData?.data ?? [], [branchesData])

  // Keep selected task in sync with query data
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id)
      if (updated) setSelectedTask(updated)
    }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase()) && !t.description?.toLowerCase().includes(filters.search.toLowerCase())) return false
      if (filters.status && t.status !== filters.status) return false
      if (filters.priority && t.priority !== filters.priority) return false
      if (filters.type && t.type !== filters.type) return false
      if (filters.scope && t.scope !== filters.scope) return false
      return true
    })
  }, [tasks, filters])

  // Kanban grouped
  const kanbanColumns = useMemo(() =>
    COLUMNS.reduce((acc, col) => {
      acc[col.id] = filteredTasks.filter(t => t.status === col.id && t.status !== 'cancelled')
      return acc
    }, {} as Record<TaskStatus, Task[]>)
  , [filteredTasks])

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) => tasksApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
  const subtaskMutation = useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: number; subtaskId: string }) => tasksApi.toggleSubtask(taskId, subtaskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
  const commentMutation = useMutation({
    mutationFn: ({ taskId, body }: { taskId: number; body: string }) => tasksApi.addComment(taskId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
  // deleteMutation available for future use / bulk actions
  const _deleteMutation = useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setSelectedTask(null) },
  })
  void _deleteMutation

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const taskId = parseInt(result.draggableId)
    const newStatus = result.destination.droppableId as TaskStatus
    const task = tasks.find(t => t.id === taskId)
    if (task && task.status !== newStatus) {
      statusMutation.mutate({ id: taskId, status: newStatus })
    }
  }

  const overdueTasks = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'done' && t.status !== 'cancelled')

  const approveMutation = useMutation({
    mutationFn: (id: number) => tasksApi.approve(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setReviewTarget(null) },
  })
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => tasksApi.reject(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setReviewTarget(null) },
  })

  const handleEdit = (task: Task) => { setEditingTask(task); setIsCreateOpen(true) }
  const handleCreateClose = () => { setIsCreateOpen(false); setEditingTask(null) }
  void user

  return (
    <>
      <style>{`
        .task-card {
          background: #FFFFFF;
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          user-select: none;
        }
        .task-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
        .task-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          color: #52525B;
          background: #F4F4F5;
          padding: 2px 7px;
          border-radius: 20px;
          text-transform: capitalize;
        }
        .kanban-column {
          background: rgba(0,0,0,0.02);
          border-radius: 14px;
          min-width: 260px;
          width: 260px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 200px);
        }
        .kanban-column-header {
          padding: 12px 14px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .kanban-column-body {
          flex: 1;
          overflow-y: auto;
          padding: 4px 10px 10px;
          min-height: 80px;
        }
        .kanban-column-body::-webkit-scrollbar { width: 3px; }
        .kanban-column-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
        .kanban-droppable-active { background: rgba(249,115,22,0.04); transition: background 0.15s; }
        .filter-select {
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 12px;
          color: #52525B;
          background: #fff;
          outline: none;
          cursor: pointer;
        }
        .filter-select:focus { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .view-toggle-btn {
          border: 1px solid rgba(0,0,0,0.08);
          background: transparent;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #71717A;
          cursor: pointer;
          transition: all 0.15s;
        }
        .view-toggle-btn.active {
          background: #F97316;
          color: #fff;
          border-color: #F97316;
        }
        .view-toggle-btn:first-child { border-radius: 8px 0 0 8px; }
        .view-toggle-btn:last-child { border-radius: 0 8px 8px 0; }
        .task-list-row:hover { background: #FAFAFA; }
        .task-list-row td { border-bottom: 1px solid rgba(0,0,0,0.04); }
        .tasks-search-input {
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 8px;
          padding: 7px 12px 7px 34px;
          font-size: 13px;
          outline: none;
          min-width: 220px;
          background: #fff;
          transition: all 0.2s;
        }
        .tasks-search-input:focus { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        @media (max-width: 768px) {
          .kanban-column { min-width: 230px; width: 230px; }
          .tasks-search-input { min-width: 140px; }
        }
      `}</style>

      <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif', minHeight: '100vh', background: '#F8F8FB' }}>

        {/* ── Page Header ── */}
        <div style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '20px 28px 0', position: 'sticky', top: 64, zIndex: 100 }}>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#F97316,#EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-kanban text-white" style={{ fontSize: 16 }} />
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#09090B', margin: 0, letterSpacing: '-0.5px' }}>Task Manager</h1>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#71717A' }}>
                {tasks.length} total tasks
                {overdueTasks.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '1px 8px', borderRadius: 20 }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 4, fontSize: 10 }} />{overdueTasks.length} overdue
                  </span>
                )}
              </p>
            </div>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              {/* View toggle */}
              <div>
                <button className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>
                  <i className="bi bi-kanban" style={{ marginRight: 5 }} />Board
                </button>
                <button className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
                  <i className="bi bi-list-ul" style={{ marginRight: 5 }} />List
                </button>
              </div>
              <button
                onClick={() => { setEditingTask(null); setIsCreateOpen(true) }}
                style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(249,115,22,0.25)' }}
              >
                <i className="bi bi-plus-lg" style={{ fontSize: 14 }} />New Task
              </button>
            </div>
          </div>

          {/* ── Filter Bar ── */}
          <div className="d-flex align-items-center gap-2 pb-4 flex-wrap">
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <i className="bi bi-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#A1A1AA', fontSize: 13 }} />
              <input
                type="search"
                className="tasks-search-input"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>
            <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value as TaskFilter['status'] }))}>
              <option value="">All Status</option>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select className="filter-select" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value as TaskFilter['priority'] }))}>
              <option value="">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select className="filter-select" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value as TaskFilter['type'] }))}>
              <option value="">All Types</option>
              <option value="general">General</option>
              <option value="compliance">Compliance</option>
              <option value="operations">Operations</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
              <option value="it">IT</option>
              <option value="sales">Sales</option>
            </select>
            <select className="filter-select" value={filters.scope} onChange={e => setFilters(f => ({ ...f, scope: e.target.value as TaskFilter['scope'] }))}>
              <option value="">All Scope</option>
              <option value="individual">Individual</option>
              <option value="branch">Branch</option>
            </select>
            {(filters.search || filters.status || filters.priority || filters.type || filters.scope) && (
              <button onClick={() => setFilters({ search: '', status: '', priority: '', type: '', scope: '' })} style={{ fontSize: 12, color: '#F97316', background: 'none', border: '1px solid #FED7AA', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>
                <i className="bi bi-x" style={{ marginRight: 4 }} />Clear
              </button>
            )}
            <span style={{ fontSize: 12, color: '#A1A1AA', marginLeft: 4 }}>{filteredTasks.filter(t => t.status !== 'cancelled').length} tasks</span>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '24px 28px' }}>

          {/* ── Kanban Board ── */}
          {view === 'kanban' && (
            <DragDropContext onDragEnd={onDragEnd}>
              <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16 }}>
                {COLUMNS.map(col => {
                  const colTasks = kanbanColumns[col.id] ?? []
                  return (
                    <div key={col.id} className="kanban-column">
                      {/* Column header */}
                      <div className="kanban-column-header">
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#09090B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: col.bg, padding: '1px 7px', borderRadius: 20 }}>{colTasks.length}</span>
                        </div>
                        <button
                          onClick={() => { setEditingTask(null); setIsCreateOpen(true) }}
                          style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', borderRadius: 4 }}
                          title="Add task"
                        >
                          <i className="bi bi-plus" />
                        </button>
                      </div>

                      {/* Droppable */}
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`kanban-column-body ${snapshot.isDraggingOver ? 'kanban-droppable-active' : ''}`}
                          >
                            {colTasks.map((task, index) => (
                              <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                                {(prov, snap) => (
                                  <div
                                    ref={prov.innerRef}
                                    {...prov.draggableProps}
                                    {...prov.dragHandleProps}
                                    style={{ ...prov.draggableProps.style, opacity: snap.isDragging ? 0.92 : 1, transform: snap.isDragging ? `${prov.draggableProps.style?.transform} rotate(2deg)` : prov.draggableProps.style?.transform }}
                                  >
                                    <TaskCard task={task} index={index} onSelect={setSelectedTask} />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {colTasks.length === 0 && !snapshot.isDraggingOver && (
                              <div style={{ textAlign: 'center', padding: '20px 0', color: '#D4D4D8', fontSize: 12 }}>
                                <i className="bi bi-inbox" style={{ fontSize: 22, display: 'block', marginBottom: 6 }} />
                                Drop tasks here
                              </div>
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

          {/* ── List View ── */}
          {view === 'list' && (
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    <th style={{ padding: '11px 16px', width: 32, borderBottom: '1px solid rgba(0,0,0,0.06)' }}></th>
                    <th style={{ padding: '11px 8px', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(0,0,0,0.06)', textAlign: 'left' }}>Task</th>
                    <th style={{ padding: '11px 8px', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(0,0,0,0.06)', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '11px 8px', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(0,0,0,0.06)', textAlign: 'left' }}>Priority</th>
                    <th style={{ padding: '11px 8px', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(0,0,0,0.06)', textAlign: 'left' }}>Assignee</th>
                    <th style={{ padding: '11px 8px', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(0,0,0,0.06)', textAlign: 'left' }}>Due</th>
                    <th style={{ padding: '11px 8px', fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(0,0,0,0.06)', textAlign: 'left' }}>Subtasks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.filter(t => t.status !== 'cancelled').length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: '#A1A1AA' }}>
                        <i className="bi bi-inbox" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                        <div style={{ fontSize: 14 }}>No tasks found</div>
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.filter(t => t.status !== 'cancelled').map(task => (
                      <TaskListRow key={task.id} task={task} onSelect={setSelectedTask} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Slide-in Detail Panel ── */}
      <TaskDetailPanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
        onToggleSubtask={(taskId, subtaskId) => subtaskMutation.mutate({ taskId, subtaskId })}
        onAddComment={(taskId, body) => commentMutation.mutate({ taskId, body })}
        onEdit={handleEdit}
        onApprove={t => setReviewTarget({ task: t, mode: 'approve' })}
        onReject={t => setReviewTarget({ task: t, mode: 'reject' })}
      />

      {/* ── Create / Edit Modal ── */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={handleCreateClose}
        users={users}
        branches={branches}
        editingTask={editingTask}
      />

      {/* ── Review Action Modal (approve / reject) ── */}
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
    </>
  )
}
