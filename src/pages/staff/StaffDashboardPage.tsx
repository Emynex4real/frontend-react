import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { staffApi, tasksApi } from '../../services/api';
import type { ReportEntry, Report } from '../../types';

// ── Deadline helpers ──────────────────────────────────────────────
function getDeadline(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun 6=Sat
  const daysToSat = (6 - day + 7) % 7;
  const sat = new Date(now);
  sat.setDate(now.getDate() + daysToSat);
  sat.setHours(23, 59, 59, 0);
  if (sat <= now) sat.setDate(sat.getDate() + 7); // already past, next week
  return sat;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatCountdown(ms: number) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

function getUrgency(ms: number): 'safe' | 'warning' | 'urgent' {
  const hours = ms / 3_600_000;
  if (hours <= 24) return 'urgent';
  if (hours <= 72) return 'warning';
  return 'safe';
}

const URGENCY = {
  safe:    { grad: 'linear-gradient(135deg,#059669,#047857)', label: 'On Track', icon: 'bi-check-circle-fill', labelColor: '#059669' },
  warning: { grad: 'linear-gradient(135deg,#D97706,#B45309)', label: 'Due Soon',  icon: 'bi-exclamation-triangle-fill', labelColor: '#D97706' },
  urgent:  { grad: 'linear-gradient(135deg,#DC2626,#B91C1C)', label: 'Urgent!',   icon: 'bi-fire',                      labelColor: '#DC2626' },
};

// ── This week's Monday ────────────────────────────────────────────
function thisWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(now.setDate(diff));
  return mon.toISOString().split('T')[0];
}

export default function StaffDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [msLeft, setMsLeft] = useState(() => getDeadline().getTime() - Date.now());

  // Live countdown ticker
  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(getDeadline().getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const countdown = formatCountdown(msLeft);
  const urgency = getUrgency(msLeft);
  const u = URGENCY[urgency];

  // ── Data ──────────────────────────────────────────────────────
  const roleId   = user?.role_id   ?? 3;
  const branchId = user?.branch_id ?? 1;
  const userId   = user?.id        ?? 1;

  const { data: myTaskStatsRes } = useQuery({
    queryKey: ['my-task-stats', userId],
    queryFn: () => tasksApi.getMyStats(userId, branchId),
    staleTime: 60000,
  });
  const myTaskStats = myTaskStatsRes?.data as { active: number; in_review: number; needs_revision: number; done: number } | undefined;

  const { data: assignedRes } = useQuery({
    queryKey: ['assigned-reports', roleId, branchId],
    queryFn: () => staffApi.getAssignedReports(roleId, branchId),
  });
  const { data: myEntriesRes } = useQuery({
    queryKey: ['my-entries', userId],
    queryFn: () => staffApi.getMyEntries(userId),
  });

  const assignedReports: Report[]      = assignedRes?.data  ?? [];
  const myEntries: ReportEntry[]        = myEntriesRes?.data ?? [];

  const weekStart = thisWeekStart();

  const stats = useMemo(() => {
    const thisWeek = myEntries.filter(e => e.week_start === weekStart);
    const submittedIds = new Set(thisWeek.map(e => e.report_id));
    return {
      dueThisWeek:  assignedReports.filter(r => !submittedIds.has(r.id)).length,
      submitted:    thisWeek.length,
      approved:     myEntries.filter(e => e.status === 'approved').length,
      rejected:     myEntries.filter(e => e.status === 'rejected').length,
      pending:      myEntries.filter(e => e.status === 'pending').length,
    };
  }, [assignedReports, myEntries, weekStart]);

  const notSubmittedThisWeek = useMemo(() => {
    const submittedIds = new Set(
      myEntries.filter(e => e.week_start === weekStart).map(e => e.report_id)
    );
    return assignedReports.filter(r => !submittedIds.has(r.id));
  }, [assignedReports, myEntries, weekStart]);

  const recentEntries = [...myEntries]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const firstName = (user?.full_name ?? 'there').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const STATUS_CONFIG = {
    approved: { bg: 'rgba(16,185,129,.1)', text: '#059669', dot: '#10B981' },
    pending:  { bg: 'rgba(245,158,11,.1)', text: '#D97706', dot: '#F59E0B' },
    rejected: { bg: 'rgba(239,68,68,.1)',  text: '#DC2626', dot: '#EF4444' },
  };

  return (
    <div className="std-page">
      <style>{`
        .std-page {
          font-family: -apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif;
          padding: 8px;
        }

        /* ── Greeting ── */
        .std-greeting { font-size: 26px; font-weight: 700; letter-spacing: -.6px; color: #09090B; margin: 0; }
        .std-sub { font-size: 14px; color: #71717A; margin: 4px 0 0 0; }

        /* ── Countdown card ── */
        .std-countdown-card {
          border-radius: 20px;
          padding: 28px 32px;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
        .std-countdown-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,.05);
          border-radius: inherit;
        }
        .std-countdown-left { z-index: 1; }
        .std-countdown-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; opacity: .8; margin-bottom: 6px;
          display: flex; align-items: center; gap: 6px;
        }
        .std-deadline-label {
          font-size: 14px; opacity: .85; margin-top: 8px;
        }
        .std-timer {
          display: flex; gap: 16px; flex-wrap: wrap; z-index: 1;
        }
        .std-timer-unit {
          text-align: center;
          background: rgba(0,0,0,.2);
          border-radius: 14px;
          padding: 12px 18px;
          min-width: 72px;
        }
        .std-timer-num { font-size: 32px; font-weight: 800; letter-spacing: -1px; line-height: 1; }
        .std-timer-lbl { font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; opacity: .7; margin-top: 4px; }

        /* ── Stat cards ── */
        .std-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 24px; }
        @media(max-width:768px){ .std-stats{ grid-template-columns:repeat(2,1fr); } }
        .std-stat {
          background: #fff; border: 1px solid rgba(0,0,0,.06);
          border-radius: 14px; padding: 18px 20px;
          display: flex; align-items: center; gap: 14px;
          transition: all .25s ease; cursor: default;
        }
        .std-stat:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,.05); }
        .std-stat-icon { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
        .std-stat-val { font-size: 24px; font-weight: 700; letter-spacing: -1px; color: #09090B; line-height: 1; }
        .std-stat-lbl { font-size: 11px; font-weight: 600; color: #A1A1AA; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }

        /* ── Section title ── */
        .std-sec-title {
          font-size: 13px; font-weight: 700; color: #A1A1AA;
          text-transform: uppercase; letter-spacing: .06em;
          margin: 0 0 14px 0; display: flex; align-items: center; gap: 8px;
        }

        /* ── Report-due card ── */
        .std-report-card {
          background: #fff; border: 1px solid rgba(0,0,0,.06);
          border-radius: 14px; padding: 18px 20px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
          transition: all .25s ease; cursor: pointer;
          margin-bottom: 10px;
        }
        .std-report-card:hover {
          border-color: rgba(249,115,22,.3);
          box-shadow: 0 8px 20px rgba(249,115,22,.07);
          transform: translateY(-1px);
        }
        .std-report-card:last-child { margin-bottom: 0; }
        .std-report-icon {
          width: 40px; height: 40px; border-radius: 11px;
          background: linear-gradient(135deg,rgba(249,115,22,.12),rgba(234,88,12,.06));
          border: 1px solid rgba(249,115,22,.12);
          color: #F97316; display: flex; align-items: center; justify-content: center;
          font-size: 16px; flex-shrink: 0;
        }
        .std-report-name { font-size: 14px; font-weight: 600; color: #09090B; line-height: 1.2; }
        .std-report-meta { font-size: 12px; color: #A1A1AA; margin-top: 2px; }
        .std-fill-btn {
          background: #F97316; color: #fff; border: none;
          border-radius: 9px; padding: 8px 18px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; gap: 6px;
          transition: all .2s ease; white-space: nowrap;
          box-shadow: 0 4px 10px rgba(249,115,22,.25);
        }
        .std-fill-btn:hover { background: #EA580C; transform: translateY(-1px); }

        /* ── All done card ── */
        .std-done-card {
          background: rgba(16,185,129,.05); border: 1px solid rgba(16,185,129,.15);
          border-radius: 14px; padding: 24px;
          text-align: center;
        }

        /* ── Activity list ── */
        .std-activity-row {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,.04);
          cursor: pointer; transition: background .15s ease;
          border-radius: 8px; padding-inline: 8px;
        }
        .std-activity-row:last-child { border-bottom: none; }
        .std-activity-row:hover { background: rgba(249,115,22,.03); }
        .std-activity-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
        .std-activity-title { font-size: 13px; font-weight: 600; color: #09090B; }
        .std-activity-meta { font-size: 11px; color: #A1A1AA; margin-top: 1px; }
        .std-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 100px;
          font-size: 11px; font-weight: 700; text-transform: capitalize;
          white-space: nowrap;
        }
        .std-dot { width: 5px; height: 5px; border-radius: 50%; }

        /* ── Card shell ── */
        .std-card {
          background: rgba(255,255,255,.9); backdrop-filter: blur(20px);
          border: 1px solid rgba(0,0,0,.05); border-radius: 16px;
          padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,.02);
        }

        /* ── Empty ── */
        .std-empty { text-align: center; padding: 32px 16px; }
      `}</style>

      {/* ── Greeting ── */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <h1 className="std-greeting">{greeting}, {firstName} 👋</h1>
          <p className="std-sub">Here's your weekly report dashboard.</p>
        </div>
        <div style={{ fontSize: 13, color: '#71717A', fontWeight: 500 }}>
          <i className="bi bi-calendar3 me-2" style={{ color: '#F97316' }} />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ── Deadline Countdown ── */}
      <div className="std-countdown-card" style={{ background: u.grad }}>
        <div className="std-countdown-left">
          <div className="std-countdown-eyebrow">
            <i className={`bi ${u.icon}`} />
            Weekly Report Deadline · {u.label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px' }}>
            Time Remaining
          </div>
          <div className="std-deadline-label">
            <i className="bi bi-calendar-check me-1" />
            Due every <strong>Saturday at midnight</strong>
          </div>
        </div>

        <div className="std-timer">
          {[
            { n: countdown.d, l: 'Days' },
            { n: countdown.h, l: 'Hours' },
            { n: countdown.m, l: 'Mins' },
            { n: countdown.s, l: 'Secs' },
          ].map(({ n, l }) => (
            <div key={l} className="std-timer-unit">
              <div className="std-timer-num">{pad(n)}</div>
              <div className="std-timer-lbl">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="std-stats">
        {[
          { label: 'Reports Due',  value: stats.dueThisWeek, icon: 'bi-hourglass',       bg: 'rgba(249,115,22,.1)',   color: '#F97316' },
          { label: 'Submitted',    value: stats.submitted,    icon: 'bi-send-check',       bg: 'rgba(14,165,233,.1)',   color: '#0EA5E9' },
          { label: 'Approved',     value: stats.approved,     icon: 'bi-check-circle',     bg: 'rgba(16,185,129,.1)',   color: '#10B981' },
          { label: 'Rejected',     value: stats.rejected,     icon: 'bi-x-circle',         bg: 'rgba(239,68,68,.1)',    color: '#EF4444' },
        ].map(s => (
          <div key={s.label} className="std-stat">
            <div className="std-stat-icon" style={{ background: s.bg }}>
              <i className={`bi ${s.icon}`} style={{ color: s.color }} />
            </div>
            <div>
              <div className="std-stat-val">{s.value}</div>
              <div className="std-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        {/* ── Left: Reports to submit ── */}
        <div className="col-lg-7">
          <div className="std-card">
            <p className="std-sec-title">
              <i className="bi bi-journal-text" style={{ color: '#F97316' }} />
              Reports to Submit This Week
              {notSubmittedThisWeek.length > 0 && (
                <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, marginLeft: 4 }}>
                  {notSubmittedThisWeek.length} pending
                </span>
              )}
            </p>

            {notSubmittedThisWeek.length === 0 ? (
              <div className="std-done-card">
                <i className="bi bi-patch-check-fill" style={{ fontSize: 36, color: '#10B981', display: 'block', marginBottom: 10 }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: '#09090B' }}>All reports submitted!</div>
                <p style={{ fontSize: 13, color: '#71717A', margin: '6px 0 0 0' }}>
                  Great work — you've submitted all your reports for this week. ✅
                </p>
              </div>
            ) : (
              notSubmittedThisWeek.map(r => (
                <div
                  key={r.id}
                  className="std-report-card"
                  onClick={() => navigate(`/my-reports`)}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className="std-report-icon">
                      <i className="bi bi-file-earmark-text" />
                    </div>
                    <div>
                      <div className="std-report-name">{r.title}</div>
                      <div className="std-report-meta">
                        {r.fields?.length ?? 0} fields · {r.category ?? 'General'}
                      </div>
                    </div>
                  </div>
                  <button
                    className="std-fill-btn"
                    onClick={e => { e.stopPropagation(); navigate('/my-reports'); }}
                  >
                    <i className="bi bi-pencil" />
                    Fill & Submit
                  </button>
                </div>
              ))
            )}

            {/* View all link */}
            {assignedReports.length > 0 && (
              <button
                onClick={() => navigate('/my-reports')}
                style={{ background: 'none', border: 'none', color: '#F97316', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
              >
                View all assigned reports
                <i className="bi bi-arrow-right" />
              </button>
            )}
          </div>
        </div>

        {/* ── Right: Recent Activity ── */}
        <div className="col-lg-5">
          <div className="std-card" style={{ height: '100%' }}>
            <p className="std-sec-title">
              <i className="bi bi-clock-history" style={{ color: '#F97316' }} />
              Recent Submissions
            </p>

            {recentEntries.length === 0 ? (
              <div className="std-empty">
                <i className="bi bi-inbox" style={{ fontSize: 32, color: '#E4E4E7', display: 'block', marginBottom: 10 }} />
                <div style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>No submissions yet</div>
              </div>
            ) : (
              recentEntries.map(e => {
                const sc = STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                return (
                  <div
                    key={e.id}
                    className="std-activity-row"
                    onClick={() => e.status === 'rejected'
                      ? navigate(`/my-submissions/${e.id}/resubmit`)
                      : navigate('/my-submissions')
                    }
                  >
                    <div className="std-activity-icon" style={{ background: sc.bg }}>
                      <i
                        className={`bi ${e.status === 'approved' ? 'bi-check-circle-fill' : e.status === 'rejected' ? 'bi-x-circle-fill' : 'bi-hourglass-split'}`}
                        style={{ color: sc.text }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="std-activity-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.report_title ?? `Report #${e.report_id}`}
                      </div>
                      <div className="std-activity-meta">{e.week_label ?? '—'}</div>
                    </div>
                    <span className="std-pill" style={{ background: sc.bg, color: sc.text }}>
                      <span className="std-dot" style={{ background: sc.dot }} />
                      {e.status}
                    </span>
                  </div>
                );
              })
            )}

            {myEntries.length > 0 && (
              <button
                onClick={() => navigate('/my-submissions')}
                style={{ background: 'none', border: 'none', color: '#F97316', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
              >
                View all submissions
                <i className="bi bi-arrow-right" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── My Tasks Widget ── */}
      <div style={{ marginTop: 24, background: '#fff', borderRadius: 16, padding: 24, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <p className="std-sec-title" style={{ margin: 0 }}>
            <i className="bi bi-list-check" style={{ color: '#8B5CF6' }} />
            My Tasks
          </p>
          <button
            onClick={() => navigate('/my-tasks')}
            style={{ background: 'none', border: 'none', color: '#8B5CF6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >View all →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {[
            { label: 'Active',         value: myTaskStats?.active ?? 0,        color: '#3B82F6', bg: '#EFF6FF',  icon: 'bi-play-circle-fill' },
            { label: 'Needs Revision', value: myTaskStats?.needs_revision ?? 0, color: '#EF4444', bg: '#FEF2F2',  icon: 'bi-arrow-counterclockwise' },
            { label: 'In Review',      value: myTaskStats?.in_review ?? 0,      color: '#F59E0B', bg: '#FFFBEB',  icon: 'bi-hourglass-split' },
            { label: 'Completed',      value: myTaskStats?.done ?? 0,           color: '#10B981', bg: '#ECFDF5',  icon: 'bi-check-circle-fill' },
          ].map(c => (
            <div
              key={c.label}
              onClick={() => navigate('/my-tasks')}
              style={{ background: c.bg, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${c.color}20`, transition: 'transform 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                <i className={`bi ${c.icon}`} style={{ color: c.color, fontSize: 17 }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#09090B', lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: '#71717A', marginTop: 3, fontWeight: 500 }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>
        {(myTaskStats?.needs_revision ?? 0) > 0 && (
          <div
            onClick={() => navigate('/my-tasks')}
            style={{ marginTop: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <i className="bi bi-exclamation-triangle-fill" style={{ color: '#DC2626', fontSize: 14 }} />
            <span style={{ fontSize: 13, color: '#7F1D1D', fontWeight: 600 }}>
              {myTaskStats?.needs_revision} task{(myTaskStats?.needs_revision ?? 0) > 1 ? 's need' : ' needs'} revision — tap to view
            </span>
            <i className="bi bi-arrow-right" style={{ color: '#DC2626', fontSize: 13, marginLeft: 'auto' }} />
          </div>
        )}
      </div>
    </div>
  );
}
