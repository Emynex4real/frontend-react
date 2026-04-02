import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { entriesApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const statusColors: Record<string, { bg: string; color: string }> = {
  pending:  { bg: '#fff3cd', color: '#856404' },
  approved: { bg: '#d1fae5', color: '#065f46' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
}

export default function EntryViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useAuth()
  const queryClient = useQueryClient()

  const { data: res, isLoading } = useQuery({
    queryKey: ['entry', id],
    queryFn: () => entriesApi.getOne(Number(id)),
    enabled: !!id,
  })

  const approveMutation = useMutation({
    mutationFn: (status: 'approved' | 'rejected') =>
      entriesApi.updateStatus(Number(id), status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entry', id] })
      queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
  })

  const entry = res?.data

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" style={{ color: '#f7941d' }} role="status" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: 40 }} />
        <p className="mt-3 text-muted">Submission not found.</p>
        <button className="btn btn-brand mt-2" onClick={() => navigate('/entries')}>
          Back to Submissions
        </button>
      </div>
    )
  }

  const style = statusColors[entry.status] ?? statusColors.pending

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => navigate(-1)}
          >
            <i className="bi bi-arrow-left me-1" /> Back
          </button>
          <div>
            <h4>{entry.report_title ?? `Report #${entry.report_id}`}</h4>
            <p className="text-muted mb-0" style={{ fontSize: 13 }}>
              Submitted by <strong>{entry.submitter_name ?? '—'}</strong> •{' '}
              {new Date(entry.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Status badge + actions */}
        <div className="d-flex align-items-center gap-2">
          <span
            className="badge fw-semibold px-3 py-2"
            style={{ ...style, fontSize: 12, borderRadius: 6 }}
          >
            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
          </span>

          {can('approve_reports') && entry.status === 'pending' && (
            <>
              <button
                className="btn btn-sm btn-success d-flex align-items-center gap-1"
                onClick={() => approveMutation.mutate('approved')}
                disabled={approveMutation.isPending}
              >
                <i className="bi bi-check-circle" /> Approve
              </button>
              <button
                className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                onClick={() => approveMutation.mutate('rejected')}
                disabled={approveMutation.isPending}
              >
                <i className="bi bi-x-circle" /> Reject
              </button>
            </>
          )}
        </div>
      </div>

      <div className="row g-3">
        {/* Submission data */}
        <div className="col-lg-8">
          <div className="card-modern p-4">
            <h6 className="fw-semibold mb-3">Submission Data</h6>
            {Object.keys(entry.data ?? {}).length === 0 ? (
              <p className="text-muted mb-0" style={{ fontSize: 13 }}>No data recorded.</p>
            ) : (
              <dl className="row mb-0" style={{ fontSize: 13 }}>
                {Object.entries(entry.data).map(([key, value]) => (
                  <div key={key} className="col-sm-6 mb-3">
                    <dt className="text-muted fw-normal mb-1" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {key.replace(/_/g, ' ')}
                    </dt>
                    <dd className="mb-0 fw-semibold" style={{ wordBreak: 'break-word' }}>
                      {String(value ?? '—')}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="col-lg-4">
          <div className="card-modern p-4">
            <h6 className="fw-semibold mb-3">Details</h6>
            <ul className="list-unstyled mb-0" style={{ fontSize: 13 }}>
              <li className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Branch</span>
                <span className="fw-semibold">{entry.branch_name ?? '—'}</span>
              </li>
              <li className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Submitted by</span>
                <span className="fw-semibold">{entry.submitter_name ?? '—'}</span>
              </li>
              <li className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Status</span>
                <span
                  className="badge"
                  style={{ ...style, fontSize: 11 }}
                >
                  {entry.status}
                </span>
              </li>
              <li className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Submitted</span>
                <span>{new Date(entry.created_at).toLocaleDateString()}</span>
              </li>
              <li className="d-flex justify-content-between py-2">
                <span className="text-muted">Last updated</span>
                <span>{new Date(entry.updated_at).toLocaleDateString()}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
