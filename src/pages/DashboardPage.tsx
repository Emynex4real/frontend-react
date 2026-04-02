import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { dashboardApi, branchesApi, entriesApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

const COLORS = ['#f7941d', '#e9ecef']

const mockMonthly = [
  { month: 'Jan', reports: 65 },
  { month: 'Feb', reports: 78 },
  { month: 'Mar', reports: 90 },
  { month: 'Apr', reports: 81 },
  { month: 'May', reports: 95 },
  { month: 'Jun', reports: 110 },
]

const mockAttendance = [
  { name: 'Present', value: 85 },
  { name: 'Absent', value: 15 },
]

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: statsRes } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  })

  const { data: branchesRes } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  })

  const { data: entriesRes } = useQuery({
    queryKey: ['entries'],
    queryFn: entriesApi.getAll,
  })

  const stats = statsRes?.data
  const branches = branchesRes?.data ?? []
  const entries = entriesRes?.data ?? []

  const statCards = [
    {
      label: 'Total Branches',
      value: stats?.total_branches ?? branches.length,
      icon: 'bi-building',
      color: '#f7941d',
      bg: 'rgba(247,148,29,0.1)',
    },
    {
      label: 'Total Employees',
      value: stats?.total_employees ?? '—',
      icon: 'bi-people-fill',
      color: '#0d6efd',
      bg: 'rgba(13,110,253,0.1)',
    },
    {
      label: 'Present Today',
      value: stats?.present_today ?? '—',
      icon: 'bi-person-check-fill',
      color: '#198754',
      bg: 'rgba(25,135,84,0.1)',
    },
    {
      label: 'Monthly Report Rate',
      value: stats ? `${stats.monthly_report_rate}%` : '—',
      icon: 'bi-graph-up',
      color: '#6f42c1',
      bg: 'rgba(111,66,193,0.1)',
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h4>Dashboard</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Welcome back, <strong>{user?.full_name}</strong>
          </p>
        </div>
        <span className="text-muted" style={{ fontSize: 13 }}>
          <i className="bi bi-calendar3 me-1" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {statCards.map(card => (
          <div key={card.label} className="col-sm-6 col-xl-3">
            <div className="stat-card d-flex align-items-center gap-3">
              <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
                <i className={`bi ${card.icon}`} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#212529' }}>{card.value}</div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="card-modern p-4">
            <h6 className="fw-semibold mb-3">Reports Overview</h6>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={mockMonthly} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="reports" fill="#f7941d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-modern p-4" style={{ height: '100%' }}>
            <h6 className="fw-semibold mb-3">Attendance Rate</h6>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={mockAttendance}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {mockAttendance.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="card-modern p-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-semibold mb-0">Recent Submissions</h6>
          <a href="/entries" className="btn btn-sm btn-outline-secondary" style={{ fontSize: 12 }}>
            View all
          </a>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-inbox" style={{ fontSize: 32 }} />
            <p className="mt-2 mb-0" style={{ fontSize: 13 }}>No submissions yet</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Branch</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 8).map(entry => (
                  <tr key={entry.id}>
                    <td style={{ fontSize: 13 }}>{entry.report_title ?? `Report #${entry.report_id}`}</td>
                    <td style={{ fontSize: 13 }}>{entry.branch_name ?? '—'}</td>
                    <td style={{ fontSize: 13 }}>{entry.submitter_name ?? '—'}</td>
                    <td>
                      <span className={`badge ${
                        entry.status === 'approved' ? 'badge-active' :
                        entry.status === 'rejected' ? 'badge-inactive' :
                        'bg-warning text-dark'
                      }`} style={{ fontSize: 11 }}>
                        {entry.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: '#6c757d' }}>
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
