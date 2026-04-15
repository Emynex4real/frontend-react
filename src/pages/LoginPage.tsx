import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin',  username: 'admin',        role: 'Full access',       icon: 'bi-shield-fill',       color: '#F97316', bg: 'rgba(249, 115, 22, 0.1)' },
  { label: 'Branch Mgr',  username: 'manager',      role: 'Manage branch',     icon: 'bi-person-badge-fill', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.1)' },
  { label: 'Asst. Mgr',   username: 'asst_manager', role: 'Team coordination', icon: 'bi-person-workspace',  color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)' },
  { label: 'Branch Admin', username: 'branch_admin', role: 'Compliance',        icon: 'bi-person-gear',       color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  { label: 'Staff',        username: 'staff',        role: 'Submit reports',    icon: 'bi-person-fill',       color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
];

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]           = useState({ username: '', password: '' });
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw]       = useState(false);

  if (loading) return null;
  if (user)    return <Navigate to="/" replace />;

  const doLogin = async (username: string, password: string) => {
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(form.username, form.password);
  };

  return (
    <div className="vision-login-wrapper">
      <style>{`
        .vision-login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          background-color: #F8FAFC;
          position: relative;
          overflow: hidden;
        }

        /* Ambient Background Orbs */
        .vision-ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.4;
          pointer-events: none;
          z-index: 0;
          animation: float 20s ease-in-out infinite alternate;
        }
        .orb-1 {
          width: 600px;
          height: 600px;
          background: #F97316;
          top: -20%;
          left: -10%;
        }
        .orb-2 {
          width: 500px;
          height: 500px;
          background: #3B82F6;
          bottom: -20%;
          right: -10%;
          animation-delay: -10s;
        }
        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, 50px) scale(1.1); }
        }

        .vision-content-container {
          width: 100%;
          max-width: 440px;
          padding: 24px 20px;
          position: relative;
          z-index: 10;
        }

        /* Glassmorphism Panel */
        .vision-glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(40px) saturate(150%);
          -webkit-backdrop-filter: blur(40px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 24px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.02) inset;
          padding: 32px;
        }

        .vision-logo-box {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(249, 115, 22, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.3);
          margin-bottom: 24px;
        }

        /* Demo Accounts Area */
        .vision-demo-section {
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 32px;
        }

        /* Desktop: single row of 5 */
        .vision-demo-grid {
          display: flex;
          gap: 8px;
        }

        .vision-demo-card {
          flex: 1;
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 12px;
          padding: 12px 8px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.01);
          min-height: 44px;
        }
        .vision-demo-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.04);
          border-color: rgba(0, 0, 0, 0.08);
        }
        .vision-demo-card:active {
          transform: translateY(0) scale(0.98);
        }

        /* Form Inputs */
        .vision-input-group {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          transition: all 0.2s;
          overflow: hidden;
        }
        .vision-input-group:focus-within {
          background: #FFFFFF;
          border-color: rgba(249, 115, 22, 0.4);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1), 0 2px 8px rgba(0,0,0,0.02);
        }
        .vision-input-icon {
          padding-left: 16px;
          color: #A1A1AA;
          font-size: 16px;
        }
        .vision-input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 14px 16px 14px 12px;
          font-size: 14px;
          color: #09090B;
          outline: none;
        }
        .vision-input::placeholder {
          color: #A1A1AA;
        }
        .vision-pw-toggle {
          background: transparent;
          border: none;
          padding: 0 16px;
          color: #A1A1AA;
          cursor: pointer;
          transition: color 0.2s;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vision-pw-toggle:hover { color: #3F3F46; }

        /* Button */
        .vision-btn-primary {
          width: 100%;
          background: #09090B;
          color: #FFFFFF;
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          min-height: 48px;
        }
        .vision-btn-primary:hover:not(:disabled) {
          background: #27272A;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        .vision-btn-primary:disabled {
          background: #52525B;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Alert */
        .vision-alert {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #DC2626;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
        }

        .vision-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #FFF;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ─── SMALL-MEDIUM: 3-col grid ──────────────────── */
        @media (min-width: 481px) and (max-width: 600px) {
          .vision-demo-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
        }

        /* ─── MOBILE STYLES ─────────────────────────────── */
        @media (max-width: 480px) {
          .vision-content-container {
            padding: 16px 12px;
          }

          /* Shrink orbs so they don't bleed */
          .orb-1 {
            width: 280px;
            height: 280px;
            top: -10%;
            left: -15%;
          }
          .orb-2 {
            width: 240px;
            height: 240px;
            bottom: -10%;
            right: -15%;
          }

          .vision-glass-panel {
            padding: 20px 16px;
            border-radius: 20px;
          }

          .vision-logo-box {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            margin-bottom: 16px;
          }

          /* 2-column grid; 5th card (Staff) spans full width */
          .vision-demo-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .vision-demo-card:last-child {
            grid-column: 1 / -1;
          }

          .vision-demo-section {
            padding: 12px;
            margin-bottom: 20px;
          }

          /* font-size 16px prevents iOS auto-zoom on focus */
          .vision-input {
            padding: 12px 12px 12px 10px;
            font-size: 16px;
          }

          .vision-btn-primary {
            font-size: 16px;
            padding: 15px;
          }
        }
      `}</style>

      {/* Ambient Background Elements */}
      <div className="vision-ambient-orb orb-1" />
      <div className="vision-ambient-orb orb-2" />

      <div className="vision-content-container">
        
        {/* Header Area */}
        <div className="text-center">
          <div className="vision-logo-box">
            <i className="bi bi-layers-half text-white" style={{ fontSize: 28 }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#09090B', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
            Digital World Admin
          </h2>
          <p style={{ fontSize: 14, color: '#71717A', margin: '0 0 28px 0' }}>
            Sign in to access your workspace
          </p>
        </div>

        <div className="vision-glass-panel">
          
          {/* Demo Accounts Panel */}
          <div className="vision-demo-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, justifyContent: 'center' }}>
              <i className="bi bi-lightning-fill" style={{ color: '#F97316', fontSize: 12 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Instant Demo Access
              </span>
            </div>
            
            <div className="vision-demo-grid">
              {DEMO_ACCOUNTS.map(a => (
                <button
                  key={a.username}
                  type="button"
                  disabled={submitting}
                  className="vision-demo-card"
                  onClick={() => doLogin(a.username, 'demo')}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: a.bg, color: a.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <i className={`bi ${a.icon}`} style={{ fontSize: 14 }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#09090B', lineHeight: 1.2 }}>{a.label}</div>
                  <div style={{ fontSize: 10, color: '#A1A1AA', marginTop: 2 }}>{a.role}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)' }} />
          </div>

          {/* Manual Login Form */}
          {error && (
            <div className="vision-alert">
              <i className="bi bi-exclamation-circle-fill" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3F3F46', marginBottom: 8 }}>
                Username
              </label>
              <div className="vision-input-group">
                <i className="bi bi-person vision-input-icon" />
                <input
                  type="text"
                  className="vision-input"
                  placeholder="Enter username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3F3F46', marginBottom: 8 }}>
                Password
              </label>
              <div className="vision-input-group">
                <i className="bi bi-lock vision-input-icon" />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="vision-input"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="vision-pw-toggle"
                  onClick={() => setShowPw(s => !s)}
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi bi-eye${showPw ? '-slash' : ''}`} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="vision-btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <><span className="vision-spinner" /> Signing in...</>
              ) : (
                'Sign In to Workspace'
              )}
            </button>
          </form>

        </div>
        
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#A1A1AA', fontWeight: 500 }}>
          © {new Date().getFullYear()} Digital World. All rights reserved.
        </p>
      </div>
    </div>
  );
}