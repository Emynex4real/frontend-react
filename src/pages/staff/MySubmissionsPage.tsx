import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { staffApi } from '../../services/api';
import type { ReportEntry } from '../../types';

const STATUS_STYLE = {
  approved: { bg: 'rgba(16,185,129,.1)',  text: '#059669', dot: '#10B981', border: 'rgba(16,185,129,.2)', icon: 'bi-check-circle-fill',  label: 'Approved' },
  pending:  { bg: 'rgba(245,158,11,.1)',  text: '#D97706', dot: '#F59E0B', border: 'rgba(245,158,11,.2)', icon: 'bi-hourglass-split',     label: 'Pending' },
  rejected: { bg: 'rgba(239,68,68,.1)',   text: '#DC2626', dot: '#EF4444', border: 'rgba(239,68,68,.2)',  icon: 'bi-x-circle-fill',       label: 'Rejected' },
};

export default function MySubmissionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const userId = user?.id ?? 1;

  const { data: res, isLoading } = useQuery({
    queryKey: ['my-entries', userId],
    queryFn: () => staffApi.getMyEntries(userId),
  });

  const allEntries: ReportEntry[] = res?.data ?? [];

  // ── Grouped by week, newest first ────────────────────────────
  const grouped = useMemo(() => {
    const filtered = allEntries.filter(e => {
      if (filterStatus && e.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (e.report_title ?? '').toLowerCase().includes(q) || (e.week_label ?? '').toLowerCase().includes(q);
      }
      return true;
    });

    const map = new Map<string, { label: string; entries: ReportEntry[] }>();
    filtered.forEach(e => {
      const key = e.week_start ?? 'unknown';
      if (!map.has(key)) map.set(key, { label: e.week_label ?? 'Unknown Week', entries: [] });
      map.get(key)!.entries.push(e);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))      // newest week first
      .map(([, v]) => v);
  }, [allEntries, filterStatus, search]);

  const stats = useMemo(() => ({
    total:    allEntries.length,
    approved: allEntries.filter(e => e.status === 'approved').length,
    pending:  allEntries.filter(e => e.status === 'pending').length,
    rejected: allEntries.filter(e => e.status === 'rejected').length,
  }), [allEntries]);

  return (
    <div className="ms-page">
      <style>{`
        .ms-page {
          font-family: -apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",sans-serif;
          padding: 8px;
        }
        .ms-title { font-size: 26px; font-weight: 700; letter-spacing: -.6px; color: #09090B; margin: 0; }
        .ms-sub   { font-size: 14px; color: #71717A; margin: 4px 0 0 0; }

        /* ── Stat cards ── */
        .ms-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 24px; }
        @media(max-width:768px){ .ms-stats{ grid-template-columns:repeat(2,1fr); } }
        .ms-stat {
          background: #fff; border: 1px solid rgba(0,0,0,.06);
          border-radius: 14px; padding: 16px 18px;
          display: flex; align-items: center; gap: 12px;
        }
        .ms-stat-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .ms-stat-val  { font-size: 22px; font-weight: 700; letter-spacing: -1px; color: #09090B; line-height: 1; }
        .ms-stat-lbl  { font-size: 11px; font-weight: 600; color: #A1A1AA; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }

        /* ── Filters ── */
        .ms-filters {
          display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
          padding: 14px 16px; background: rgba(0,0,0,.015);
          border: 1px solid rgba(0,0,0,.04); border-radius: 13px; margin-bottom: 20px;
        }
        .ms-search-wrap {
          flex: 1; min-width: 200px; background: #fff;
          border: 1px solid rgba(0,0,0,.08); border-radius: 10px;
          padding: 7px 12px; display: flex; align-items: center; gap: 8px;
        }
        .ms-search-wrap:focus-within { border-color: rgba(249,115,22,.4); box-shadow: 0 0 0 3px rgba(249,115,22,.1); }
        .ms-search-input { border: none; background: transparent; outline: none; width: 100%; font-size: 13px; color: #09090B; }
        .ms-search-input::placeholder { color: #A1A1AA; }
        .ms-select {
          appearance: none;
          background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23A1A1AA' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center;
          border: 1px solid rgba(0,0,0,.08); border-radius: 10px;
          padding: 7px 30px 7px 12px; font-size: 13px; font-weight: 500;
          color: #3F3F46; cursor: pointer; min-width: 140px;
        }
        .ms-select:focus { outline: none; border-color: rgba(249,115,22,.4); box-shadow: 0 0 0 3px rgba(249,115,22,.1); }

        /* ── Week group ── */
        .ms-week-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px; padding-bottom: 10px;
          border-bottom: 1px solid rgba(0,0,0,.05);
        }
        .ms-week-label { font-size: 13px; font-weight: 700; color: #09090B; display: flex; align-items: center; gap: 8px; }
        .ms-week-count { font-size: 11px; font-weight: 700; color: #A1A1AA;
          background: rgba(0,0,0,.05); padding: 2px 8px; border-radius: 100px; }

        /* ── Submission card ── */
        .ms-entry-card {
          background: #fff; border: 1px solid rgba(0,0,0,.06);
          border-radius: 14px; margin-bottom: 10px;
          overflow: hidden; transition: all .2s ease;
        }
        .ms-entry-card:hover { box-shadow: 0 6px 18px rgba(0,0,0,.04); }
        .ms-entry-card:last-child { margin-bottom: 0; }
        .ms-entry-top {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 20px; cursor: pointer;
        }
        .ms-entry-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
        .ms-entry-name { font-size: 14px; font-weight: 600; color: #09090B; line-height: 1.2; }
        .ms-entry-meta { font-size: 12px; color: #A1A1AA; margin-top: 2px; }
        .ms-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: capitalize; }
        .ms-dot  { width: 6px; height: 6px; border-radius: 50%; }

        /* ── Expand chevron ── */
        .ms-chevron { margin-left: auto; flex-shrink: 0; transition: transform .25s ease; color: #A1A1AA; }
        .ms-chevron.open { transform: rotate(180deg); }

        /* ── Data fields (expanded) ── */
        .ms-fields { padding: 0 20px 20px 20px; border-top: 1px solid rgba(0,0,0,.04); }
        .ms-field-block { background: rgba(0,0,0,.015); border: 1px solid rgba(0,0,0,.04); border-radius: 10px; padding: 12px 14px; margin-top: 10px; }
        .ms-field-lbl { font-size: 11px; font-weight: 700; color: #A1A1AA; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 5px; }
        .ms-field-val { font-size: 13px; font-weight: 500; color: #09090B; line-height: 1.55; }

        /* ── Rejection box ── */
        .ms-rejection {
          margin: 12px 20px 0 20px; padding: 14px 16px;
          background: rgba(239,68,68,.05); border: 1px solid rgba(239,68,68,.15);
          border-left: 3px solid #EF4444; border-radius: 10px;
        }
        .ms-rejection-title { font-size: 12px; font-weight: 700; color: #DC2626; display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
        .ms-rejection-text  { font-size: 13px; color: #7F1D1D; line-height: 1.5; }
        .ms-resubmit-btn {
          background: #DC2626; color: #fff; border: none;
          border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 600;
          cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
          margin-top: 12px; transition: all .2s ease;
          box-shadow: 0 4px 10px rgba(220,38,38,.25);
        }
        .ms-resubmit-btn:hover { background: #B91C1C; transform: translateY(-1px); }

        /* ── Empty ── */
        .ms-empty { text-align: center; padding: 60px 20px; }
      `}</style>

      {/* Header */}
      <div className="mb-4">
        <h1 className="ms-title">My Submissions</h1>
        <p className="ms-sub">Track all your weekly report submissions and their review status.</p>
      </div>

      {/* Stats */}
      <div className="ms-stats">
        {[
          { label: 'Total',    value: stats.total,    icon: 'bi-journals',         bg: 'rgba(14,165,233,.1)',  color: '#0EA5E9' },
          { label: 'Approved', value: stats.approved, icon: 'bi-check-circle-fill', bg: 'rgba(16,185,129,.1)',  color: '#059669' },
          { label: 'Pending',  value: stats.pending,  icon: 'bi-hourglass-split',   bg: 'rgba(245,158,11,.1)',  color: '#D97706' },
          { label: 'Rejected', value: stats.rejected, icon: 'bi-x-circle-fill',     bg: 'rgba(239,68,68,.1)',   color: '#DC2626' },
        ].map(s => (
          <div key={s.label} className="ms-stat">
            <div className="ms-stat-icon" style={{ background: s.bg }}>
              <i className={`bi ${s.icon}`} style={{ color: s.color }} />
            </div>
            <div>
              <div className="ms-stat-val">{s.value}</div>
              <div className="ms-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="ms-filters">
        <div className="ms-search-wrap">
          <i className="bi bi-search" style={{ color: '#A1A1AA', fontSize: 13 }} />
          <input
            className="ms-search-input"
            placeholder="Search by report or week…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <i className="bi bi-x-circle-fill" style={{ color: '#A1A1AA', fontSize: 12, cursor: 'pointer' }} onClick={() => setSearch('')} />
          )}
        </div>
        <select className="ms-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: 280 }}>
          <div className="spinner-border" style={{ color: '#F97316', width: '2.2rem', height: '2.2rem' }} />
          <span style={{ color: '#71717A', fontSize: 14, marginTop: 16, fontWeight: 500 }}>Loading your submissions…</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && grouped.length === 0 && (
        <div className="ms-empty">
          <div style={{ width: 64, height: 64, background: 'rgba(249,115,22,.05)', borderRadius: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <i className="bi bi-journal-x" style={{ fontSize: 28, color: '#F97316' }} />
          </div>
          <h6 style={{ fontWeight: 700, color: '#09090B', fontSize: 16, margin: 0 }}>No submissions found</h6>
          <p style={{ color: '#71717A', fontSize: 14, marginTop: 6 }}>
            {search || filterStatus ? 'Try adjusting your filters.' : 'You haven\'t submitted any reports yet.'}
          </p>
          {!search && !filterStatus && (
            <button
              onClick={() => navigate('/my-reports')}
              style={{ background: '#F97316', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 22px', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 12 }}
            >
              <i className="bi bi-pencil me-2" />
              Go to Assigned Reports
            </button>
          )}
        </div>
      )}

      {/* Grouped results */}
      {!isLoading && grouped.map(({ label, entries }) => (
        <div key={label} className="mb-4">
          {/* Week header */}
          <div className="ms-week-header">
            <span className="ms-week-label">
              <i className="bi bi-calendar3-week" style={{ color: '#F97316' }} />
              {label}
            </span>
            <span className="ms-week-count">{entries.length} report{entries.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Entry cards */}
          {entries.map(entry => {
            const ss = STATUS_STYLE[entry.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending;
            const isOpen = expandedId === entry.id;

            return (
              <div key={entry.id} className="ms-entry-card" style={{ borderColor: isOpen ? ss.border : 'rgba(0,0,0,.06)' }}>
                {/* Top row */}
                <div className="ms-entry-top" onClick={() => setExpandedId(isOpen ? null : entry.id)}>
                  <div className="ms-entry-icon" style={{ background: ss.bg }}>
                    <i className={`bi ${ss.icon}`} style={{ color: ss.text }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ms-entry-name">{entry.report_title ?? `Report #${entry.report_id}`}</div>
                    <div className="ms-entry-meta">
                      Submitted {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {entry.updated_at !== entry.created_at && (
                        <> · Updated {new Date(entry.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                      )}
                    </div>
                  </div>
                  <span className="ms-pill" style={{ background: ss.bg, color: ss.text }}>
                    <span className="ms-dot" style={{ background: ss.dot }} />
                    {ss.label}
                  </span>
                  <i className={`bi bi-chevron-down ms-chevron ${isOpen ? 'open' : ''}`} style={{ fontSize: 14 }} />
                </div>

                {/* Expanded: rejection reason first */}
                {isOpen && entry.status === 'rejected' && entry.rejection_comment && (
                  <div className="ms-rejection">
                    <div className="ms-rejection-title">
                      <i className="bi bi-chat-square-x-fill" />
                      Feedback from Reviewer
                    </div>
                    <div className="ms-rejection-text">{entry.rejection_comment}</div>
                    <button
                      className="ms-resubmit-btn"
                      onClick={() => navigate(`/my-submissions/${entry.id}/resubmit`)}
                    >
                      <i className="bi bi-arrow-clockwise" />
                      Edit & Resubmit
                    </button>
                  </div>
                )}

                {/* Expanded: report fields */}
                {isOpen && (
                  <div className="ms-fields">
                    {Object.entries(entry.data ?? {}).map(([k, v]) => (
                      <div key={k} className="ms-field-block">
                        <div className="ms-field-lbl">{k.replace(/_/g, ' ')}</div>
                        <div className="ms-field-val">{String(v ?? '—')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
