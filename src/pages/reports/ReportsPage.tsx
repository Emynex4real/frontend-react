import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '../../services/api'

const PRIORITY_COLORS: Record<string, string> = {
  high: '#dc3545',
  medium: '#f7941d',
  low: '#198754',
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['reports'], queryFn: reportsApi.getAll })

  const deleteMutation = useMutation({
    mutationFn: reportsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })

  const reports = (data?.data ?? []).filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h4>Report Templates</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate('/reports/builder')}>
            <i className="bi bi-tools me-1" /> Form Builder
          </button>
          <button className="btn btn-brand" onClick={() => navigate('/reports/new')}>
            <i className="bi bi-plus-lg me-1" /> Create Template
          </button>
        </div>
      </div>

      <div className="card-modern p-4">
        <div className="mb-3" style={{ maxWidth: 300 }}>
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-light border-end-0">
              <i className="bi bi-search text-muted" />
            </span>
            <input
              className="form-control bg-light border-start-0"
              placeholder="Search templates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ boxShadow: 'none' }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-5"><div className="spinner-border" style={{ color: '#f7941d' }} /></div>
        ) : reports.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-file-earmark-text" style={{ fontSize: 40 }} />
            <p className="mt-2">No report templates yet</p>
            <button className="btn btn-brand btn-sm" onClick={() => navigate('/reports/new')}>
              Create your first template
            </button>
          </div>
        ) : (
          <div className="row g-3">
            {reports.map(report => (
              <div key={report.id} className="col-md-6 col-xl-4">
                <div
                  className="p-3 border rounded"
                  style={{ background: '#fff', borderRadius: 10, transition: 'box-shadow 0.15s' }}
                >
                  <div className="d-flex align-items-start justify-content-between mb-2">
                    <div>
                      <h6 className="fw-semibold mb-1" style={{ fontSize: 14 }}>{report.title}</h6>
                      {report.category && (
                        <span className="badge bg-light text-muted border" style={{ fontSize: 11 }}>{report.category}</span>
                      )}
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: `${PRIORITY_COLORS[report.priority]}20`,
                        color: PRIORITY_COLORS[report.priority],
                        fontSize: 11,
                      }}
                    >
                      {report.priority}
                    </span>
                  </div>

                  {report.description && (
                    <p style={{ fontSize: 12, color: '#6c757d', marginBottom: 8 }}>
                      {report.description.slice(0, 80)}{report.description.length > 80 ? '…' : ''}
                    </p>
                  )}

                  <div className="d-flex align-items-center justify-content-between mt-2">
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className={`badge ${report.status === 'published' ? 'badge-active' : 'bg-secondary'}`}
                        style={{ fontSize: 10 }}
                      >
                        {report.status}
                      </span>
                      <span style={{ fontSize: 11, color: '#6c757d' }}>
                        <i className="bi bi-list-ul me-1" />
                        {report.fields?.length ?? 0} fields
                      </span>
                    </div>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => navigate(`/reports/${report.id}/edit`)}
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => { if (confirm(`Delete "${report.title}"?`)) deleteMutation.mutate(report.id) }}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
