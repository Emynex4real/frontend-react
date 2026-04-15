import { useState } from 'react'
import type { Task, SubTask } from '../../types'

interface Props {
  task: Task
  mode: 'submit' | 'resubmit'
  onClose: () => void
  onSubmit: (
    achievement_summary: string,
    key_outcomes: string[],
    challenges_faced: string,
    revision_response: string,
  ) => void
  isPending: boolean
}

export default function SubmitForReviewModal({ task, mode, onClose, onSubmit, isPending }: Props) {
  const [summary, setSummary] = useState(task.achievement_summary ?? '')
  const [outcomes, setOutcomes] = useState<string[]>(
    task.key_outcomes?.length ? task.key_outcomes : ['']
  )
  const [challenges, setChallenges] = useState(task.challenges_faced ?? '')
  const [revisionResponse, setRevisionResponse] = useState(task.revision_response ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    onSubmit(summary.trim(), filledOutcomes, challenges.trim(), revisionResponse.trim())
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
