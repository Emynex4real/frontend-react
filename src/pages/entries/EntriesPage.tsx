import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { entriesApi } from '../../services/api'

const STATUS_STYLE: Record<string, string> = {
  approved: 'badge-active',
  rejected: 'badge-inactive',
  pending: 'bg-warning text-dark',
}

export default function EntriesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['entries'], queryFn: entriesApi.getAll })

  const deleteMutation = useMutation({
    mutationFn: entriesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries'] }),
  })

  const entries = (data?.data ?? []).filter(e =>
    (e.report_title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (e.branch_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h4>My Submissions</h4>
        <button className="btn btn-brand" onClick={() => navigate('/entries/new')}>
          <i className="bi bi-plus-lg me-1" /> Submit Report
        </button>
      </div>

      <div className="card-modern p-4">
        <div className="mb-3" style={{ maxWidth: 300 }}>
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-light border-end-0">
              <i className="bi bi-search text-muted" />
            </span>
            <input
              className="form-control bg-light border-start-0"
              placeholder="Search submissions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ boxShadow: 'none' }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-5"><div className="spinner-border" style={{ color: '#f7941d' }} /></div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Report</th>
                  <th>Branch</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      <i className="bi bi-inbox" style={{ fontSize: 28 }} />
                      <p className="mt-2 mb-0" style={{ fontSize: 13 }}>No submissions yet</p>
                    </td>
                  </tr>
                ) : entries.map((entry, i) => (
                  <tr key={entry.id}>
                    <td style={{ color: '#6c757d' }}>{i + 1}</td>
                    <td className="fw-semibold">{entry.report_title ?? `Report #${entry.report_id}`}</td>
                    <td>{entry.branch_name ?? '—'}</td>
                    <td>{entry.submitter_name ?? '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_STYLE[entry.status] ?? 'bg-secondary'}`} style={{ fontSize: 11 }}>
                        {entry.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: '#6c757d' }}>
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/entries/${entry.id}`)}>
                          <i className="bi bi-eye" />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => { if (confirm('Delete this submission?')) deleteMutation.mutate(entry.id) }}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
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
