import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { branchesApi, usersApi } from '../../services/api'
import type { BranchForm } from '../../types'

export default function BranchFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BranchForm>({
    defaultValues: { status: 'active' },
  })

  const { data: branchRes } = useQuery({
    queryKey: ['branch', id],
    queryFn: () => branchesApi.getOne(Number(id)),
    enabled: isEdit,
  })

  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  })

  useEffect(() => {
    if (branchRes?.data) reset(branchRes.data as unknown as BranchForm)
  }, [branchRes, reset])

  const mutation = useMutation({
    mutationFn: (data: BranchForm) =>
      isEdit ? branchesApi.update(Number(id), data) : branchesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] })
      navigate('/branches')
    },
  })

  const users = usersRes?.data ?? []

  return (
    <div>
      <div className="page-header">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/branches')}>
            <i className="bi bi-arrow-left" />
          </button>
          <h4>{isEdit ? 'Edit Branch' : 'Add Branch'}</h4>
        </div>
      </div>

      <div className="card-modern p-4" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSubmit(data => mutation.mutate(data))}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Branch Name <span className="text-danger">*</span></label>
            <input
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              placeholder="e.g. Lagos Main Branch"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Location <span className="text-danger">*</span></label>
            <input
              className={`form-control ${errors.location ? 'is-invalid' : ''}`}
              placeholder="e.g. Lagos, Nigeria"
              {...register('location', { required: 'Location is required' })}
            />
            {errors.location && <div className="invalid-feedback">{errors.location.message}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Branch Manager</label>
            <select className="form-select" {...register('manager_id', { valueAsNumber: true })}>
              <option value="">— Select Manager —</option>
              {users.map(u => (
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
            <div className="alert alert-danger py-2" style={{ fontSize: 13 }}>
              Failed to save. Please try again.
            </div>
          )}

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-brand" disabled={mutation.isPending}>
              {mutation.isPending ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : 'Save Branch'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/branches')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
