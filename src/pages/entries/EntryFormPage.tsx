import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi, entriesApi } from '../../services/api'
import type { Report, ReportField } from '../../types'

export default function EntryFormPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})

  const { data: reportsRes, isLoading } = useQuery({
    queryKey: ['reports-published'],
    queryFn: reportsApi.getAll,
  })

  const publishedReports = (reportsRes?.data ?? []).filter(r => r.status === 'published')

  const mutation = useMutation({
    mutationFn: entriesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] })
      navigate('/entries')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReport) return
    mutation.mutate({ report_id: selectedReport.id, data: formData })
  }

  const renderField = (field: ReportField) => {
    const colClass = field.width === 'half' ? 'col-md-6' : field.width === 'third' ? 'col-md-4' : 'col-12'
    const value = (formData[field.id] ?? '') as string

    if (field.type === 'section_header') {
      return (
        <div key={field.id} className="col-12">
          <h6 className="fw-semibold mt-2 mb-1 pb-2 border-bottom">{field.label || 'Section'}</h6>
        </div>
      )
    }

    return (
      <div key={field.id} className={colClass}>
        <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
          {field.label}
          {field.required && <span className="text-danger ms-1">*</span>}
        </label>

        {field.type === 'textarea' ? (
          <textarea
            className="form-control"
            rows={3}
            required={field.required}
            value={value}
            onChange={e => setFormData(d => ({ ...d, [field.id]: e.target.value }))}
          />
        ) : field.type === 'select' ? (
          <select
            className="form-select"
            required={field.required}
            value={value}
            onChange={e => setFormData(d => ({ ...d, [field.id]: e.target.value }))}
          >
            <option value="">— Select —</option>
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : field.type === 'rating' ? (
          <div className="d-flex gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                className="btn btn-sm p-0"
                style={{ fontSize: 22, color: Number(value) >= star ? '#f7941d' : '#dee2e6' }}
                onClick={() => setFormData(d => ({ ...d, [field.id]: star }))}
              >
                <i className="bi bi-star-fill" />
              </button>
            ))}
          </div>
        ) : (
          <input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            className="form-control"
            required={field.required}
            value={value}
            onChange={e => setFormData(d => ({ ...d, [field.id]: e.target.value }))}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/entries')}>
            <i className="bi bi-arrow-left" />
          </button>
          <h4>Submit Report</h4>
        </div>
      </div>

      {!selectedReport ? (
        <div>
          <p className="text-muted mb-3">Select a report template to fill out:</p>
          {isLoading ? (
            <div className="text-center py-5"><div className="spinner-border" style={{ color: '#f7941d' }} /></div>
          ) : publishedReports.length === 0 ? (
            <div className="card-modern p-5 text-center text-muted">
              <i className="bi bi-file-earmark-x" style={{ fontSize: 36 }} />
              <p className="mt-2">No report templates available</p>
            </div>
          ) : (
            <div className="row g-3">
              {publishedReports.map(report => (
                <div key={report.id} className="col-md-6 col-xl-4">
                  <div
                    className="card-modern p-4 h-100"
                    style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onClick={() => setSelectedReport(report)}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
                  >
                    <div className="d-flex align-items-start gap-3">
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(247,148,29,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="bi bi-file-earmark-text" style={{ color: '#f7941d', fontSize: 18 }} />
                      </div>
                      <div>
                        <h6 className="fw-semibold mb-1" style={{ fontSize: 14 }}>{report.title}</h6>
                        {report.description && (
                          <p style={{ fontSize: 12, color: '#6c757d', margin: 0 }}>{report.description.slice(0, 60)}…</p>
                        )}
                        <span className="badge bg-light text-muted border mt-1" style={{ fontSize: 10 }}>
                          {report.fields?.length ?? 0} fields
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="d-flex align-items-center gap-2 mb-4">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedReport(null)}>
              <i className="bi bi-arrow-left me-1" />Back
            </button>
            <span className="text-muted" style={{ fontSize: 13 }}>Filling: <strong>{selectedReport.title}</strong></span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="card-modern p-4">
              <div className="row g-3">
                {(selectedReport.fields ?? []).sort((a, b) => a.order - b.order).map(renderField)}
              </div>
            </div>

            {mutation.isError && (
              <div className="alert alert-danger mt-3 py-2" style={{ fontSize: 13 }}>Failed to submit. Please try again.</div>
            )}

            <div className="d-flex gap-2 mt-3">
              <button type="submit" className="btn btn-brand" disabled={mutation.isPending}>
                {mutation.isPending ? <><span className="spinner-border spinner-border-sm me-2" />Submitting...</> : 'Submit Report'}
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/entries')}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
