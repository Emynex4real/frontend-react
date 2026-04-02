import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, rolesApi, branchesApi, departmentsApi } from '../../services/api'
import type { UserForm } from '../../types'

export default function UserFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserForm>({
    defaultValues: { status: 'active' },
  })

  const { data: userRes } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getOne(Number(id)),
    enabled: isEdit,
  })

  const { data: rolesRes } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.getAll })
  const { data: branchesRes } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll })
  const { data: deptsRes } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.getAll })

  useEffect(() => {
    if (userRes?.data) reset(userRes.data as unknown as UserForm)
  }, [userRes, reset])

  const mutation = useMutation({
    mutationFn: (data: UserForm) =>
      isEdit ? usersApi.update(Number(id), data) : usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      navigate('/users')
    },
  })

  return (
    <div>
      <div className="page-header">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/users')}>
            <i className="bi bi-arrow-left" />
          </button>
          <h4>{isEdit ? 'Edit User' : 'Add User'}</h4>
        </div>
      </div>

      <div className="card-modern p-4" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit(data => mutation.mutate(data))}>
          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
              <input
                className={`form-control ${errors.full_name ? 'is-invalid' : ''}`}
                placeholder="John Doe"
                {...register('full_name', { required: 'Full name is required' })}
              />
              {errors.full_name && <div className="invalid-feedback">{errors.full_name.message}</div>}
            </div>
            <div className="col-sm-6">
              <label className="form-label fw-semibold">Username <span className="text-danger">*</span></label>
              <input
                className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                placeholder="johndoe"
                {...register('username', { required: 'Username is required' })}
              />
              {errors.username && <div className="invalid-feedback">{errors.username.message}</div>}
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label className="form-label fw-semibold">Email <span className="text-danger">*</span></label>
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                placeholder="john@example.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
            </div>
            <div className="col-sm-6">
              <label className="form-label fw-semibold">
                Password {!isEdit && <span className="text-danger">*</span>}
              </label>
              <input
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password'}
                {...register('password', { required: !isEdit ? 'Password is required' : false })}
              />
              {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label className="form-label fw-semibold">Role <span className="text-danger">*</span></label>
              <select
                className={`form-select ${errors.role_id ? 'is-invalid' : ''}`}
                {...register('role_id', { required: 'Role is required', valueAsNumber: true })}
              >
                <option value="">— Select Role —</option>
                {(rolesRes?.data ?? []).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {errors.role_id && <div className="invalid-feedback">{errors.role_id.message}</div>}
            </div>
            <div className="col-sm-6">
              <label className="form-label fw-semibold">Status</label>
              <select className="form-select" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-sm-6">
              <label className="form-label fw-semibold">Branch</label>
              <select className="form-select" {...register('branch_id', { valueAsNumber: true })}>
                <option value="">— Select Branch —</option>
                {(branchesRes?.data ?? []).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="col-sm-6">
              <label className="form-label fw-semibold">Department</label>
              <select className="form-select" {...register('department_id', { valueAsNumber: true })}>
                <option value="">— Select Department —</option>
                {(deptsRes?.data ?? []).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {mutation.isError && (
            <div className="alert alert-danger py-2" style={{ fontSize: 13 }}>Failed to save. Please try again.</div>
          )}

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-brand" disabled={mutation.isPending}>
              {mutation.isPending ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : 'Save User'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/users')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
