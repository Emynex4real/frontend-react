import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { dashboardApi, branchesApi, entriesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MOCK_MONTHLY = [
  { month: 'Jan', reports: 65 }, { month: 'Feb', reports: 78 },
  { month: 'Mar', reports: 90 }, { month: 'Apr', reports: 81 },
  { month: 'May', reports: 95 }, { month: 'Jun', reports: 110 },
];

const MOCK_ATTENDANCE = [
  { name: 'Present', value: 85 },
  { name: 'Absent', value: 15 },
];

const PIE_COLORS = ['url(#emeraldGradient)', '#E2E8F0'];

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: statsRes } = useQuery({ queryKey: ['dashboard-stats'], queryFn: dashboardApi.getStats });
  const { data: branchesRes } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll });
  const { data: entriesRes } = useQuery({ queryKey: ['entries'], queryFn: entriesApi.getAll });

  const stats = statsRes?.data;
  const branches = branchesRes?.data ?? [];
  const entries = entriesRes?.data ?? [];

  return (
    <div className="dashboard-2026-wrapper">
      <style>{`
        .dashboard-2026-wrapper {
          --bg-base: #F8FAFC;
          --surface: #FFFFFF;
          --surface-hover: #F1F5F9;
          --border: #E2E8F0;
          --text-main: #0F172A;
          --text-muted: #64748B;
          --text-subtle: #94A3B8;

          background-color: var(--bg-base);
          min-height: calc(100vh - 72px);
          padding: 32px;
          color: var(--text-main);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
        }

        /* Bento Box Grid System */
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 24px;
        }

        .bento-item {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          position: relative;
        }

        .bento-item:hover {
          background: var(--surface-hover);
          border-color: #CBD5E1;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.05);
          transform: translateY(-1px);
        }

        /* Span Helpers */
        .col-span-3 { grid-column: span 3; }
        .col-span-4 { grid-column: span 4; }
        .col-span-8 { grid-column: span 8; }
        .col-span-12 { grid-column: span 12; }

        @media (max-width: 1200px) {
          .col-span-3 { grid-column: span 6; }
          .col-span-8 { grid-column: span 12; }
          .col-span-4 { grid-column: span 12; }
        }
        @media (max-width: 768px) {
          .col-span-3, .col-span-8, .col-span-4 { grid-column: span 12; }
          .dashboard-2026-wrapper { padding: 16px; }
          .bento-grid { gap: 16px; }
        }

        /* Decorative blob */
        .glow-blob {
          position: absolute;
          width: 150px;
          height: 150px;
          top: -50px;
          right: -50px;
          border-radius: 50%;
          pointer-events: none;
          opacity: 0.6;
        }

        /* Typography & Values */
        .stat-value {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -1.5px;
          background: linear-gradient(180deg, #0F172A 0%, #475569 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.1;
        }

        .stat-label {
          font-size: 13px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        /* Light Tooltip for Charts */
        .glass-tooltip {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px 16px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
        }

        /* List / Table Redesign */
        .entry-row {
          display: grid;
          grid-template-columns: 2fr 1.5fr 1.5fr 1fr 1fr;
          align-items: center;
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 8px;
          background: transparent;
          transition: background 0.2s;
        }
        .entry-row:hover {
          background: #F8FAFC;
        }

        .status-pill {
          padding: 6px 12px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          width: fit-content;
        }
        .status-approved { background: rgba(16, 185, 129, 0.08); color: #059669; border: 1px solid rgba(16, 185, 129, 0.2); }
        .status-pending  { background: rgba(245, 158, 11, 0.08); color: #D97706; border: 1px solid rgba(245, 158, 11, 0.2); }
        .status-rejected { background: rgba(239, 68, 68, 0.08);  color: #DC2626; border: 1px solid rgba(239, 68, 68, 0.2);  }
      `}</style>

      {/* SVG gradient defs for charts */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#F97316" stopOpacity={1}/>
            <stop offset="100%" stopColor="#F97316" stopOpacity={0.3}/>
          </linearGradient>
          <linearGradient id="emeraldGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#34D399" stopOpacity={1}/>
            <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-end mb-5">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-1px', margin: 0, color: '#0F172A' }}>Overview</h1>
          <p style={{ color: '#64748B', margin: '4px 0 0 0', fontSize: 15 }}>
            Welcome back, <span style={{ color: '#0F172A', fontWeight: 600 }}>{user?.full_name}</span>
          </p>
        </div>
        <div style={{ background: '#F1F5F9', padding: '8px 16px', borderRadius: 100, fontSize: 13, border: '1px solid #E2E8F0', color: '#475569', fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="bento-grid">

        {/* ROW 1: STATS */}
        <div className="bento-item col-span-3 d-flex flex-column justify-content-between" style={{ minHeight: 160 }}>
          <div className="glow-blob" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(255,255,255,0) 70%)' }} />
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-buildings" style={{ color: '#F97316', fontSize: 18 }} />
            <span className="stat-label">Total Branches</span>
          </div>
          <div className="stat-value">{stats?.total_branches ?? branches.length}</div>
        </div>

        <div className="bento-item col-span-3 d-flex flex-column justify-content-between" style={{ minHeight: 160 }}>
          <div className="glow-blob" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(255,255,255,0) 70%)' }} />
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-people" style={{ color: '#3B82F6', fontSize: 18 }} />
            <span className="stat-label">Employees</span>
          </div>
          <div className="stat-value">{stats?.total_employees ?? '—'}</div>
        </div>

        <div className="bento-item col-span-3 d-flex flex-column justify-content-between" style={{ minHeight: 160 }}>
          <div className="glow-blob" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(255,255,255,0) 70%)' }} />
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-person-check" style={{ color: '#10B981', fontSize: 18 }} />
            <span className="stat-label">Present Today</span>
          </div>
          <div className="stat-value">{stats?.present_today ?? '—'}</div>
        </div>

        <div className="bento-item col-span-3 d-flex flex-column justify-content-between" style={{ minHeight: 160 }}>
          <div className="glow-blob" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(255,255,255,0) 70%)' }} />
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-graph-up" style={{ color: '#8B5CF6', fontSize: 18 }} />
            <span className="stat-label">Report Rate</span>
          </div>
          <div className="stat-value">{stats ? `${stats.monthly_report_rate}%` : '—'}</div>
        </div>

        {/* ROW 2: CHARTS */}
        <div className="bento-item col-span-8">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <span className="stat-label" style={{ color: '#0F172A' }}>Submissions Trajectory</span>
          </div>
          <div style={{ height: 280, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_MONTHLY} barSize={32} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
                  dy={16}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(15,23,42,0.03)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass-tooltip">
                          <div style={{ color: '#64748B', fontSize: 12, marginBottom: 4 }}>{payload[0].payload.month}</div>
                          <div style={{ color: '#0F172A', fontSize: 16, fontWeight: 600 }}>{payload[0].value} Reports</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="reports" fill="url(#orangeGradient)" radius={[8, 8, 8, 8]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bento-item col-span-4 d-flex flex-column">
          <span className="stat-label mb-4" style={{ color: '#0F172A' }}>Live Attendance</span>
          <div className="flex-grow-1 position-relative" style={{ minHeight: 240 }}>
            {/* Center stat inside donut */}
            <div
              className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center"
              style={{ pointerEvents: 'none', top: -15 }}
            >
              <span style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                85<span style={{ fontSize: 16 }}>%</span>
              </span>
              <span style={{ fontSize: 12, color: '#64748B' }}>Present</span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_ATTENDANCE}
                  cx="50%"
                  cy="45%"
                  innerRadius={75}
                  outerRadius={95}
                  stroke="none"
                  dataKey="value"
                  cornerRadius={10}
                  paddingAngle={5}
                >
                  {MOCK_ATTENDANCE.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value) => <span style={{ color: '#64748B', fontSize: 13 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 3: LIST */}
        <div className="bento-item col-span-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <span className="stat-label" style={{ color: '#0F172A' }}>Recent Activity</span>
            <a href="/entries" style={{ color: '#64748B', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <i className="bi bi-arrow-right" />
            </a>
          </div>

          <div className="d-flex flex-column">
            {/* Table Header */}
            <div className="entry-row" style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid #F1F5F9', borderRadius: 0 }}>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>REPORT</div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>BRANCH</div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>AUTHOR</div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>DATE</div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>STATUS</div>
            </div>

            {entries.length === 0 ? (
              <div className="text-center py-5" style={{ color: '#94A3B8' }}>
                No recent activity found.
              </div>
            ) : (
              entries.slice(0, 5).map((entry) => {
                const isApproved = entry.status === 'approved';
                const isRejected = entry.status === 'rejected';

                return (
                  <div key={entry.id} className="entry-row">
                    <div style={{ fontWeight: 500, fontSize: 14, color: '#0F172A' }}>
                      {entry.report_title ?? `Report #${entry.report_id}`}
                    </div>
                    <div style={{ color: '#64748B', fontSize: 14 }}>{entry.branch_name ?? '—'}</div>

                    <div className="d-flex align-items-center gap-2">
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#475569', fontWeight: 600 }}>
                        {(entry.submitter_name?.[0] ?? 'U').toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, color: '#0F172A' }}>{entry.submitter_name ?? '—'}</span>
                    </div>

                    <div style={{ color: '#94A3B8', fontSize: 13 }}>
                      {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>

                    <div>
                      <div className={`status-pill ${isApproved ? 'status-approved' : isRejected ? 'status-rejected' : 'status-pending'}`}>
                        {entry.status}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}