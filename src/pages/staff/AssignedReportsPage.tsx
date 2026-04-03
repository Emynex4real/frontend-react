import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { staffApi } from '../../services/api';
import type { Report, ReportEntry } from '../../types';

// ── Deadline ─────────────────────────────────────────────────────
function getDeadline(): Date {
  const now = new Date();
  const daysToSat = (6 - now.getDay() + 7) % 7;
  const sat = new Date(now);
  sat.setDate(now.getDate() + daysToSat);
  sat.setHours(23, 59, 59, 0);
  if (sat <= now) sat.setDate(sat.getDate() + 7);
  return sat;
}

function thisWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(new Date(now).setDate(diff));
  return mon.toISOString().split('T')[0];
}

const deadline = getDeadline();
const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);

const CAT_COLOR: Record<string, { bg: string; color: string; icon: string }> = {
  Activity: { bg: 'rgba(249,115,22,.1)',  color: '#F97316', icon: 'bi-activity' },
  Sales:    { bg: 'rgba(14,165,233,.1)',  color: '#0EA5E9', icon: 'bi-graph-up-arrow' },
  IT:       { bg: 'rgba(139,92,246,.1)',  color: '#7C3AED', icon: 'bi-cpu' },
  Attendance:{ bg:'rgba(16,185,129,.1)',  color: '#059669', icon: 'bi-person-check' },
  default:  { bg: 'rgba(100,116,139,.1)', color: '#475569', icon: 'bi-file-earmark-text' },
};
function catStyle(cat?: string) { return CAT_COLOR[cat ?? ''] ?? CAT_COLOR.default; }

const STATUS_STYLE = {
  approved:    { bg: 'rgba(16,185,129,.1)', text: '#059669', dot: '#10B981', icon: 'bi-check-circle-fill',   label: 'Approved' },
  pending:     { bg: 'rgba(245,158,11,.1)', text: '#D97706', dot: '#F59E0B', icon: 'bi-hourglass-split',      label: 'Pending' },
  rejected:    { bg: 'rgba(239,68,68,.1)',  text: '#DC2626', dot: '#EF4444', icon: 'bi-x-circle-fill',        label: 'Rejected' },
  not_submitted:{ bg: 'rgba(0,0,0,.04)',   text: '#71717A', dot: '#A1A1AA', icon: 'bi-clock',                label: 'Not Submitted' },
};

type AssignedTab = 'current' | 'history';

export default function AssignedReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<AssignedTab>('current');

  const roleId   = user?.role_id   ?? 3;
  const branchId = user?.branch_id ?? 1;
  const userId   = user?.id        ?? 1;
  const weekStart = thisWeekStart();

  // ── Queries ───────────────────────────────────────────────────
  const { data: assignedRes, isLoading: loadingReports } = useQuery({
    queryKey: ['assigned-reports', roleId, branchId],
    queryFn: () => staffApi.getAssignedReports(roleId, branchId),
  });
  const { data: myEntriesRes, isLoading: loadingEntries } = useQuery({
    queryKey: ['my-entries', userId],
    queryFn: () => staffApi.getMyEntries(userId),
  });

  const assignedReports: Report[]  = assignedRes?.data  ?? [];
  const myEntries: ReportEntry[]   = myEntriesRes?.data ?? [];

  // For each report, find the user's latest submission this week
  const entryByReportThisWeek = useMemo(() => {
    const map = new Map<number, ReportEntry>();
    myEntries
      .filter(e => e.week_start === weekStart)
      .forEach(e => {
        const existing = map.get(e.report_id);
        if (!existing || new Date(e.created_at) > new Date(existing.created_at)) {
          map.set(e.report_id, e);
        }
      });
    return map;
  }, [myEntries, weekStart]);

  // History: all past entries grouped by report + week
  const historyEntries = useMemo(() =>
    myEntries
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [myEntries]
  );

  const isLoading = loadingReports || loadingEntries;

  return (
    <div className="ar-page">
      <style>{`
        .ar-page {
          font-family: -apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif;
          padding: 8px;
        }
        /* ── Header ── */
        .ar-title { font-size: 26px; font-weight: 700; letter-spacing: -.6px; color: #09090B; margin: 0; }
        .ar-sub   { font-size: 14px; color: #71717A; margin: 4px 0 0 0; }

        /* ── Deadline banner ── */
        .ar-deadline {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 20px;
          border-radius: 14px;
          background: ${daysLeft <= 1 ? 'rgba(239,68,68,.07)' : daysLeft <= 3 ? 'rgba(245,158,11,.07)' : 'rgba(16,185,129,.07)'};
          border: 1px solid ${daysLeft <= 1 ? 'rgba(239,68,68,.2)' : daysLeft <= 3 ? 'rgba(245,158,11,.2)' : 'rgba(16,185,129,.2)'};
          margin-bottom: 24px;
        }
        .ar-deadline-icon { font-size: 22px; color: ${daysLeft <= 1 ? '#DC2626' : daysLeft <= 3 ? '#D97706' : '#059669'}; }

        /* ── Tabs ── */
        .ar-tabs { display: flex; gap: 4px; background: rgba(0,0,0,.03); border-radius: 12px; padding: 4px; width: fit-content; margin-bottom: 20px; }
        .ar-tab {
          padding: 7px 18px; border-radius: 9px; border: none;
          background: transparent; font-size: 13px; font-weight: 500;
          color: #71717A; cursor: pointer; display: flex; align-items: center; gap: 6px;
          transition: all .2s ease;
        }
        .ar-tab.active { background: #fff; color: #09090B; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
        .ar-tab:hover:not(.active) { color: #09090B; }

        /* ── Report card ── */
        .ar-card {
          background: #fff; border: 1px solid rgba(0,0,0,.06);
          border-radius: 16px; padding: 22px 24px;
          margin-bottom: 14px;
          transition: all .25s ease;
        }
        .ar-card:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(0,0,0,.04); }
        .ar-card:last-child { margin-bottom: 0; }
        .ar-card-top { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
        .ar-cat-icon {
          width: 46px; height: 46px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
          border: 1px solid;
        }
        .ar-report-name { font-size: 16px; font-weight: 700; color: #09090B; margin: 0 0 4px 0; }
        .ar-report-desc { font-size: 13px; color: #71717A; line-height: 1.5; }
        .ar-meta-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .ar-chip {
          background: rgba(0,0,0,.03); border: 1px solid rgba(0,0,0,.05);
          color: #52525B; font-size: 11px; font-weight: 600;
          padding: 3px 9px; border-radius: 6px;
          display: flex; align-items: center; gap: 4px;
        }

        /* ── Status + CTA row ── */
        .ar-card-footer {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
          padding-top: 16px; margin-top: 16px;
          border-top: 1px solid rgba(0,0,0,.04);
        }
        .ar-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 100px;
          font-size: 12px; font-weight: 700; text-transform: capitalize;
        }
        .ar-dot { width: 6px; height: 6px; border-radius: 50%; }

        .ar-btn-fill {
          background: #F97316; color: #fff; border: none;
          border-radius: 9px; padding: 9px 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 7px;
          transition: all .2s ease; box-shadow: 0 4px 10px rgba(249,115,22,.25);
        }
        .ar-btn-fill:hover { background: #EA580C; transform: translateY(-1px); }

        .ar-btn-view {
          background: #fff; color: #09090B; border: 1px solid rgba(0,0,0,.1);
          border-radius: 9px; padding: 9px 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 7px;
          transition: all .2s ease;
        }
        .ar-btn-view:hover { background: #F4F4F5; }

        .ar-btn-resubmit {
          background: #fff; color: #DC2626; border: 1px solid rgba(239,68,68,.3);
          border-radius: 9px; padding: 9px 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 7px;
          transition: all .2s ease;
        }
        .ar-btn-resubmit:hover { background: rgba(239,68,68,.05); border-color: rgba(239,68,68,.5); }

        /* ── History row ── */
        .ar-history-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 0; border-bottom: 1px solid rgba(0,0,0,.04);
          cursor: pointer; border-radius: 8px; padding-inline: 8px;
          transition: background .15s;
        }
        .ar-history-row:hover { background: rgba(249,115,22,.03); }
        .ar-history-row:last-child { border-bottom: none; }

        /* ── Empty ── */
        .ar-empty { text-align: center; padding: 60px 20px; }
        .ar-empty-icon { width: 64px; height: 64px; background: rgba(249,115,22,.05); border-radius: 18px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
      `}</style>

      {/* ── Header ── */}
      <div className="mb-4">
        <h1 className="ar-title">Assigned Reports</h1>
        <p className="ar-sub">Reports assigned to your role — fill and submit them before the weekly deadline.</p>
      </div>

      {/* ── Deadline Banner ── */}
      <div className="ar-deadline">
        <i className={`bi ${daysLeft <= 1 ? 'bi-fire' : daysLeft <= 3 ? 'bi-exclamation-triangle-fill' : 'bi-calendar-check'} ar-deadline-icon`} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: daysLeft <= 1 ? '#DC2626' : daysLeft <= 3 ? '#D97706' : '#059669' }}>
            {daysLeft <= 0 ? 'Deadline has passed!' : daysLeft === 1 ? 'Due Tonight — Last chance to submit!' : `${daysLeft} days until deadline`}
          </div>
          <div style={{ fontSize: 13, color: '#71717A', marginTop: 2 }}>
            Weekly deadline: <strong>every Saturday at 11:59 PM</strong>
          </div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: '#71717A' }}>
          {deadline.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* ── Tabs ── */}
      <div className="ar-tabs">
        <button className={`ar-tab ${tab === 'current' ? 'active' : ''}`} onClick={() => setTab('current')}>
          <i className="bi bi-calendar-week" style={{ fontSize: 13 }} />
          This Week
          {assignedReports.filter(r => !entryByReportThisWeek.has(r.id)).length > 0 && (
            <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100 }}>
              {assignedReports.filter(r => !entryByReportThisWeek.has(r.id)).length}
            </span>
          )}
        </button>
        <button className={`ar-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <i className="bi bi-clock-history" style={{ fontSize: 13 }} />
          Previous Submissions
        </button>
      </div>

      {/* ── LOADING ── */}
      {isLoading && (
        <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: 300 }}>
          <div className="spinner-border" style={{ color: '#F97316', width: '2.2rem', height: '2.2rem' }} />
          <span style={{ color: '#71717A', fontSize: 14, marginTop: 16, fontWeight: 500 }}>Loading your reports…</span>
        </div>
      )}

      {/* ── THIS WEEK TAB ── */}
      {!isLoading && tab === 'current' && (
        <div>
          {assignedReports.length === 0 ? (
            <div className="ar-empty">
              <div className="ar-empty-icon">
                <i className="bi bi-inbox" style={{ fontSize: 28, color: '#F97316' }} />
              </div>
              <h6 style={{ fontWeight: 700, color: '#09090B', fontSize: 16, margin: 0 }}>No reports assigned yet</h6>
              <p style={{ color: '#71717A', fontSize: 14, marginTop: 6 }}>
                Your manager hasn't assigned any report templates to your role yet. Check back later.
              </p>
            </div>
          ) : (
            assignedReports.map(report => {
              const submission = entryByReportThisWeek.get(report.id);
              const ss = submission
                ? STATUS_STYLE[submission.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending
                : STATUS_STYLE.not_submitted;
              const cs = catStyle(report.category);

              return (
                <div key={report.id} className="ar-card">
                  <div className="ar-card-top">
                    <div
                      className="ar-cat-icon"
                      style={{ background: cs.bg, color: cs.color, borderColor: `${cs.color}20` }}
                    >
                      <i className={`bi ${cs.icon}`} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 className="ar-report-name">{report.title}</h3>
                      {report.description && (
                        <p className="ar-report-desc">
                          {report.description.length > 120
                            ? report.description.slice(0, 120) + '…'
                            : report.description}
                        </p>
                      )}
                      <div className="ar-meta-chips">
                        <span className="ar-chip"><i className="bi bi-list-check" /> {report.fields?.length ?? 0} fields</span>
                        {report.category && <span className="ar-chip"><i className="bi bi-tag" /> {report.category}</span>}
                        <span className="ar-chip">
                          <i className={`bi ${report.priority === 'high' ? 'bi-arrow-up-circle-fill' : 'bi-dash-circle'}`}
                            style={{ color: report.priority === 'high' ? '#EF4444' : '#A1A1AA' }} />
                          {report.priority} priority
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ar-card-footer">
                    {/* Status */}
                    <span className="ar-pill" style={{ background: ss.bg, color: ss.text }}>
                      <span className="ar-dot" style={{ background: ss.dot }} />
                      {ss.label}
                    </span>

                    {/* CTA */}
                    <div className="d-flex gap-2 flex-wrap">
                      {!submission && (
                        <button
                          className="ar-btn-fill"
                          onClick={() => navigate(`/entries/new`)}
                        >
                          <i className="bi bi-pencil-square" />
                          Fill & Submit
                        </button>
                      )}
                      {submission && submission.status === 'rejected' && (
                        <button
                          className="ar-btn-resubmit"
                          onClick={() => navigate(`/my-submissions/${submission.id}/resubmit`)}
                        >
                          <i className="bi bi-arrow-clockwise" />
                          Edit & Resubmit
                        </button>
                      )}
                      {submission && submission.status !== 'rejected' && (
                        <button
                          className="ar-btn-view"
                          onClick={() => navigate('/my-submissions')}
                        >
                          <i className="bi bi-eye" />
                          View Submission
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rejection comment inline */}
                  {submission?.status === 'rejected' && submission.rejection_comment && (
                    <div style={{
                      marginTop: 14, padding: '12px 16px',
                      background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)',
                      borderLeft: '3px solid #EF4444', borderRadius: 10,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>
                        <i className="bi bi-chat-square-text me-1" />
                        Rejection Reason
                      </div>
                      <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>
                        {submission.rejection_comment}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {!isLoading && tab === 'history' && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 16, overflow: 'hidden' }}>
          {historyEntries.length === 0 ? (
            <div className="ar-empty">
              <i className="bi bi-clock-history" style={{ fontSize: 32, color: '#E4E4E7', display: 'block', marginBottom: 10 }} />
              <div style={{ fontSize: 14, color: '#A1A1AA', fontWeight: 500 }}>No submission history yet</div>
            </div>
          ) : (
            <div style={{ padding: '8px 16px' }}>
              {historyEntries.map(e => {
                const ss = STATUS_STYLE[e.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending;
                return (
                  <div
                    key={e.id}
                    className="ar-history-row"
                    onClick={() => e.status === 'rejected'
                      ? navigate(`/my-submissions/${e.id}/resubmit`)
                      : navigate('/my-submissions')
                    }
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flex: 'none',
                      background: ss.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`bi ${ss.icon}`} style={{ color: ss.text, fontSize: 15 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#09090B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.report_title ?? `Report #${e.report_id}`}
                      </div>
                      <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>
                        {e.week_label ?? '—'} · {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-10">
                      <span className="ar-pill" style={{ background: ss.bg, color: ss.text }}>
                        <span className="ar-dot" style={{ background: ss.dot }} />
                        {ss.label}
                      </span>
                      {e.status === 'rejected' && (
                        <span style={{ fontSize: 12, color: '#F97316', fontWeight: 600, marginLeft: 8 }}>
                          <i className="bi bi-arrow-clockwise me-1" />
                          Resubmit
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
