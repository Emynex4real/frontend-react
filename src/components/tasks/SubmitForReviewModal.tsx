import { useState, useMemo, useRef } from 'react'
import type { Task, SubTask, User, TaskAttachment } from '../../types'

const ACCEPTED_TYPES = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'
const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_FILES = 5

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

interface Props {
  task: Task
  mode: 'submit' | 'resubmit'
  onClose: () => void
  onSubmit: (
    achievement_summary: string,
    key_outcomes: string[],
    challenges_faced: string,
    revision_response: string,
    taggedReviewers: number[],
  ) => void
  isPending: boolean
  users?: User[]
  onUploadFile?: (file: File) => Promise<void>
  isUploadingFile?: boolean
  onRemoveAttachment?: (attachmentId: string) => void
}

export default function SubmitForReviewModal({ task, mode, onClose, onSubmit, isPending, users, onUploadFile, isUploadingFile, onRemoveAttachment }: Props) {
  const [summary, setSummary] = useState(task.achievement_summary ?? '')
  const [outcomes, setOutcomes] = useState<string[]>(
    task.key_outcomes?.length ? task.key_outcomes : ['']
  )
  const [challenges, setChallenges] = useState(task.challenges_faced ?? '')
  const [revisionResponse, setRevisionResponse] = useState(task.revision_response ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tagSearch, setTagSearch] = useState('')
  const [taggedIds, setTaggedIds] = useState<number[]>(task.tagged_reviewers ?? [])
  const [isDragModal, setIsDragModal] = useState(false)
  const [fileUploadError, setFileUploadError] = useState('')
  const modalFileRef = useRef<HTMLInputElement>(null)

  const filteredTagUsers = useMemo(() => {
    if (!tagSearch.trim() || !users?.length) return []
    return users.filter(u =>
      !taggedIds.includes(u.id) &&
      u.full_name.toLowerCase().includes(tagSearch.toLowerCase())
    ).slice(0, 6)
  }, [tagSearch, users, taggedIds])

  const addTag = (user: User) => { setTaggedIds(prev => [...prev, user.id]); setTagSearch('') }
  const removeTag = (id: number) => setTaggedIds(prev => prev.filter(x => x !== id))

  const handleModalFiles = async (files: FileList | null) => {
    if (!files || !onUploadFile) return
    setFileUploadError('')
    const currentCount = (task.attachments ?? []).length
    const available = MAX_FILES - currentCount
    if (available <= 0) { setFileUploadError(`Maximum ${MAX_FILES} files already attached.`); return }
    for (const file of Array.from(files).slice(0, available)) {
      if (file.size > MAX_FILE_SIZE) { setFileUploadError(`"${file.name}" exceeds the 20 MB limit.`); return }
      await onUploadFile(file)
    }
  }

  const completedSubs = task.subtasks.filter((s: SubTask) => s.completed)
  const pendingSubs   = task.subtasks.filter((s: SubTask) => !s.completed)

  // ── outcomes builder ────────────────────────────────
  const addOutcome = () => setOutcomes(prev => [...prev, ''])
  const updateOutcome = (i: number, val: string) =>
    setOutcomes(prev => prev.map((o, idx) => (idx === i ? val : o)))
  const removeOutcome = (i: number) =>
    setOutcomes(prev => prev.filter((_, idx) => idx !== i))

  // ── validate & submit ────────────────────────────────
  const handleSubmit = () => {
    const errs: Record<string, string> = {}
    if (!summary.trim()) errs.summary = 'Summary is required.'
    const filledOutcomes = outcomes.map(o => o.trim()).filter(Boolean)
    if (filledOutcomes.length === 0) errs.outcomes = 'Add at least one key outcome.'
    if (mode === 'resubmit' && !revisionResponse.trim()) errs.revisionResponse = 'Explain how you addressed the previous feedback.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSubmit(summary.trim(), filledOutcomes, challenges.trim(), revisionResponse.trim(), taggedIds)
  }

  const accentColor = mode === 'resubmit' ? '#F97316' : '#8B5CF6'
  const accentBg    = mode === 'resubmit' ? '#FFF7ED' : '#F5F3FF'
  const accentBorder = mode === 'resubmit' ? '#FED7AA' : '#DDD6FE'

  return (
    <>
      <style>{`
        .sfr2-overlay {
          position: fixed; inset: 0; z-index: 1070;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 16px;
          animation: sfr2-in 0.18s ease;
        }
        @keyframes sfr2-in { from { opacity:0 } to { opacity:1 } }
        .sfr2-card {
          background: #fff; border-radius: 18px; width: 100%; max-width: 560px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.18);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          animation: sfr2-up 0.22s cubic-bezier(0.16,1,0.3,1);
          display: flex; flex-direction: column; max-height: 90vh; overflow: hidden;
        }
        @keyframes sfr2-up { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        .sfr2-field-label {
          font-size: 11px; font-weight: 700; color: #52525B;
          text-transform: uppercase; letter-spacing: 0.06em;
          display: block; margin-bottom: 6px;
        }
        .sfr2-textarea {
          width: 100%; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 10px;
          padding: 10px 14px; font-size: 13px; outline: none; resize: vertical;
          font-family: inherit; background: #FAFAFA; box-sizing: border-box; line-height: 1.6;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .sfr2-outcome-row {
          display: flex; align-items: flex-start; gap: 8; margin-bottom: 8px;
        }
        .sfr2-outcome-input {
          flex: 1; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 10px;
          padding: 8px 12px; font-size: 13px; outline: none; background: #FAFAFA;
          font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .sfr2-outcome-input:focus { border-color: #8B5CF6; box-shadow: 0 0 0 3px rgba(139,92,246,0.1); }
        .sfr2-remove-btn {
          width: 32px; height: 36px; border: none; background: #FEF2F2;
          color: #DC2626; border-radius: 8px; cursor: pointer; display: flex;
          align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px;
          transition: background 0.15s;
        }
        .sfr2-remove-btn:hover { background: #FECACA; }
      `}</style>

      <div className="sfr2-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="sfr2-card">

          {/* ── Header ── */}
          <div style={{ padding: '20px 24px 16px', background: `linear-gradient(135deg,${accentBg},${accentBg})`, borderBottom: `1px solid ${accentBorder}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg,${accentColor},${accentColor}dd)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${accentColor}40` }}>
                <i className={`bi ${mode === 'resubmit' ? 'bi-arrow-repeat' : 'bi-send-fill'}`} style={{ fontSize: 18, color: '#fff' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#09090B', margin: 0 }}>
                  {mode === 'resubmit' ? 'Resubmit for Review' : 'Submit for Review'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
              </div>
              <button onClick={onClose} style={{ border: 'none', background: 'rgba(0,0,0,0.07)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#52525B', flexShrink: 0 }}>
                <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
              </button>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Revision reason reminder (resubmit only) */}
            {mode === 'resubmit' && task.revision_reason && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="bi bi-exclamation-triangle-fill" />Previous Rejection Reason
                </div>
                <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.6 }}>{task.revision_reason}</div>
              </div>
            )}

            {/* Subtask status snapshot */}
            {task.subtasks.length > 0 && (
              <div style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Subtask Completion — {completedSubs.length}/{task.subtasks.length}
                </div>
                <div style={{ height: 5, background: '#E4E4E7', borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(completedSubs.length / task.subtasks.length) * 100}%`, background: completedSubs.length === task.subtasks.length ? '#10B981' : '#8B5CF6', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {completedSubs.map((s: SubTask) => (
                    <span key={s.id} style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#ECFDF5', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="bi bi-check-circle-fill" style={{ fontSize: 10 }} />{s.title}
                    </span>
                  ))}
                  {pendingSubs.map((s: SubTask) => (
                    <span key={s.id} style={{ fontSize: 11, fontWeight: 600, color: '#71717A', background: '#F4F4F5', border: '1px solid #E4E4E7', padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="bi bi-circle" style={{ fontSize: 10 }} />{s.title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 1 — Achievement Summary */}
            <div>
              <label className="sfr2-field-label">
                1. Achievement Summary <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <p style={{ fontSize: 12, color: '#71717A', margin: '0 0 8px', lineHeight: 1.5 }}>
                Overall, what was accomplished? Give a clear picture of the work done and the end result.
              </p>
              <textarea
                className="sfr2-textarea"
                rows={4}
                value={summary}
                onChange={e => { setSummary(e.target.value); if (errors.summary) setErrors(p => ({ ...p, summary: '' })) }}
                placeholder="e.g. Completed the full Q2 compliance audit for Cebu Branch. All 7 departments submitted their documents. Identified 2 non-compliant items and recommended corrective actions."
                onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.boxShadow = `0 0 0 3px ${accentColor}18` }}
                onBlur={e => { e.target.style.borderColor = errors.summary ? '#EF4444' : 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none' }}
                style={{ borderColor: errors.summary ? '#EF4444' : undefined } as React.CSSProperties}
              />
              {errors.summary && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errors.summary}</div>}
            </div>

            {/* 2 — Key Outcomes */}
            <div>
              <label className="sfr2-field-label">
                2. Key Outcomes / Results Achieved <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <p style={{ fontSize: 12, color: '#71717A', margin: '0 0 10px', lineHeight: 1.5 }}>
                List specific, measurable results. Each line = one outcome. At least one required.
              </p>
              {outcomes.map((o, i) => (
                <div key={i} className="sfr2-outcome-row">
                  <div style={{ paddingTop: 8, color: '#A1A1AA', fontSize: 13, flexShrink: 0 }}>•</div>
                  <input
                    type="text"
                    className="sfr2-outcome-input"
                    value={o}
                    onChange={e => { updateOutcome(i, e.target.value); if (errors.outcomes) setErrors(p => ({ ...p, outcomes: '' })) }}
                    placeholder={`Outcome ${i + 1} — e.g. Reduced compliance gaps by 40%`}
                  />
                  {outcomes.length > 1 && (
                    <button className="sfr2-remove-btn" onClick={() => removeOutcome(i)} title="Remove outcome">
                      <i className="bi bi-trash3" />
                    </button>
                  )}
                </div>
              ))}
              {errors.outcomes && <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 6 }}>{errors.outcomes}</div>}
              <button
                onClick={addOutcome}
                style={{ background: 'none', border: `1.5px dashed ${accentColor}60`, borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: accentColor, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}
              >
                <i className="bi bi-plus-lg" />Add Another Outcome
              </button>
            </div>

            {/* 3 — Challenges */}
            <div>
              <label className="sfr2-field-label">
                3. Challenges / Blockers Faced <span style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
              </label>
              <p style={{ fontSize: 12, color: '#71717A', margin: '0 0 8px', lineHeight: 1.5 }}>
                Were there any obstacles, delays, or risks encountered? Transparency helps the reviewer.
              </p>
              <textarea
                className="sfr2-textarea"
                rows={3}
                value={challenges}
                onChange={e => setChallenges(e.target.value)}
                placeholder="e.g. IT department was delayed in submitting documents. Rescheduled follow-up twice before receiving them."
                onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.boxShadow = `0 0 0 3px ${accentColor}18` }}
                onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* Evidence Files */}
            <div>
              <label className="sfr2-field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="bi bi-paperclip" style={{ color: accentColor }} />
                Evidence Files
                <span style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
              </label>
              <p style={{ fontSize: 12, color: '#71717A', margin: '0 0 10px', lineHeight: 1.5 }}>
                Attach screenshots, reports, spreadsheets or videos as proof of your work. Visible to the reviewer and tagged colleagues.
              </p>

              {/* Existing attached files */}
              {(task.attachments ?? []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {(task.attachments ?? []).map((att: TaskAttachment) => {
                    const fs = getFileStyle(att.type, att.name)
                    const isImage = att.type.startsWith('image/')
                    return (
                      <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: '9px 12px' }}>
                        {isImage && att.url !== '#' ? (
                          <img src={att.url} alt={att.name} style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 7, background: fs.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className={`bi ${fs.icon}`} style={{ fontSize: 16, color: fs.color }} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#09090B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                          <div style={{ fontSize: 10, color: '#A1A1AA', marginTop: 2 }}>{formatBytes(att.size)} · {att.uploader_name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          {att.url !== '#' && (
                            <a href={att.url} download={att.name} target="_blank" rel="noreferrer" style={{ width: 28, height: 28, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} title="Download">
                              <i className="bi bi-download" style={{ fontSize: 11, color: '#3B82F6' }} />
                            </a>
                          )}
                          {onRemoveAttachment && (
                            <button type="button" onClick={() => onRemoveAttachment(att.id)} style={{ width: 28, height: 28, borderRadius: 7, background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remove">
                              <i className="bi bi-x-lg" style={{ fontSize: 11, color: '#EF4444' }} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Upload zone — only if onUploadFile provided and slots remain */}
              {onUploadFile && (task.attachments ?? []).length < MAX_FILES && (
                <>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragModal(true) }}
                    onDragLeave={() => setIsDragModal(false)}
                    onDrop={e => { e.preventDefault(); setIsDragModal(false); handleModalFiles(e.dataTransfer.files) }}
                    onClick={() => modalFileRef.current?.click()}
                    style={{ border: `2px dashed ${isDragModal ? accentColor : 'rgba(0,0,0,0.12)'}`, borderRadius: 10, padding: '16px', textAlign: 'center', cursor: 'pointer', background: isDragModal ? accentBg : '#FAFAFA', transition: 'all 0.15s' }}
                  >
                    {isUploadingFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: '#71717A' }}>
                        <span className="spinner-border spinner-border-sm" />Uploading...
                      </div>
                    ) : (
                      <>
                        <i className="bi bi-cloud-upload" style={{ fontSize: 22, color: isDragModal ? accentColor : '#A1A1AA', display: 'block', marginBottom: 6 }} />
                        <div style={{ fontSize: 12, fontWeight: 600, color: isDragModal ? accentColor : '#52525B' }}>
                          Drop files here or <span style={{ color: accentColor, textDecoration: 'underline' }}>browse</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 3 }}>
                          Images · Videos · PDF · Word · Excel &nbsp;·&nbsp; Max 20 MB · {MAX_FILES - (task.attachments ?? []).length} slot{MAX_FILES - (task.attachments ?? []).length !== 1 ? 's' : ''} left
                        </div>
                      </>
                    )}
                  </div>
                  <input ref={modalFileRef} type="file" multiple accept={ACCEPTED_TYPES} style={{ display: 'none' }} onChange={e => { handleModalFiles(e.target.files); e.target.value = '' }} />
                </>
              )}

              {(task.attachments ?? []).length >= MAX_FILES && (
                <div style={{ fontSize: 12, color: '#71717A', background: '#F4F4F5', borderRadius: 8, padding: '8px 12px' }}>
                  <i className="bi bi-check-circle-fill" style={{ color: '#10B981', marginRight: 6 }} />
                  {MAX_FILES} files attached — limit reached.
                </div>
              )}

              {fileUploadError && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="bi bi-exclamation-triangle-fill" />{fileUploadError}
                </div>
              )}
            </div>

            {/* Tag Colleagues */}
            <div>
              <label className="sfr2-field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="bi bi-at" style={{ color: accentColor }} />
                Tag Colleagues
                <span style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
              </label>
              <p style={{ fontSize: 12, color: '#71717A', margin: '0 0 10px', lineHeight: 1.5 }}>
                Tag people you want to see this task and your work submission. They'll be notified and can view your report.
              </p>
              {taggedIds.length > 0 && (
                <div className="d-flex flex-wrap gap-2" style={{ marginBottom: 10 }}>
                  {taggedIds.map(id => {
                    const u = (users ?? []).find(x => x.id === id)
                    if (!u) return null
                    return (
                      <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#fff', background: accentColor, padding: '4px 8px 4px 6px', borderRadius: 20 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800 }}>
                          {u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        {u.full_name}
                        <button type="button" onClick={() => removeTag(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                          <i className="bi bi-x" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '8px 12px', background: '#FAFAFA', gap: 6 }}>
                  <i className="bi bi-at" style={{ color: '#A1A1AA', fontSize: 15 }} />
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={e => setTagSearch(e.target.value)}
                    placeholder="Search by name..."
                    style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, background: 'transparent', fontFamily: 'inherit' }}
                  />
                  {tagSearch && (
                    <button type="button" onClick={() => setTagSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A1A1AA', padding: 0, lineHeight: 1, display: 'flex' }}>
                      <i className="bi bi-x" />
                    </button>
                  )}
                </div>
                {tagSearch.trim().length > 0 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 20, overflow: 'hidden' }}>
                    {filteredTagUsers.length > 0 ? filteredTagUsers.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => addTag(u)}
                        style={{ width: '100%', padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F4F4F5')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${accentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: accentColor, flexShrink: 0 }}>
                          {u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#09090B' }}>{u.full_name}</div>
                          <div style={{ fontSize: 11, color: '#71717A' }}>{u.role_name} · {u.branch_name ?? '—'}</div>
                        </div>
                        <i className="bi bi-plus-circle" style={{ color: accentColor, fontSize: 14 }} />
                      </button>
                    )) : (
                      <div style={{ padding: '12px 16px', fontSize: 12, color: '#A1A1AA', textAlign: 'center' }}>
                        No users found for "{tagSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 4 — Revision Response (resubmit only) */}
            {mode === 'resubmit' && (
              <div>
                <label className="sfr2-field-label">
                  4. How You Addressed the Feedback <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <p style={{ fontSize: 12, color: '#71717A', margin: '0 0 8px', lineHeight: 1.5 }}>
                  Specifically explain what was revised or corrected based on the rejection feedback.
                </p>
                <textarea
                  className="sfr2-textarea"
                  rows={3}
                  value={revisionResponse}
                  onChange={e => { setRevisionResponse(e.target.value); if (errors.revisionResponse) setErrors(p => ({ ...p, revisionResponse: '' })) }}
                  placeholder="e.g. Added the missing budget figures for Q1. Updated the compliance section with the corrected percentages as requested."
                  onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = errors.revisionResponse ? '#EF4444' : 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none' }}
                  style={{ borderColor: errors.revisionResponse ? '#EF4444' : undefined } as React.CSSProperties}
                />
                {errors.revisionResponse && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errors.revisionResponse}</div>}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{ padding: '12px 24px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: '#FAFAFA' }}>
            <button onClick={onClose} disabled={isPending} style={{ background: '#F4F4F5', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: '#52525B', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                background: isPending ? '#E4E4E7' : `linear-gradient(135deg,${accentColor},${accentColor}cc)`,
                color: isPending ? '#A1A1AA' : '#fff',
                border: 'none', borderRadius: 10, padding: '10px 22px',
                fontSize: 13, fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: isPending ? 'none' : `0 4px 12px ${accentColor}40`,
                transition: 'all 0.2s',
              }}
            >
              {isPending
                ? <><span className="spinner-border spinner-border-sm" />Submitting...</>
                : <><i className={`bi ${mode === 'resubmit' ? 'bi-arrow-repeat' : 'bi-send'}`} />{mode === 'resubmit' ? 'Resubmit for Review' : 'Submit for Review'}</>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
