import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { submissionsApi, branchesApi } from '../../services/api';
import type { ReportEntry } from '../../types';

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  approved: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', dot: '#10B981' },
  rejected:  { bg: 'rgba(239, 68, 68, 0.1)',  text: '#DC2626', dot: '#EF4444' },
  pending:   { bg: 'rgba(245, 158, 11, 0.1)',  text: '#D97706', dot: '#F59E0B' },
};

type GroupMode = 'all' | 'branch' | 'staff' | 'week';

export default function SubmissionsPage() {
  const navigate = useNavigate();

  // ── Filters ────────────────────────────────────────────
  const [groupMode, setGroupMode] = useState<GroupMode>('all');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStaff, setFilterStaff]   = useState('');
  const [filterWeek, setFilterWeek]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]             = useState('');
  // Week-page pagination (only used when groupMode === 'all')
  const [weekPage, setWeekPage] = useState(0); // 0 = latest week

  // ── Data ───────────────────────────────────────────────
  const { data: subData, isLoading } = useQuery({
    queryKey: ['submissions'],
    queryFn: submissionsApi.getAll,
  });
  const { data: weeksData } = useQuery({
    queryKey: ['submission-weeks'],
    queryFn: submissionsApi.getWeeks,
  });
  const { data: branchData } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  });

  const allEntries: ReportEntry[] = useMemo(
    () => subData?.data ?? [],
    [subData?.data]
  );
  const weeks = weeksData?.data ?? [];
  const branches = branchData?.data ?? [];

  // ── Unique staff list (derived) ────────────────────────
  const staffList = useMemo(() => {
    const seen = new Map<number, string>();
    allEntries.forEach(e => {
      if (e.submitted_by && e.submitter_name) seen.set(e.submitted_by, e.submitter_name);
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [allEntries]);

  // ── Filtered entries ───────────────────────────────────
  const filtered = useMemo(() => {
    return allEntries.filter(e => {
      if (filterBranch  && String(e.branch_id) !== filterBranch) return false;
      if (filterStaff   && String(e.submitted_by) !== filterStaff) return false;
      if (filterWeek    && e.week_start !== filterWeek) return false;
      if (filterStatus  && e.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !(e.submitter_name ?? '').toLowerCase().includes(q) &&
          !(e.report_title ?? '').toLowerCase().includes(q) &&
          !(e.branch_name ?? '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [allEntries, filterBranch, filterStaff, filterWeek, filterStatus, search]);

  // ── Sorted unique weeks (newest first) ────────────────
  const sortedWeeks = useMemo(() => {
    const seen = new Map<string, string>(); // week_start -> week_label
    filtered.forEach(e => {
      if (e.week_start && e.week_label && !seen.has(e.week_start)) {
        seen.set(e.week_start, e.week_label);
      }
    });
    return Array.from(seen.entries())
      .map(([week_start, week_label]) => ({ week_start, week_label }))
      .sort((a, b) => b.week_start.localeCompare(a.week_start)); // newest first
  }, [filtered]);

  // ── Grouped entries ────────────────────────────────────
  const grouped = useMemo(() => {
    if (groupMode === 'all') {
      // Paginate by week: page 0 = latest week
      const safeIndex = Math.min(weekPage, Math.max(0, sortedWeeks.length - 1));
      const currentWeek = sortedWeeks[safeIndex];
      const pageEntries = currentWeek
        ? filtered.filter(e => e.week_start === currentWeek.week_start)
        : filtered;
      return { [currentWeek?.week_label ?? 'All Submissions']: pageEntries };
    }
    const map: Record<string, ReportEntry[]> = {};
    filtered.forEach(e => {
      let key = '';
      if (groupMode === 'branch') key = e.branch_name ?? 'Unknown Branch';
      if (groupMode === 'staff')  key = e.submitter_name ?? 'Unknown Staff';
      if (groupMode === 'week')   key = e.week_label ?? 'Unknown Week';
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [filtered, groupMode, weekPage, sortedWeeks]);

  // ── Stat counts ────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    allEntries.length,
    pending:  allEntries.filter(e => e.status === 'pending').length,
    approved: allEntries.filter(e => e.status === 'approved').length,
    rejected: allEntries.filter(e => e.status === 'rejected').length,
  }), [allEntries]);

  const tabs: { key: GroupMode; label: string; icon: string }[] = [
    { key: 'all',    label: 'All',        icon: 'bi-list-ul' },
    { key: 'branch', label: 'By Branch',  icon: 'bi-buildings' },
    { key: 'staff',  label: 'By Staff',   icon: 'bi-person' },
    { key: 'week',   label: 'By Week',    icon: 'bi-calendar3-week' },
  ];

  return (
    <div className="sr-page">
      <style>{`
        .sr-page {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          padding: 8px;
        }

        /* ── Header ── */
        .sr-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.8px;
          color: #09090B;
          margin: 0;
        }
        .sr-subtitle {
          font-size: 14px;
          color: #71717A;
          margin: 4px 0 0 0;
        }

        /* ── Stat Cards ── */
        .sr-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 768px) {
          .sr-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .sr-stat-card {
          background: #FFFFFF;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .sr-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.05);
        }
        .sr-stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .sr-stat-value {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -1px;
          color: #09090B;
          line-height: 1;
        }
        .sr-stat-label {
          font-size: 12px;
          font-weight: 600;
          color: #A1A1AA;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ── Tabs ── */
        .sr-tabs {
          display: flex;
          gap: 4px;
          background: rgba(0,0,0,0.03);
          border-radius: 12px;
          padding: 4px;
          width: fit-content;
          margin-bottom: 20px;
        }
        .sr-tab {
          padding: 7px 16px;
          border-radius: 9px;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 500;
          color: #71717A;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .sr-tab:hover { color: #09090B; }
        .sr-tab.active {
          background: #FFFFFF;
          color: #09090B;
          font-weight: 600;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }

        /* ── Filters Bar ── */
        .sr-filters {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 16px;
          background: rgba(0,0,0,0.015);
          border: 1px solid rgba(0,0,0,0.04);
          border-radius: 14px;
          margin-bottom: 20px;
        }
        .sr-filter-select {
          appearance: none;
          background: #FFFFFF url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A1A1AA' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 10px;
          padding: 7px 32px 7px 12px;
          font-size: 13px;
          font-weight: 500;
          color: #3F3F46;
          cursor: pointer;
          min-width: 160px;
          transition: all 0.2s ease;
        }
        .sr-filter-select:focus {
          outline: none;
          border-color: rgba(249,115,22,0.4);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.1);
        }
        .sr-search-wrap {
          flex: 1;
          min-width: 200px;
          background: #FFFFFF;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 10px;
          padding: 7px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .sr-search-wrap:focus-within {
          border-color: rgba(249,115,22,0.4);
          box-shadow: 0 0 0 3px rgba(249,115,22,0.1);
        }
        .sr-search-input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          font-size: 13px;
          color: #09090B;
        }
        .sr-search-input::placeholder { color: #A1A1AA; }
        .sr-clear-btn {
          background: #09090B;
          color: #FFFFFF;
          border: none;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .sr-clear-btn:hover { background: #27272A; }

        /* ── Card ── */
        .sr-card {
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.02);
          overflow: hidden;
        }

        /* ── Group Header ── */
        .sr-group-header {
          padding: 14px 20px;
          background: rgba(0,0,0,0.015);
          border-bottom: 1px solid rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sr-group-label {
          font-size: 13px;
          font-weight: 700;
          color: #09090B;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sr-group-count {
          background: rgba(0,0,0,0.06);
          color: #52525B;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 100px;
        }

        /* ── Table Row ── */
        .sr-table-header {
          display: grid;
          grid-template-columns: 44px 2.2fr 1.4fr 1.4fr 100px 110px 90px;
          align-items: center;
          min-width: 860px;
          padding: 10px 20px;
          font-size: 11px;
          font-weight: 700;
          color: #A1A1AA;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .sr-table-row {
          display: grid;
          grid-template-columns: 44px 2.2fr 1.4fr 1.4fr 100px 110px 90px;
          align-items: center;
          min-width: 860px;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(0,0,0,0.03);
          transition: background 0.15s ease;
          cursor: pointer;
        }
        .sr-table-row:last-child { border-bottom: none; }
        .sr-table-row:hover { background: rgba(249,115,22,0.03); }

        .sr-scroll-x { overflow-x: auto; }

        /* ── Avatar ── */
        .sr-avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F97316, #EA580C);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          flex-shrink: 0;
        }

        /* ── Pill / Badge ── */
        .sr-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          width: fit-content;
          text-transform: capitalize;
        }
        .sr-dot { width: 6px; height: 6px; border-radius: 50%; }

        /* ── View Btn ── */
        .sr-view-btn {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #A1A1AA;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .sr-view-btn:hover {
          background: rgba(249,115,22,0.1);
          color: #F97316;
        }

        /* ── Empty state ── */
        .sr-empty {
          padding: 60px 20px;
          text-align: center;
        }

        /* ── Week Pagination ── */
        .sr-week-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-top: 1px solid rgba(0,0,0,0.04);
          background: rgba(0,0,0,0.01);
        }
        .sr-week-nav-btn {
          width: 36px; height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.08);
          background: #FFFFFF;
          color: #52525B;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 15px;
        }
        .sr-week-nav-btn:hover:not(:disabled) {
          background: #F97316;
          color: #FFFFFF;
          border-color: #F97316;
          transform: scale(1.08);
        }
        .sr-week-nav-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .sr-week-dots {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .sr-week-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: rgba(0,0,0,0.12);
          border: none;
          cursor: pointer;
          padding: 0;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .sr-week-dot.active {
          background: #F97316;
          width: 22px;
          border-radius: 4px;
        }
        .sr-week-dot:hover:not(.active) {
          background: rgba(249,115,22,0.4);
        }
        .sr-week-page-label {
          font-size: 12px;
          font-weight: 600;
          color: #71717A;
          text-align: center;
          line-height: 1.4;
          max-width: 240px;
        }
        /* ── Week Banner (shown at top of "all" card) ── */
        .sr-week-banner {
          padding: 12px 20px;
          background: linear-gradient(135deg, rgba(249,115,22,0.04), rgba(234,88,12,0.02));
          border-bottom: 1px solid rgba(249,115,22,0.1);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sr-week-banner-label {
          font-size: 13px;
          font-weight: 700;
          color: #09090B;
        }
        .sr-week-banner-sub {
          font-size: 12px;
          color: #A1A1AA;
          margin-left: auto;
        }
      `}</style>

      {/* ── Page Header ── */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start gap-3 mb-4">
        <div>
          <h1 className="sr-title">Staff Report Review</h1>
          <p className="sr-subtitle">Review, approve or reject weekly reports submitted by staff</p>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="sr-stats-grid">
        {[
          { label: 'Total Submitted',   value: stats.total,    icon: 'bi-send-check',    iconBg: 'rgba(14,165,233,0.1)', iconColor: '#0EA5E9' },
          { label: 'Pending Review',    value: stats.pending,  icon: 'bi-hourglass-split', iconBg: 'rgba(245,158,11,0.1)', iconColor: '#D97706' },
          { label: 'Approved',          value: stats.approved, icon: 'bi-check-circle',  iconBg: 'rgba(16,185,129,0.1)', iconColor: '#059669' },
          { label: 'Rejected',          value: stats.rejected, icon: 'bi-x-circle',      iconBg: 'rgba(239,68,68,0.1)',  iconColor: '#DC2626' },
        ].map(s => (
          <div key={s.label} className="sr-stat-card">
            <div className="sr-stat-icon" style={{ background: s.iconBg }}>
              <i className={`bi ${s.icon}`} style={{ color: s.iconColor }} />
            </div>
            <div>
              <div className="sr-stat-value">{s.value}</div>
              <div className="sr-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="sr-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`sr-tab ${groupMode === t.key ? 'active' : ''}`}
            onClick={() => { setGroupMode(t.key); setWeekPage(0); }}
          >
            <i className={`bi ${t.icon}`} style={{ fontSize: 13 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="sr-filters">
        {/* Search */}
        <div className="sr-search-wrap">
          <i className="bi bi-search" style={{ color: '#A1A1AA', fontSize: 13 }} />
          <input
            className="sr-search-input"
            placeholder="Search staff, branch, report..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <i
              className="bi bi-x-circle-fill"
              style={{ color: '#A1A1AA', fontSize: 12, cursor: 'pointer' }}
              onClick={() => setSearch('')}
            />
          )}
        </div>

        {/* Branch filter */}
        <select
          className="sr-filter-select"
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
        >
          <option value="">All Branches</option>
          {branches.map(b => (
            <option key={b.id} value={String(b.id)}>{b.name}</option>
          ))}
        </select>

        {/* Staff filter */}
        <select
          className="sr-filter-select"
          value={filterStaff}
          onChange={e => setFilterStaff(e.target.value)}
        >
          <option value="">All Staff</option>
          {staffList.map(s => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </select>

        {/* Week filter */}
        <select
          className="sr-filter-select"
          value={filterWeek}
          onChange={e => setFilterWeek(e.target.value)}
        >
          <option value="">All Weeks</option>
          {weeks.map(w => (
            <option key={w.week_start} value={w.week_start}>{w.week_label}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          className="sr-filter-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ minWidth: 130 }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Clear */}
        {(filterBranch || filterStaff || filterWeek || filterStatus || search) && (
          <button
            className="sr-clear-btn"
            onClick={() => {
              setFilterBranch(''); setFilterStaff('');
              setFilterWeek(''); setFilterStatus(''); setSearch('');
              setWeekPage(0);
            }}
          >
            <i className="bi bi-x me-1" />
            Clear
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: 300 }}>
          <div className="spinner-border" style={{ color: '#F97316', width: '2.2rem', height: '2.2rem' }} />
          <span style={{ color: '#71717A', fontSize: 14, marginTop: 16, fontWeight: 500 }}>Loading submissions…</span>
        </div>
      ) : (
        Object.entries(grouped).map(([groupKey, entries]) => {
          const safeWeekPage = Math.min(weekPage, Math.max(0, sortedWeeks.length - 1));
          return (
          <div key={groupKey} className="sr-card mb-4">
            {/* ── Week Banner (All mode) ── */}
            {groupMode === 'all' && sortedWeeks.length > 0 && (
              <div className="sr-week-banner">
                <i className="bi bi-calendar3-week" style={{ color: '#F97316', fontSize: 15 }} />
                <span className="sr-week-banner-label">{groupKey}</span>
                <span className="sr-week-banner-sub">
                  {entries.length} report{entries.length !== 1 ? 's' : ''}
                  {' '}·{' '}
                  Page {safeWeekPage + 1} of {sortedWeeks.length}
                </span>
              </div>
            )}

            {/* Group Header (non-all modes) */}
            {groupMode !== 'all' && (
              <div className="sr-group-header">
                <div className="sr-group-label">
                  <i className={`bi ${
                    groupMode === 'branch' ? 'bi-buildings' :
                    groupMode === 'staff'  ? 'bi-person-circle' :
                    'bi-calendar3-week'
                  }`} style={{ color: '#F97316' }} />
                  {groupKey}
                </div>
                <span className="sr-group-count">{entries.length} report{entries.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            <div className="sr-scroll-x">
              {/* Table Header */}
              <div className="sr-table-header">
                <div>#</div>
                <div>Report / Staff</div>
                <div>Branch</div>
                <div>Week</div>
                <div>Status</div>
                <div>Submitted</div>
                <div style={{ textAlign: 'right' }}>Action</div>
              </div>

              {/* Rows */}
              {entries.length === 0 ? (
                <div className="sr-empty">
                  <div style={{ width: 56, height: 56, background: 'rgba(0,0,0,0.02)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <i className="bi bi-inbox" style={{ fontSize: 24, color: '#A1A1AA' }} />
                  </div>
                  <h6 style={{ fontWeight: 600, color: '#09090B', margin: 0 }}>No submissions found</h6>
                  <p style={{ color: '#71717A', fontSize: 14, marginTop: 4 }}>Try adjusting your filters.</p>
                </div>
              ) : (
                entries.map((entry, i) => {
                  const st = STATUS_STYLE[entry.status] || STATUS_STYLE.pending;
                  const initials = (entry.submitter_name ?? 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={entry.id}
                      className="sr-table-row"
                      onClick={() => navigate(`/submissions/${entry.id}`)}
                      title={`View full report by ${entry.submitter_name}`}
                    >
                      {/* # */}
                      <div style={{ color: '#A1A1AA', fontSize: 12, fontWeight: 600 }}>
                        {(i + 1).toString().padStart(2, '0')}
                      </div>

                      {/* Staff & Report */}
                      <div className="d-flex align-items-center gap-2">
                        <div className="sr-avatar">{initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#09090B', lineHeight: 1.2 }}>
                            {entry.submitter_name ?? '—'}
                          </div>
                          <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>
                            {entry.submitter_role ?? 'Staff'} · {entry.report_title ?? `Report #${entry.report_id}`}
                          </div>
                        </div>
                      </div>

                      {/* Branch */}
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-geo-alt" style={{ color: '#A1A1AA', fontSize: 12 }} />
                        <span style={{ fontSize: 13, color: '#52525B' }}>{entry.branch_name ?? '—'}</span>
                      </div>

                      {/* Week */}
                      <div style={{ fontSize: 12, color: '#71717A', lineHeight: 1.4 }}>
                        {entry.week_label ?? new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>

                      {/* Status */}
                      <div>
                        <span className="sr-pill" style={{ background: st.bg, color: st.text }}>
                          <span className="sr-dot" style={{ background: st.dot }} />
                          {entry.status}
                        </span>
                      </div>

                      {/* Date */}
                      <div style={{ fontSize: 12, color: '#A1A1AA' }}>
                        {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>

                      {/* Action */}
                      <div style={{ textAlign: 'right' }}>
                        <button
                          className="sr-view-btn"
                          onClick={e => { e.stopPropagation(); navigate(`/submissions/${entry.id}`); }}
                          title="View full report"
                        >
                          <i className="bi bi-arrow-right-circle" style={{ fontSize: 16 }} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Week Pagination Footer (All mode only) ── */}
            {groupMode === 'all' && sortedWeeks.length > 1 && (
              <div className="sr-week-nav">
                {/* Prev */}
                <button
                  className="sr-week-nav-btn"
                  onClick={() => setWeekPage(p => Math.min(p + 1, sortedWeeks.length - 1))}
                  disabled={safeWeekPage >= sortedWeeks.length - 1}
                  title="Previous week (older)"
                >
                  <i className="bi bi-chevron-left" />
                </button>

                {/* Centre: dots + label */}
                <div className="d-flex flex-column align-items-center gap-2">
                  <div className="sr-week-dots">
                    {sortedWeeks.map((w, idx) => (
                      <button
                        key={w.week_start}
                        className={`sr-week-dot ${idx === safeWeekPage ? 'active' : ''}`}
                        onClick={() => setWeekPage(idx)}
                        title={w.week_label}
                      />
                    ))}
                  </div>
                  <span className="sr-week-page-label">
                    {safeWeekPage === 0 ? '📅 Current week' : `${safeWeekPage} week${safeWeekPage > 1 ? 's' : ''} ago`}
                  </span>
                </div>

                {/* Next */}
                <button
                  className="sr-week-nav-btn"
                  onClick={() => setWeekPage(p => Math.max(p - 1, 0))}
                  disabled={safeWeekPage <= 0}
                  title="Next week (newer)"
                >
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            )}
          </div>
          );
        })
      )}

      {/* Truly empty */}
      {!isLoading && allEntries.length === 0 && (
        <div className="sr-card">
          <div className="sr-empty">
            <div style={{ width: 64, height: 64, background: 'rgba(249,115,22,0.05)', borderRadius: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <i className="bi bi-journal-x" style={{ fontSize: 28, color: '#F97316' }} />
            </div>
            <h6 style={{ fontWeight: 700, color: '#09090B', fontSize: 16, margin: 0 }}>No reports submitted yet</h6>
            <p style={{ color: '#71717A', fontSize: 14, marginTop: 6 }}>Staff submissions will appear here once they submit their weekly reports.</p>
          </div>
        </div>
      )}
    </div>
  );
}
