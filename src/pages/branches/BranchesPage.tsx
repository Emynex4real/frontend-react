import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { branchesApi } from '../../services/api'

export default function BranchesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: branchesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  })

  const branches = (data?.data ?? []).filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h4>Branches</h4>
        <button className="btn btn-brand" onClick={() => navigate('/branches/new')}>
          <i className="bi bi-plus-lg me-1" /> Add Branch
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
              placeholder="Search branches..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ boxShadow: 'none' }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: '#f7941d' }} />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Manager</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">No branches found</td>
                  </tr>
                ) : branches.map((branch, i) => (
                  <tr key={branch.id}>
                    <td style={{ color: '#6c757d' }}>{i + 1}</td>
                    <td className="fw-semibold">{branch.name}</td>
                    <td>{branch.location}</td>
                    <td>{branch.manager_name ?? '—'}</td>
                    <td>{branch.staff_count ?? '—'}</td>
                    <td>
                      <span className={`badge ${branch.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                        {branch.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`/branches/${branch.id}/edit`)}
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => {
                            if (confirm(`Delete branch "${branch.name}"?`)) {
                              deleteMutation.mutate(branch.id)
                            }
                          }}
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
