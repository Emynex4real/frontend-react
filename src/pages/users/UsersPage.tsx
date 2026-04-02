import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../../services/api'

export default function UsersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.getAll })

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const users = (data?.data ?? []).filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h4>Users</h4>
        <button className="btn btn-brand" onClick={() => navigate('/users/new')}>
          <i className="bi bi-plus-lg me-1" /> Add User
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
              placeholder="Search users..."
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
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">No users found</td></tr>
                ) : users.map((user, i) => (
                  <tr key={user.id}>
                    <td style={{ color: '#6c757d' }}>{i + 1}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: '#f7941d', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 600, flexShrink: 0,
                          }}
                        >
                          {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="fw-semibold">{user.full_name}</span>
                      </div>
                    </td>
                    <td>{user.username}</td>
                    <td style={{ fontSize: 13, color: '#6c757d' }}>{user.email}</td>
                    <td>
                      <span className="badge bg-light text-dark border" style={{ fontSize: 11 }}>
                        {user.role_name ?? '—'}
                      </span>
                    </td>
                    <td>{user.branch_name ?? '—'}</td>
                    <td>
                      <span className={`badge ${user.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/users/${user.id}/edit`)}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => { if (confirm(`Delete user "${user.full_name}"?`)) deleteMutation.mutate(user.id) }}
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
