import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { departmentsApi, branchesApi, usersApi } from '../../services/api'
import type { DepartmentForm } from '../../types'

export default function DepartmentFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DepartmentForm>({
    defaultValues: { status: 'active' },
  })

  const { data: deptRes } = useQuery({
    queryKey: ['department', id],
    queryFn: () => departmentsApi.getOne(Number(id)),
    enabled: isEdit,
  })

  const { data: branchesRes } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll })
  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: usersApi.getAll })

  useEffect(() => {
    if (deptRes?.data) reset(deptRes.data as unknown as DepartmentForm)
  }, [deptRes, reset])

  const mutation = useMutation({
    mutationFn: (data: DepartmentForm) =>
      isEdit ? departmentsApi.update(Number(id), data) : departmentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      navigate('/departments')
    },
  })

  return (
    <div>
      <div className="page-header">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/departments')}>
            <i className="bi bi-arrow-left" />
          </button>
          <h4>{isEdit ? 'Edit Department' : 'Add Department'}</h4>
        </div>
      </div>

      <div className="card-modern p-4" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSubmit(data => mutation.mutate(data))}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Department Name <span className="text-danger">*</span></label>
            <input
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              placeholder="e.g. Finance"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Description</label>
            <textarea className="form-control" rows={3} placeholder="Optional description" {...register('description')} />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Branch</label>
            <select className="form-select" {...register('branch_id', { valueAsNumber: true })}>
              <option value="">— Select Branch —</option>
              {(branchesRes?.data ?? []).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Department Head</label>
            <select className="form-select" {...register('head_id', { valueAsNumber: true })}>
              <option value="">— Select Head —</option>
              {(usersRes?.data ?? []).map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold">Status</label>
            <select className="form-select" {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {mutation.isError && (
            <div className="alert alert-danger py-2" style={{ fontSize: 13 }}>Failed to save. Please try again.</div>
          )}

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-brand" disabled={mutation.isPending}>
              {mutation.isPending ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : 'Save Department'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/departments')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
