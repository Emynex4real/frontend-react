import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi, rolesApi, branchesApi } from '../../services/api'
import type { ReportForm, ReportField } from '../../types'

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', icon: 'bi-input-cursor-text' },
  { value: 'textarea', label: 'Text Area', icon: 'bi-text-paragraph' },
  { value: 'number', label: 'Number', icon: 'bi-123' },
  { value: 'select', label: 'Dropdown', icon: 'bi-chevron-bar-down' },
  { value: 'date', label: 'Date', icon: 'bi-calendar3' },
  { value: 'file', label: 'File Upload', icon: 'bi-paperclip' },
  { value: 'rating', label: 'Rating', icon: 'bi-star' },
  { value: 'section_header', label: 'Section Header', icon: 'bi-type-h2' },
]

let fieldCounter = 0

function newField(type: ReportField['type']): ReportField {
  return {
    id: `field_${++fieldCounter}`,
    type,
    label: '',
    required: false,
    options: type === 'select' ? ['Option 1', 'Option 2'] : undefined,
    width: 'full',
    order: fieldCounter,
  }
}

export default function ReportFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [fields, setFields] = useState<ReportField[]>([])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReportForm>({
    defaultValues: { priority: 'medium', status: 'draft', target_roles: [], target_branches: [] },
  })

  const { data: reportRes } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.getOne(Number(id)),
    enabled: isEdit,
  })

  const { data: rolesRes } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.getAll })
  const { data: branchesRes } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll })

  useEffect(() => {
    if (reportRes?.data) {
      const r = reportRes.data
      reset(r as unknown as ReportForm)
      setFields(r.fields ?? [])
    }
  }, [reportRes, reset])

  const mutation = useMutation({
    mutationFn: (data: ReportForm) => {
      const payload = { ...data, fields }
      return isEdit ? reportsApi.update(Number(id), payload) : reportsApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      navigate('/reports')
    },
  })

  const addField = (type: ReportField['type']) => {
    setFields(prev => [...prev, newField(type)])
  }

  const updateField = (fieldId: string, updates: Partial<ReportField>) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f))
  }

  const removeField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId))
  }

  const moveField = (index: number, dir: -1 | 1) => {
    setFields(prev => {
      const next = [...prev]
      const swap = index + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[index], next[swap]] = [next[swap], next[index]]
      return next
    })
  }

  return (
    <div>
      <div className="page-header">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/reports')}>
            <i className="bi bi-arrow-left" />
          </button>
          <h4>{isEdit ? 'Edit Template' : 'Create Report Template'}</h4>
        </div>
      </div>

      <form onSubmit={handleSubmit(data => mutation.mutate(data))}>
        <div className="row g-3">
          {/* Left: Settings */}
          <div className="col-lg-4">
            <div className="card-modern p-4">
              <h6 className="fw-semibold mb-3">Template Settings</h6>

              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Title <span className="text-danger">*</span></label>
                <input
                  className={`form-control form-control-sm ${errors.title ? 'is-invalid' : ''}`}
                  placeholder="Report title"
                  {...register('title', { required: 'Title is required' })}
                />
                {errors.title && <div className="invalid-feedback">{errors.title.message}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Description</label>
                <textarea className="form-control form-control-sm" rows={3} {...register('description')} />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Category</label>
                <input className="form-control form-control-sm" placeholder="e.g. Attendance" {...register('category')} />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Priority</label>
                  <select className="form-select form-select-sm" {...register('priority')}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Status</label>
                  <select className="form-select form-select-sm" {...register('status')}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Target Roles</label>
                <div style={{ maxHeight: 120, overflowY: 'auto' }} className="border rounded p-2">
                  {(rolesRes?.data ?? []).map(role => (
                    <div key={role.id} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`role_${role.id}`}
                        value={role.id}
                        {...register('target_roles')}
                      />
                      <label className="form-check-label" htmlFor={`role_${role.id}`} style={{ fontSize: 12 }}>
                        {role.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Target Branches</label>
                <div style={{ maxHeight: 120, overflowY: 'auto' }} className="border rounded p-2">
                  {(branchesRes?.data ?? []).map(branch => (
                    <div key={branch.id} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`branch_${branch.id}`}
                        value={branch.id}
                        {...register('target_branches')}
                      />
                      <label className="form-check-label" htmlFor={`branch_${branch.id}`} style={{ fontSize: 12 }}>
                        {branch.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Field Builder */}
          <div className="col-lg-8">
            <div className="card-modern p-4 mb-3">
              <h6 className="fw-semibold mb-3">Add Fields</h6>
              <div className="d-flex flex-wrap gap-2">
                {FIELD_TYPES.map(ft => (
                  <button
                    key={ft.value}
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                    onClick={() => addField(ft.value as ReportField['type'])}
                    style={{ fontSize: 12 }}
                  >
                    <i className={`bi ${ft.icon}`} />
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-modern p-4">
              <h6 className="fw-semibold mb-3">Form Fields ({fields.length})</h6>

              {fields.length === 0 ? (
                <div className="text-center py-4 text-muted border rounded" style={{ background: '#f8f9fa' }}>
                  <i className="bi bi-plus-square" style={{ fontSize: 28 }} />
                  <p className="mt-2 mb-0" style={{ fontSize: 13 }}>Add fields using the buttons above</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded p-3" style={{ background: '#f8f9fa' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="badge bg-secondary" style={{ fontSize: 11 }}>{field.type}</span>
                        <div className="d-flex gap-1">
                          <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={() => moveField(index, -1)}>
                            <i className="bi bi-chevron-up" style={{ fontSize: 11 }} />
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={() => moveField(index, 1)}>
                            <i className="bi bi-chevron-down" style={{ fontSize: 11 }} />
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger py-0 px-1" onClick={() => removeField(field.id)}>
                            <i className="bi bi-trash" style={{ fontSize: 11 }} />
                          </button>
                        </div>
                      </div>

                      <div className="row g-2">
                        <div className="col-sm-6">
                          <input
                            className="form-control form-control-sm"
                            placeholder="Field label"
                            value={field.label}
                            onChange={e => updateField(field.id, { label: e.target.value })}
                          />
                        </div>
                        <div className="col-sm-3">
                          <select
                            className="form-select form-select-sm"
                            value={field.width}
                            onChange={e => updateField(field.id, { width: e.target.value as ReportField['width'] })}
                          >
                            <option value="full">Full width</option>
                            <option value="half">Half</option>
                            <option value="third">Third</option>
                          </select>
                        </div>
                        <div className="col-sm-3 d-flex align-items-center">
                          <div className="form-check mb-0">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`req_${field.id}`}
                              checked={field.required}
                              onChange={e => updateField(field.id, { required: e.target.checked })}
                            />
                            <label className="form-check-label" htmlFor={`req_${field.id}`} style={{ fontSize: 12 }}>
                              Required
                            </label>
                          </div>
                        </div>

                        {field.type === 'select' && (
                          <div className="col-12">
                            <input
                              className="form-control form-control-sm"
                              placeholder="Options (comma-separated)"
                              value={field.options?.join(', ') ?? ''}
                              onChange={e => updateField(field.id, { options: e.target.value.split(',').map(o => o.trim()) })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {mutation.isError && (
          <div className="alert alert-danger mt-3 py-2" style={{ fontSize: 13 }}>Failed to save template.</div>
        )}

        <div className="d-flex gap-2 mt-3">
          <button type="submit" className="btn btn-brand" disabled={mutation.isPending}>
            {mutation.isPending ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : 'Save Template'}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/reports')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
