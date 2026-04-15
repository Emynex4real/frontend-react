import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../../services/api'
import type { Task, TaskForm, TaskType, TaskPriority, TaskScope, User, Branch } from '../../types'

const TASK_TYPES: { value: TaskType; label: string; icon: string }[] = [
  { value: 'general',    label: 'General',    icon: 'bi-clipboard' },
  { value: 'compliance', label: 'Compliance', icon: 'bi-shield-check' },
  { value: 'operations', label: 'Operations', icon: 'bi-gear' },
  { value: 'hr',         label: 'HR',         icon: 'bi-people' },
  { value: 'finance',    label: 'Finance',    icon: 'bi-currency-dollar' },
  { value: 'it',         label: 'IT',         icon: 'bi-cpu' },
  { value: 'sales',      label: 'Sales',      icon: 'bi-graph-up-arrow' },
]

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: '#DC2626' },
  { value: 'high',     label: 'High',     color: '#F97316' },
  { value: 'medium',   label: 'Medium',   color: '#F59E0B' },
  { value: 'low',      label: 'Low',      color: '#10B981' },
]

const LABEL_PRESETS = ['Q1', 'Q2', 'Q3', 'Q4', 'Urgent', 'Review', 'Audit', 'Compliance', 'Onboarding', 'Finance', 'Operations', 'IT', 'HR', 'Sales', 'Board']

interface Props {
  isOpen: boolean
  onClose: () => void
  users: User[]
  branches: Branch[]
  editingTask?: Task | null
  scopeLocked?: TaskScope
  branchLocked?: number
}

const EMPTY_FORM: TaskForm = {
  title: '',
  description: '',
  type: 'general',
  priority: 'medium',
  scope: 'individual',
  assigned_to: [],
  assigned_branch_id: undefined,
  due_date: '',
  start_date: '',
  labels: [],
  subtasks: [],
}

export default function CreateTaskModal({ isOpen, onClose, users, branches, editingTask, scopeLocked, branchLocked }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM)
  const [newSubtask, setNewSubtask] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof TaskForm, string>>>({})

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setForm({
          title: editingTask.title,
          description: editingTask.description ?? '',
          type: editingTask.type,
          priority: editingTask.priority,
          scope: editingTask.scope,
          assigned_to: editingTask.assigned_to,
          assigned_branch_id: editingTask.assigned_branch_id,
          due_date: editingTask.due_date ?? '',
          start_date: editingTask.start_date ?? '',
          labels: [...editingTask.labels],
          subtasks: editingTask.subtasks.map(s => ({ title: s.title, completed: s.completed })),
        })
      } else {
        setForm({
          ...EMPTY_FORM,
          ...(scopeLocked ? { scope: scopeLocked } : {}),
          ...(branchLocked ? { assigned_branch_id: branchLocked, scope: 'branch' } : {}),
        })
      }
      setErrors({})
      setNewSubtask('')
      setNewLabel('')
    }
  }, [isOpen, editingTask, scopeLocked, branchLocked])

  const createMutation = useMutation({
    mutationFn: (data: TaskForm) => tasksApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); onClose() },
  })
  const updateMutation = useMutation({
    mutationFn: (data: TaskForm) => tasksApi.update(editingTask!.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); onClose() },
  })

  const validate = (): boolean => {
    const errs: typeof errors = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (form.scope === 'individual' && form.assigned_to.length === 0) errs.assigned_to = 'Select at least one assignee'
    if (form.scope === 'branch' && !form.assigned_branch_id) errs.assigned_branch_id = 'Select a branch'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    // Build assignee_names from selected user ids
    const assignee_names = form.assigned_to.map(id => users.find(u => u.id === id)?.full_name ?? `User ${id}`)
    const branch = branches.find(b => b.id === form.assigned_branch_id)
    const payload = {
      ...form,
      assignee_names,
      assigned_branch_name: branch?.name,
    } as TaskForm & { assignee_names?: string[]; assigned_branch_name?: string }

    if (editingTask) updateMutation.mutate(payload)
    else createMutation.mutate(payload)
  }

  const toggleUser = (userId: number) => {
    setForm(f => ({
      ...f,
      assigned_to: f.assigned_to.includes(userId)
        ? f.assigned_to.filter(id => id !== userId)
        : [...f.assigned_to, userId],
    }))
  }

  const addSubtask = () => {
    const t = newSubtask.trim()
    if (!t) return
    setForm(f => ({ ...f, subtasks: [...f.subtasks, { title: t, completed: false }] }))
    setNewSubtask('')
  }

  const removeSubtask = (i: number) => setForm(f => ({ ...f, subtasks: f.subtasks.filter((_, idx) => idx !== i) }))

  const toggleLabel = (l: string) => setForm(f => ({
    ...f,
    labels: f.labels.includes(l) ? f.labels.filter(x => x !== l) : [...f.labels, l],
  }))

  const addCustomLabel = () => {
    const l = newLabel.trim()
    if (!l || form.labels.includes(l)) return
    setForm(f => ({ ...f, labels: [...f.labels, l] }))
    setNewLabel('')
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (!isOpen) return null

  return (
    <>
      <style>{`
        .ctm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 1060;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          backdrop-filter: blur(4px);
          animation: ctm-fadein 0.2s ease;
        }
        @keyframes ctm-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .ctm-modal {
          background: #FFFFFF;
          border-radius: 20px;
          width: 100%;
          max-width: 640px;
          max-height: 92vh;
          overflow-y: auto;
          box-shadow: 0 24px 80px rgba(0,0,0,0.18);
          animation: ctm-slidein 0.25s cubic-bezier(0.16,1,0.3,1);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
        }
        @keyframes ctm-slidein {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .ctm-modal::-webkit-scrollbar { width: 4px; }
        .ctm-modal::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .ctm-input {
          width: 100%;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
          font-family: inherit;
          background: #FAFAFA;
        }
        .ctm-input:focus {
          border-color: #F97316;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.1);
          background: #FFFFFF;
        }
        .ctm-input.error { border-color: #EF4444; }
        .ctm-label { font-size: 12px; font-weight: 700; color: #52525B; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; display: block; }
        .ctm-error { font-size: 11px; color: #EF4444; margin-top: 4px; }
        .type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 8px;
          border-radius: 10px;
          border: 2px solid transparent;
          background: #F4F4F5;
          cursor: pointer;
          transition: all 0.15s;
          font-size: 11px;
          font-weight: 600;
          color: #71717A;
          min-width: 70px;
        }
        .type-btn.selected {
          border-color: #F97316;
          background: #FFF7ED;
          color: #F97316;
        }
        .type-btn:hover:not(.selected) { background: #E4E4E7; }
        .priority-btn {
          flex: 1;
          padding: 8px;
          border-radius: 8px;
          border: 2px solid transparent;
          background: #F4F4F5;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          transition: all 0.15s;
          text-align: center;
        }
        .user-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px 5px 6px;
          border-radius: 20px;
          border: 1.5px solid transparent;
          background: #F4F4F5;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          color: #52525B;
          transition: all 0.15s;
        }
        .user-chip.selected {
          border-color: #F97316;
          background: #FFF7ED;
          color: #F97316;
        }
        .user-chip:hover:not(.selected) { background: #E4E4E7; }
        .label-chip {
          padding: 4px 10px;
          border-radius: 20px;
          border: 1.5px solid rgba(0,0,0,0.08);
          background: #F4F4F5;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          color: #52525B;
          transition: all 0.15s;
        }
        .label-chip.selected {
          border-color: #F97316;
          background: #FFF7ED;
          color: #EA580C;
        }
        .label-chip:hover:not(.selected) { background: #E4E4E7; }
        .subtask-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: #FAFAFA;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.05);
          font-size: 13px;
          color: #3F3F46;
        }
      `}</style>

      <div className="ctm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="ctm-modal">
          {/* Header */}
          <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#09090B', margin: 0, letterSpacing: '-0.3px' }}>
                  {editingTask ? 'Edit Task' : 'Create New Task'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#71717A' }}>
                  {editingTask ? 'Update the task details below' : 'Fill in the details to create a new task'}
                </p>
              </div>
              <button onClick={onClose} style={{ background: '#F4F4F5', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#52525B' }}>
                <i className="bi bi-x-lg" style={{ fontSize: 14 }} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Title */}
            <div>
              <label className="ctm-label">Task Title *</label>
              <input
                type="text"
                className={`ctm-input ${errors.title ? 'error' : ''}`}
                placeholder="e.g. Complete Q2 Compliance Audit"
                value={form.title}
                onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(er => ({ ...er, title: '' })) }}
              />
              {errors.title && <div className="ctm-error"><i className="bi bi-exclamation-circle" style={{ marginRight: 4 }} />{errors.title}</div>}
            </div>

            {/* Description */}
            <div>
              <label className="ctm-label">Description</label>
              <textarea
                className="ctm-input"
                rows={3}
                placeholder="Describe the task in detail..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Type */}
            <div>
              <label className="ctm-label">Task Type</label>
              <div className="d-flex flex-wrap gap-2">
                {TASK_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    className={`type-btn ${form.type === t.value ? 'selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  >
                    <i className={`bi ${t.icon}`} style={{ fontSize: 18 }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="ctm-label">Priority</label>
              <div className="d-flex gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    className="priority-btn"
                    style={{
                      borderColor: form.priority === p.value ? p.color : 'transparent',
                      background: form.priority === p.value ? `${p.color}15` : '#F4F4F5',
                      color: form.priority === p.value ? p.color : '#71717A',
                    }}
                    onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                  >
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: p.color, marginRight: 6 }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scope */}
            <div>
              <label className="ctm-label">Assign To</label>
              {scopeLocked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: '2px solid #F97316', background: '#FFF7ED' }}>
                  <i className={`bi ${scopeLocked === 'individual' ? 'bi-person-fill' : 'bi-buildings'}`} style={{ color: '#F97316', fontSize: 16 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#F97316' }}>{scopeLocked === 'individual' ? 'Individual(s)' : 'Entire Branch'}</div>
                    <div style={{ fontSize: 11, color: '#71717A' }}>Scope is fixed for this role</div>
                  </div>
                  <i className="bi bi-lock-fill" style={{ color: '#A1A1AA', fontSize: 12, marginLeft: 'auto' }} />
                </div>
              ) : (
                <div className="d-flex gap-3">
                  {(['individual', 'branch'] as TaskScope[]).map(s => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 16px', borderRadius: 10, border: `2px solid ${form.scope === s ? '#F97316' : 'rgba(0,0,0,0.08)'}`, background: form.scope === s ? '#FFF7ED' : '#FAFAFA', flex: 1, transition: 'all 0.15s' }}>
                      <input type="radio" name="scope" value={s} checked={form.scope === s} onChange={() => setForm(f => ({ ...f, scope: s }))} style={{ accentColor: '#F97316' }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: form.scope === s ? '#F97316' : '#09090B' }}>
                          <i className={`bi ${s === 'individual' ? 'bi-person-fill' : 'bi-buildings'}`} style={{ marginRight: 6 }} />
                          {s === 'individual' ? 'Individual(s)' : 'Entire Branch'}
                        </div>
                        <div style={{ fontSize: 11, color: '#71717A', marginTop: 1 }}>
                          {s === 'individual' ? 'Assign to specific people' : 'All staff in branch can see'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Assignees or Branch */}
            {form.scope === 'individual' ? (
              <div>
                <label className="ctm-label">Assignees *</label>
                <div className="d-flex flex-wrap gap-2">
                  {users.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      className={`user-chip ${form.assigned_to.includes(u.id) ? 'selected' : ''}`}
                      onClick={() => { toggleUser(u.id); setErrors(er => ({ ...er, assigned_to: '' })) }}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: form.assigned_to.includes(u.id) ? '#F97316' : '#E4E4E7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: form.assigned_to.includes(u.id) ? '#fff' : '#71717A', flexShrink: 0 }}>
                        {u.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      {u.full_name}
                      <span style={{ fontSize: 10, color: '#A1A1AA' }}>({u.role_name})</span>
                    </button>
                  ))}
                </div>
                {errors.assigned_to && <div className="ctm-error"><i className="bi bi-exclamation-circle" style={{ marginRight: 4 }} />{errors.assigned_to}</div>}
              </div>
            ) : (
              <div>
                <label className="ctm-label">Branch *</label>
                {branchLocked ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(59,130,246,0.3)', background: '#EFF6FF' }}>
                    <i className="bi bi-buildings" style={{ color: '#3B82F6', fontSize: 16 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8', flex: 1 }}>
                      {branches.find(b => b.id === branchLocked)?.name ?? `Branch #${branchLocked}`}
                    </span>
                    <i className="bi bi-lock-fill" style={{ color: '#93C5FD', fontSize: 12 }} />
                  </div>
                ) : (
                  <>
                    <select
                      className={`ctm-input ${errors.assigned_branch_id ? 'error' : ''}`}
                      value={form.assigned_branch_id ?? ''}
                      onChange={e => { setForm(f => ({ ...f, assigned_branch_id: e.target.value ? Number(e.target.value) : undefined })); setErrors(er => ({ ...er, assigned_branch_id: '' })) }}
                    >
                      <option value="">Select a branch...</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name} — {b.location}</option>)}
                    </select>
                    {errors.assigned_branch_id && <div className="ctm-error"><i className="bi bi-exclamation-circle" style={{ marginRight: 4 }} />{errors.assigned_branch_id}</div>}
                  </>
                )}
                {form.assigned_branch_id && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#3B82F6', background: '#EFF6FF', padding: '8px 12px', borderRadius: 8 }}>
                    <i className="bi bi-info-circle" style={{ marginRight: 6 }} />
                    All staff in this branch will be able to see this task.
                  </div>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="d-flex gap-4">
              <div style={{ flex: 1 }}>
                <label className="ctm-label">Start Date</label>
                <input type="date" className="ctm-input" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="ctm-label">Due Date</label>
                <input type="date" className="ctm-input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="ctm-label">Labels</label>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {LABEL_PRESETS.map(l => (
                  <button key={l} type="button" className={`label-chip ${form.labels.includes(l) ? 'selected' : ''}`} onClick={() => toggleLabel(l)}>{l}</button>
                ))}
              </div>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="ctm-input"
                  style={{ flex: 1 }}
                  placeholder="Custom label..."
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomLabel())}
                />
                <button type="button" onClick={addCustomLabel} style={{ background: '#F4F4F5', border: 'none', borderRadius: 10, padding: '0 14px', fontSize: 13, fontWeight: 600, color: '#52525B', cursor: 'pointer', flexShrink: 0 }}>
                  <i className="bi bi-plus" style={{ fontSize: 16 }} />
                </button>
              </div>
              {form.labels.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {form.labels.filter(l => !LABEL_PRESETS.includes(l)).map(l => (
                    <span key={l} style={{ fontSize: 11, color: '#EA580C', background: '#FFF7ED', padding: '3px 8px', borderRadius: 20, border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {l}
                      <button type="button" onClick={() => toggleLabel(l)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EA580C', padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div>
              <label className="ctm-label">Subtasks</label>
              <div className="d-flex flex-column gap-2 mb-2">
                {form.subtasks.map((s, i) => (
                  <div key={i} className="subtask-item">
                    <i className="bi bi-grip-vertical" style={{ color: '#D4D4D8', cursor: 'grab', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{s.title}</span>
                    <button type="button" onClick={() => removeSubtask(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A1A1AA', padding: '0 4px', fontSize: 14 }}>
                      <i className="bi bi-x" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="ctm-input"
                  style={{ flex: 1 }}
                  placeholder="Add a subtask..."
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                />
                <button type="button" onClick={addSubtask} style={{ background: '#F4F4F5', border: 'none', borderRadius: 10, padding: '0 14px', fontSize: 13, fontWeight: 600, color: '#52525B', cursor: 'pointer', flexShrink: 0 }}>
                  <i className="bi bi-plus" style={{ fontSize: 16 }} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 28px 24px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: '#F4F4F5', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#52525B', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                background: isPending ? '#E4E4E7' : 'linear-gradient(135deg,#F97316,#EA580C)',
                color: isPending ? '#A1A1AA' : '#fff',
                border: 'none', borderRadius: 10, padding: '10px 24px',
                fontSize: 14, fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer',
                boxShadow: isPending ? 'none' : '0 4px 12px rgba(249,115,22,0.25)',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
              }}
            >
              {isPending ? (
                <><span className="spinner-border spinner-border-sm" />{editingTask ? 'Saving...' : 'Creating...'}</>
              ) : (
                <><i className={`bi ${editingTask ? 'bi-check-lg' : 'bi-plus-lg'}`} />{editingTask ? 'Save Changes' : 'Create Task'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
