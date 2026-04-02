import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rolesApi } from '../../services/api'

export default function RolesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.getAll })

  const deleteMutation = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })

  const roles = (data?.data ?? []).filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h4>Roles</h4>
        <button className="btn btn-brand" onClick={() => navigate('/roles/new')}>
          <i className="bi bi-plus-lg me-1" /> Add Role
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
              placeholder="Search roles..."
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
                  <th>Role Name</th>
                  <th>Description</th>
                  <th>Permissions</th>
                  <th>Users</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 text-muted">No roles found</td></tr>
                ) : roles.map((role, i) => (
                  <tr key={role.id}>
                    <td style={{ color: '#6c757d' }}>{i + 1}</td>
                    <td className="fw-semibold">{role.name}</td>
                    <td style={{ fontSize: 13, color: '#6c757d' }}>{role.description ?? '—'}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {(role.permissions ?? []).slice(0, 3).map(p => (
                          <span key={p} className="badge bg-light text-dark border" style={{ fontSize: 10 }}>{p}</span>
                        ))}
                        {(role.permissions ?? []).length > 3 && (
                          <span className="badge bg-light text-muted border" style={{ fontSize: 10 }}>
                            +{role.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{role.user_count ?? '—'}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/roles/${role.id}/edit`)}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => { if (confirm(`Delete role "${role.name}"?`)) deleteMutation.mutate(role.id) }}
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
