import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../../services/api';
import { reportsApi } from '../../services/api';
import type { ReportField } from '../../types';

export default function ResubmitEntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const entryId = Number(id);

  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // ── Fetch the existing rejected entry ────────────────────────
  const { data: entriesRes, isLoading: loadingEntries } = useQuery({
    queryKey: ['my-entries'],
    queryFn: () => staffApi.getMyEntries(1), // will already be cached
    staleTime: 30_000,
  });

  const entry = entriesRes?.data?.find(e => e.id === entryId);

  // ── Fetch the corresponding report template ──────────────────
  const { data: reportsRes, isLoading: loadingReports } = useQuery({
    queryKey: ['reports-published'],
    queryFn: reportsApi.getAll,
    enabled: !!entry,
  });

  const report = reportsRes?.data?.find((r: { id: number }) => r.id === entry?.report_id);

  // Pre-fill form from existing entry data
  useEffect(() => {
    if (entry?.data && Object.keys(formData).length === 0) {
      const prefilled: Record<string, unknown> = {};
      Object.entries(entry.data).forEach(([k, v]) => { prefilled[k] = v; });
      setFormData(prefilled);
    }
  }, [entry]);

  // ── Resubmit mutation ────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: () => staffApi.resubmit(entryId, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-entries'] });
      qc.invalidateQueries({ queryKey: ['assigned-reports'] });
      navigate('/my-submissions');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const isLoading = loadingEntries || loadingReports;

  // ── Field renderer (same as EntryFormPage) ────────────────────
  const renderField = (field: ReportField) => {
    const flexBasis = field.width === 'half' ? 'calc(50% - 10px)' : field.width === 'third' ? 'calc(33.333% - 14px)' : '100%';
    const value = (formData[field.id] ?? '') as string;

    if (field.type === 'section_header') {
      return (
        <div key={field.id} style={{ flexBasis: '100%', marginTop: 12 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#09090B', borderBottom: '1px solid rgba(0,0,0,.06)', paddingBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {field.label}
          </h4>
        </div>
      );
    }

    if (field.type === 'instructions') {
      return (
        <div key={field.id} style={{ flexBasis: '100%' }}>
          <div style={{ background: 'rgba(59,130,246,.05)', border: '1px solid rgba(59,130,246,.1)', padding: 14, borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', marginBottom: 4 }}>
              <i className="bi bi-info-circle me-1" /> Instructions
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#1E3A8A' }}>{field.label}</p>
          </div>
        </div>
      );
    }

    return (
      <div key={field.id} style={{ flexBasis, minWidth: 240, flexGrow: field.width === 'full' ? 1 : 0 }}>
        <label className="rs-label">
          {field.label}
          {field.required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
        </label>

        {field.type === 'textarea' ? (
          <textarea
            className="rs-input"
            style={{ resize: 'vertical', minHeight: 90 }}
            rows={4}
            required={field.required}
            value={value}
            onChange={e => setFormData(d => ({ ...d, [field.id]: e.target.value }))}
            placeholder={field.placeholder ?? ''}
          />
        ) : field.type === 'select' ? (
          <div style={{ position: 'relative' }}>
            <select
              className="rs-input"
              style={{ appearance: 'none', cursor: 'pointer', paddingRight: 32 }}
              required={field.required}
              value={value}
              onChange={e => setFormData(d => ({ ...d, [field.id]: e.target.value }))}
            >
              <option value="">— Select Option —</option>
              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        ) : field.type === 'rating' ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: 44 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} type="button" onClick={() => setFormData(d => ({ ...d, [field.id]: star }))}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 26, color: Number(value) >= star ? '#F59E0B' : '#E4E4E7', transition: 'color .15s' }}>
                <i className={`bi bi-star${Number(value) >= star ? '-fill' : ''}`} />
              </button>
            ))}
          </div>
        ) : (
          <input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            className="rs-input"
            required={field.required}
            value={value}
            onChange={e => setFormData(d => ({ ...d, [field.id]: e.target.value }))}
            placeholder={field.placeholder ?? ''}
          />
        )}
      </div>
    );
  };

  return (
    <div className="rs-page">
      <style>{`
        .rs-page {
          font-family: -apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif;
          padding: 8px;
        }

        /* ── Back btn ── */
        .rs-back {
          background: #fff; color: #3F3F46; border: 1px solid rgba(0,0,0,.08);
          border-radius: 10px; padding: 7px 16px; font-size: 13px; font-weight: 500;
          cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
          transition: all .2s ease; margin-bottom: 24px;
        }
        .rs-back:hover { background: #F4F4F5; color: #09090B; }

        /* ── Rejection reason card ── */
        .rs-rejection {
          background: rgba(239,68,68,.05); border: 1px solid rgba(239,68,68,.15);
          border-left: 3px solid #EF4444; border-radius: 14px;
          padding: 18px 20px; margin-bottom: 24px;
        }
        .rs-rejection-title { font-size: 13px; font-weight: 700; color: #DC2626; display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
        .rs-rejection-text  { font-size: 14px; color: #7F1D1D; line-height: 1.6; }

        /* ── Form card ── */
        .rs-form-card {
          background: rgba(255,255,255,.9); backdrop-filter: blur(20px);
          border: 1px solid rgba(0,0,0,.06); border-radius: 18px;
          padding: 28px 32px; max-width: 780px; margin: 0 auto;
          box-shadow: 0 4px 20px rgba(0,0,0,.03);
        }
        .rs-form-title { font-size: 20px; font-weight: 700; color: #09090B; margin: 0 0 20px 0; }

        .rs-fields { display: flex; flex-wrap: wrap; gap: 18px; }

        /* ── Inputs ── */
        .rs-label { display: block; font-size: 13px; font-weight: 600; color: #3F3F46; margin-bottom: 7px; letter-spacing: .1px; }
        .rs-input {
          width: 100%; background: rgba(0,0,0,.02); border: 1px solid rgba(0,0,0,.06);
          border-radius: 11px; padding: 11px 14px; font-size: 14px;
          color: #09090B; outline: none; transition: all .2s ease;
          font-family: inherit; box-sizing: border-box;
        }
        .rs-input:focus { background: #fff; border-color: rgba(249,115,22,.4); box-shadow: 0 0 0 3px rgba(249,115,22,.1); }
        .rs-input::placeholder { color: #A1A1AA; }

        /* ── Actions ── */
        .rs-actions { display: flex; gap: 12px; margin-top: 28px; padding-top: 22px; border-top: 1px solid rgba(0,0,0,.05); }
        .rs-btn-submit {
          background: #F97316; color: #fff; border: none; border-radius: 10px;
          padding: 10px 26px; font-size: 14px; font-weight: 600; cursor: pointer;
          display: inline-flex; align-items: center; gap: 8px;
          transition: all .2s ease; box-shadow: 0 4px 12px rgba(249,115,22,.25);
        }
        .rs-btn-submit:hover:not(:disabled) { background: #EA580C; transform: translateY(-1px); }
        .rs-btn-submit:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }
        .rs-btn-cancel {
          background: transparent; color: #71717A; border: none; border-radius: 10px;
          padding: 10px 24px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .2s;
        }
        .rs-btn-cancel:hover { background: rgba(0,0,0,.04); color: #09090B; }

        /* ── Error ── */
        .rs-error {
          background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2);
          color: #DC2626; padding: 11px 14px; border-radius: 10px;
          font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px;
          margin-top: 16px;
        }
      `}</style>

      {/* Back */}
      <button className="rs-back" onClick={() => navigate('/my-submissions')}>
        <i className="bi bi-arrow-left" />
        Back to My Submissions
      </button>

      {isLoading && (
        <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: 300 }}>
          <div className="spinner-border" style={{ color: '#F97316', width: '2rem', height: '2rem' }} />
          <span style={{ color: '#71717A', fontSize: 14, marginTop: 14, fontWeight: 500 }}>Loading report…</span>
        </div>
      )}

      {!isLoading && !entry && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <i className="bi bi-exclamation-triangle" style={{ fontSize: 40, color: '#F59E0B' }} />
          <h6 style={{ marginTop: 14, fontWeight: 600 }}>Submission not found</h6>
          <button className="rs-back mt-3" onClick={() => navigate('/my-submissions')}>Go back</button>
        </div>
      )}

      {!isLoading && entry && (
        <>
          {/* Rejection reason — always visible at top so staff knows what to fix */}
          {entry.rejection_comment && (
            <div className="rs-rejection" style={{ maxWidth: 780, margin: '0 auto 24px auto' }}>
              <div className="rs-rejection-title">
                <i className="bi bi-chat-square-x-fill" />
                Reviewer Feedback — Please Address Before Resubmitting
              </div>
              <div className="rs-rejection-text">{entry.rejection_comment}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="rs-form-card">
              <h2 className="rs-form-title">
                <i className="bi bi-arrow-clockwise me-2" style={{ color: '#F97316' }} />
                Edit & Resubmit: {entry.report_title ?? `Report #${entry.report_id}`}
              </h2>

              <div className="rs-fields">
                {report
                  ? [...(report.fields ?? [])]
                      .sort((a: ReportField, b: ReportField) => a.order - b.order)
                      .map(renderField)
                  : (
                    // Fallback: render from raw data keys if template not found
                    Object.entries(entry.data ?? {}).map(([key]) => {
                      const fakeField: ReportField = {
                        id: key, type: 'textarea', label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                        required: true, width: 'full', order: 0,
                      };
                      return renderField(fakeField);
                    })
                  )
                }
              </div>

              {mutation.isError && (
                <div className="rs-error">
                  <i className="bi bi-x-circle-fill" />
                  Failed to resubmit. Please check your connection and try again.
                </div>
              )}

              <div className="rs-actions">
                <button type="submit" className="rs-btn-submit" disabled={mutation.isPending}>
                  {mutation.isPending
                    ? <><span className="spinner-border spinner-border-sm" /> Submitting…</>
                    : <><i className="bi bi-send" /> Resubmit Report</>
                  }
                </button>
                <button type="button" className="rs-btn-cancel" onClick={() => navigate('/my-submissions')}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
