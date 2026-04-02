import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPw, setShowPw] = useState(false)

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1d23 0%, #2d3142 100%)' }}
    >
      <div style={{ width: '100%', maxWidth: 420, padding: '0 16px' }}>
        {/* Logo */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width: 60, height: 60, borderRadius: 16, background: '#f7941d' }}
          >
            <i className="bi bi-layers-fill text-white" style={{ fontSize: 28 }} />
          </div>
          <h4 className="text-white fw-bold mb-1">Digital World Admin</h4>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Sign in to your account</p>
        </div>

        <div className="card border-0 shadow-lg" style={{ borderRadius: 16 }}>
          <div className="card-body p-4">
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2" role="alert">
                <i className="bi bi-exclamation-circle-fill" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Username</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-person text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 bg-light"
                    placeholder="Enter username"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    required
                    autoFocus
                    style={{ boxShadow: 'none' }}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-lock text-muted" />
                  </span>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-control border-start-0 border-end-0 bg-light"
                    placeholder="Enter password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    style={{ boxShadow: 'none' }}
                  />
                  <button
                    type="button"
                    className="input-group-text bg-light border-start-0"
                    onClick={() => setShowPw(s => !s)}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className={`bi bi-eye${showPw ? '-slash' : ''} text-muted`} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-brand w-100 fw-semibold"
                disabled={submitting}
                style={{ borderRadius: 8, padding: '10px' }}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-2" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-3" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          © {new Date().getFullYear()} Digital World. All rights reserved.
        </p>
      </div>
    </div>
  )
}
