import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { departmentsApi } from '../../services/api'

export default function DepartmentsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: departmentsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  })

  const departments = (data?.data ?? []).filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h4>Departments</h4>
        <button className="btn btn-brand" onClick={() => navigate('/departments/new')}>
          <i className="bi bi-plus-lg me-1" /> Add Department
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
              placeholder="Search departments..."
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
                  <th>Branch</th>
                  <th>Head</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">No departments found</td></tr>
                ) : departments.map((dept, i) => (
                  <tr key={dept.id}>
                    <td style={{ color: '#6c757d' }}>{i + 1}</td>
                    <td className="fw-semibold">{dept.name}</td>
                    <td>{dept.branch_name ?? '—'}</td>
                    <td>{dept.head_name ?? '—'}</td>
                    <td>{dept.staff_count ?? '—'}</td>
                    <td>
                      <span className={`badge ${dept.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                        {dept.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/departments/${dept.id}/edit`)}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => { if (confirm(`Delete "${dept.name}"?`)) deleteMutation.mutate(dept.id) }}
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
