import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  approved: { bg: 'rgba(16,185,129,0.08)', text: '#059669', dot: '#10B981', border: 'rgba(16,185,129,0.2)' },
  rejected:  { bg: 'rgba(239,68,68,0.08)',  text: '#DC2626', dot: '#EF4444', border: 'rgba(239,68,68,0.2)'  },
  pending:   { bg: 'rgba(245,158,11,0.08)',  text: '#D97706', dot: '#F59E0B', border: 'rgba(245,158,11,0.2)'  },
};

const FIELD_ICONS: Record<string, string> = {
  date:         'bi-calendar3',
  activities:   'bi-activity',
  challenges:   'bi-exclamation-triangle',
  next_week_plan: 'bi-arrow-right-circle',
};

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const qc = useQueryClient();

  // ── Modal state ──────────────────────────────────────
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment]     = useState('');
  const [commentError, setCommentError]       = useState('');

  // ── Data ─────────────────────────────────────────────
  const { data: res, isLoading } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => submissionsApi.getOne(Number(id)),
    enabled: !!id,
  });

  const entry = res?.data;

  // ── Review mutation ───────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: (action: { status: 'approved' | 'rejected'; rejection_comment?: string }) =>
      submissionsApi.review(Number(id), action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submission', id] });
      qc.invalidateQueries({ queryKey: ['submissions'] });
      setShowRejectModal(false);
      setRejectComment('');
    },
  });

  const handleApprove = () => {
    if (window.confirm(`Approve the report submitted by ${entry?.submitter_name}?`)) {
      reviewMutation.mutate({ status: 'approved' });
    }
  };

  const handleRejectSubmit = () => {
    if (!rejectComment.trim()) {
      setCommentError('Please provide a reason for rejection.');
      return;
    }
    setCommentError('');
    reviewMutation.mutate({ status: 'rejected', rejection_comment: rejectComment.trim() });
  };

  // ── Loading ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: 400 }}>
        <div className="spinner-border" style={{ color: '#F97316', width: '2.2rem', height: '2.2rem' }} />
        <span style={{ color: '#71717A', fontSize: 14, marginTop: 14, fontWeight: 500 }}>Loading report…</span>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-exclamation-triangle" style={{ fontSize: 40, color: '#F59E0B' }} />
        <h6 style={{ marginTop: 16, fontWeight: 600 }}>Submission not found</h6>
        <button className="sd-back-btn mt-3" onClick={() => navigate('/submissions')}>
          <i className="bi bi-arrow-left me-2" /> Back to Review
        </button>
      </div>
    );
  }

  const st = STATUS_STYLE[entry.status] || STATUS_STYLE.pending;
  const initials = (entry.submitter_name ?? 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const canReview = can('approve_reports') && entry.status === 'pending';

  return (
    <div className="sd-page">
      <style>{`
        .sd-page {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          padding: 8px;
        }

        /* ── Back / Header ── */
        .sd-back-btn {
          background: #FFFFFF;
          color: #3F3F46;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 10px;
          padding: 7px 16px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          transition: all 0.2s ease;
        }
        .sd-back-btn:hover {
          background: #F4F4F5;
          color: #09090B;
        }

        /* ── Profile Hero ── */
        .sd-hero {
          background: #FFFFFF;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }
        .sd-avatar-lg {
          width: 60px; height: 60px;
          border-radius: 18px;
          background: linear-gradient(135deg, #F97316, #EA580C);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 8px 20px rgba(249,115,22,0.25);
        }
        .sd-hero-meta {
          flex: 1;
        }
        .sd-hero-name {
          font-size: 22px;
          font-weight: 700;
          color: #09090B;
          letter-spacing: -0.5px;
          margin: 0 0 4px 0;
        }
        .sd-hero-sub {
          font-size: 13px;
          color: #71717A;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sd-hero-sub span { display: flex; align-items: center; gap: 5px; }
        .sd-hero-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* ── Status Pill ── */
        .sd-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 700;
          text-transform: capitalize;
          border: 1px solid;
        }
        .sd-dot { width: 8px; height: 8px; border-radius: 50%; }

        /* ── Action Buttons ── */
        .sd-btn-approve {
          background: #059669;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          padding: 9px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(5,150,105,0.25);
        }
        .sd-btn-approve:hover:not(:disabled) {
          background: #047857;
          transform: translateY(-1px);
        }
        .sd-btn-approve:disabled { opacity: 0.6; cursor: not-allowed; }

        .sd-btn-reject {
          background: #FFFFFF;
          color: #DC2626;
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          padding: 9px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .sd-btn-reject:hover:not(:disabled) {
          background: rgba(239,68,68,0.05);
          border-color: rgba(239,68,68,0.5);
          transform: translateY(-1px);
        }
        .sd-btn-reject:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Cards ── */
        .sd-card {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.02);
        }
        .sd-card-title {
          font-size: 13px;
          font-weight: 700;
          color: #A1A1AA;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Report Fields ── */
        .sd-field-block {
          padding: 16px;
          background: rgba(0,0,0,0.015);
          border: 1px solid rgba(0,0,0,0.04);
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .sd-field-block:last-child { margin-bottom: 0; }
        .sd-field-label {
          font-size: 11px;
          font-weight: 700;
          color: #A1A1AA;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sd-field-value {
          font-size: 14px;
          font-weight: 500;
          color: #09090B;
          line-height: 1.6;
        }

        /* ── Meta list ── */
        .sd-meta-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          font-size: 13px;
        }
        .sd-meta-item:last-child { border-bottom: none; padding-bottom: 0; }
        .sd-meta-key { color: #71717A; font-weight: 500; }
        .sd-meta-val { color: #09090B; font-weight: 600; text-align: right; max-width: 60%; }

        /* ── Rejection Banner ── */
        .sd-rejection-banner {
          background: rgba(239,68,68,0.05);
          border: 1px solid rgba(239,68,68,0.15);
          border-left: 3px solid #EF4444;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 20px;
        }
        .sd-rejection-banner-title {
          font-size: 13px;
          font-weight: 700;
          color: #DC2626;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .sd-rejection-banner-text {
          font-size: 13px;
          color: #7F1D1D;
          line-height: 1.6;
        }

        /* ── Approval Banner ── */
        .sd-approval-banner {
          background: rgba(16,185,129,0.05);
          border: 1px solid rgba(16,185,129,0.15);
          border-left: 3px solid #10B981;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 20px;
        }
        .sd-approval-banner-title {
          font-size: 13px;
          font-weight: 700;
          color: #059669;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Modal Overlay ── */
        .sd-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .sd-modal {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 28px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.2);
          animation: sd-modal-in 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes sd-modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .sd-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #09090B;
          margin-bottom: 6px;
        }
        .sd-modal-sub {
          font-size: 13px;
          color: #71717A;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .sd-textarea {
          width: 100%;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
          color: #09090B;
          resize: vertical;
          min-height: 120px;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }
        .sd-textarea:focus {
          border-color: rgba(239,68,68,0.4);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
        }
        .sd-textarea-error {
          border-color: #EF4444;
        }
        .sd-error-text {
          font-size: 12px;
          color: #DC2626;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .sd-modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          justify-content: flex-end;
        }
        .sd-btn-cancel {
          background: #F4F4F5;
          color: #3F3F46;
          border: none;
          border-radius: 10px;
          padding: 9px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sd-btn-cancel:hover { background: #E4E4E7; }
        .sd-btn-confirm-reject {
          background: #DC2626;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          padding: 9px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(220,38,38,0.25);
        }
        .sd-btn-confirm-reject:hover:not(:disabled) {
          background: #B91C1C;
          transform: translateY(-1px);
        }
        .sd-btn-confirm-reject:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      {/* ── Back Button ── */}
      <div className="mb-4">
        <button className="sd-back-btn" onClick={() => navigate('/submissions')}>
          <i className="bi bi-arrow-left me-2" />
          Back to Report Review
        </button>
      </div>

      {/* ── Rejection / Approval Banners ── */}
      {entry.status === 'rejected' && entry.rejection_comment && (
        <div className="sd-rejection-banner">
          <div className="sd-rejection-banner-title">
            <i className="bi bi-x-circle-fill" />
            Report Rejected
          </div>
          <div className="sd-rejection-banner-text">
            <strong>Reason:</strong> {entry.rejection_comment}
          </div>
        </div>
      )}
      {entry.status === 'approved' && (
        <div className="sd-approval-banner">
          <div className="sd-approval-banner-title">
            <i className="bi bi-check-circle-fill" />
            This report has been approved
          </div>
        </div>
      )}

      {/* ── Hero Section ── */}
      <div className="sd-hero">
        <div className="sd-avatar-lg">{initials}</div>
        <div className="sd-hero-meta">
          <h1 className="sd-hero-name">{entry.submitter_name ?? 'Unknown Staff'}</h1>
          <div className="sd-hero-sub">
            <span><i className="bi bi-buildings" style={{ color: '#A1A1AA' }} /> {entry.branch_name ?? '—'}</span>
            {entry.department_name && (
              <span><i className="bi bi-diagram-3" style={{ color: '#A1A1AA' }} /> {entry.department_name}</span>
            )}
            {entry.submitter_role && (
              <span><i className="bi bi-person-badge" style={{ color: '#A1A1AA' }} /> {entry.submitter_role}</span>
            )}
            {entry.manager_name && (
              <span><i className="bi bi-person-workspace" style={{ color: '#A1A1AA' }} /> Reports to: {entry.manager_name}</span>
            )}
          </div>
        </div>

        <div className="sd-hero-actions">
          {/* Status pill */}
          <span
            className="sd-pill"
            style={{ background: st.bg, color: st.text, borderColor: st.border }}
          >
            <span className="sd-dot" style={{ background: st.dot }} />
            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
          </span>

          {/* Approve / Reject */}
          {canReview && (
            <>
              <button
                className="sd-btn-approve"
                onClick={handleApprove}
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <i className="bi bi-check-circle" />
                )}
                Approve
              </button>
              <button
                className="sd-btn-reject"
                onClick={() => setShowRejectModal(true)}
                disabled={reviewMutation.isPending}
              >
                <i className="bi bi-x-circle" />
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="row g-3">
        {/* ── Left: Report Fields ── */}
        <div className="col-lg-8">
          <div className="sd-card">
            <div className="sd-card-title">
              <i className="bi bi-file-text" style={{ color: '#F97316' }} />
              Report Content
            </div>

            {Object.keys(entry.data ?? {}).length === 0 ? (
              <p style={{ color: '#A1A1AA', fontSize: 13, fontStyle: 'italic' }}>No data recorded in this submission.</p>
            ) : (
              Object.entries(entry.data).map(([key, value]) => {
                const humanKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const icon = FIELD_ICONS[key] ?? 'bi-journals';
                return (
                  <div key={key} className="sd-field-block">
                    <div className="sd-field-label">
                      <i className={`bi ${icon}`} style={{ color: '#F97316' }} />
                      {humanKey}
                    </div>
                    <div className="sd-field-value">
                      {String(value ?? '—')}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: Meta Details ── */}
        <div className="col-lg-4 d-flex flex-column gap-3">
          {/* Submission Meta */}
          <div className="sd-card">
            <div className="sd-card-title">
              <i className="bi bi-info-circle" style={{ color: '#F97316' }} />
              Submission Details
            </div>
            <div>
              {[
                { key: 'Report',       val: entry.report_title ?? `Report #${entry.report_id}` },
                { key: 'Week',         val: entry.week_label ?? '—' },
                { key: 'Branch',       val: entry.branch_name ?? '—' },
                { key: 'Department',   val: entry.department_name ?? '—' },
                { key: 'Submitted',    val: new Date(entry.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                { key: 'Last Updated', val: new Date(entry.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
              ].map(item => (
                <div key={item.key} className="sd-meta-item">
                  <span className="sd-meta-key">{item.key}</span>
                  <span className="sd-meta-val">{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review Status Card */}
          <div className="sd-card" style={{ border: `1px solid ${st.border}`, background: st.bg }}>
            <div className="sd-card-title" style={{ color: st.text }}>
              <i className={`bi ${
                entry.status === 'approved' ? 'bi-check-circle-fill' :
                entry.status === 'rejected' ? 'bi-x-circle-fill' :
                'bi-hourglass-split'
              }`} />
              Review Status
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: st.text, textTransform: 'capitalize' }}>
              {entry.status}
            </div>
            {entry.status === 'pending' && canReview && (
              <p style={{ fontSize: 12, color: '#71717A', marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
                Use the <strong>Approve</strong> or <strong>Reject</strong> buttons above to review this report.
              </p>
            )}
            {entry.status === 'pending' && !canReview && (
              <p style={{ fontSize: 12, color: '#71717A', marginTop: 6, marginBottom: 0 }}>
                Awaiting review from a manager or admin.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Reject Modal ── */}
      {showRejectModal && (
        <div className="sd-modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="sd-modal" onClick={e => e.stopPropagation()}>
            {/* Modal Icon */}
            <div style={{ width: 48, height: 48, background: 'rgba(239,68,68,0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <i className="bi bi-x-circle-fill" style={{ fontSize: 22, color: '#DC2626' }} />
            </div>
            <div className="sd-modal-title">Reject This Report</div>
            <div className="sd-modal-sub">
              You are rejecting the report submitted by <strong>{entry.submitter_name}</strong>. Please provide a clear reason so the staff member knows what to correct and resubmit.
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, color: '#09090B', display: 'block', marginBottom: 8 }}>
              Rejection Reason <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              className={`sd-textarea ${commentError ? 'sd-textarea-error' : ''}`}
              placeholder="e.g. Report is incomplete. Please include the weekly activity summary and budget figures before resubmitting."
              value={rejectComment}
              onChange={e => { setRejectComment(e.target.value); if (e.target.value.trim()) setCommentError(''); }}
              rows={5}
            />
            {commentError && (
              <div className="sd-error-text">
                <i className="bi bi-exclamation-circle" />
                {commentError}
              </div>
            )}

            <div className="sd-modal-actions">
              <button
                className="sd-btn-cancel"
                onClick={() => { setShowRejectModal(false); setRejectComment(''); setCommentError(''); }}
              >
                Cancel
              </button>
              <button
                className="sd-btn-confirm-reject"
                onClick={handleRejectSubmit}
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <i className="bi bi-x-circle" />
                )}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
