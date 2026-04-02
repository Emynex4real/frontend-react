import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rolesApi } from '../../services/api'
import type { RoleForm } from '../../types'

const ALL_PERMISSIONS = [
  'manage_users',
  'manage_branches',
  'manage_departments',
  'manage_roles',
  'manage_reports',
  'view_reports',
  'submit_reports',
  'approve_reports',
  'export_data',
]

export default function RoleFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<RoleForm>({
    defaultValues: { permissions: [] },
  })

  const { data: roleRes } = useQuery({
    queryKey: ['role', id],
    queryFn: () => rolesApi.getOne(Number(id)),
    enabled: isEdit,
  })

  useEffect(() => {
    if (roleRes?.data) reset(roleRes.data as unknown as RoleForm)
  }, [roleRes, reset])

  const mutation = useMutation({
    mutationFn: (data: RoleForm) =>
      isEdit ? rolesApi.update(Number(id), data) : rolesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      navigate('/roles')
    },
  })

  return (
    <div>
      <div className="page-header">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/roles')}>
            <i className="bi bi-arrow-left" />
          </button>
          <h4>{isEdit ? 'Edit Role' : 'Add Role'}</h4>
        </div>
      </div>

      <div className="card-modern p-4" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSubmit(data => mutation.mutate(data))}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Role Name <span className="text-danger">*</span></label>
            <input
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              placeholder="e.g. Branch Manager"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Description</label>
            <textarea className="form-control" rows={2} placeholder="Role description" {...register('description')} />
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold">Permissions</label>
            <div className="p-3 border rounded" style={{ background: '#f8f9fa' }}>
              <Controller
                name="permissions"
                control={control}
                render={({ field }) => (
                  <div className="row g-2">
                    {ALL_PERMISSIONS.map(perm => (
                      <div key={perm} className="col-sm-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={perm}
                            checked={field.value.includes(perm)}
                            onChange={e => {
                              if (e.target.checked) {
                                field.onChange([...field.value, perm])
                              } else {
                                field.onChange(field.value.filter(p => p !== perm))
                              }
                            }}
                          />
                          <label className="form-check-label" htmlFor={perm} style={{ fontSize: 13 }}>
                            {perm.replace(/_/g, ' ')}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>

          {mutation.isError && (
            <div className="alert alert-danger py-2" style={{ fontSize: 13 }}>Failed to save. Please try again.</div>
          )}

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-brand" disabled={mutation.isPending}>
              {mutation.isPending ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : 'Save Role'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/roles')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
