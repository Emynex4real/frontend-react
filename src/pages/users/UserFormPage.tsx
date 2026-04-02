import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, rolesApi, branchesApi, departmentsApi } from '../../services/api';
import type { UserForm } from '../../types';
import type { Role } from '../../types';
import type { Branch } from '../../types';
import type { Department } from '../../types';

export default function UserFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserForm>({
    defaultValues: { status: 'active' },
  });

  const { data: userRes } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getOne(Number(id)),
    enabled: isEdit,
  });

  const { data: rolesRes } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.getAll });
  const { data: branchesRes } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll });
  const { data: deptsRes } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.getAll });

  useEffect(() => {
    if (userRes?.data) reset(userRes.data as unknown as UserForm);
  }, [userRes, reset]);

  const mutation = useMutation({
    mutationFn: (data: UserForm) =>
      isEdit ? usersApi.update(Number(id), data) : usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      navigate('/users');
    },
  });

  return (
    <div className="vision-form-wrapper">
      <style>{`
        .vision-form-wrapper {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          padding: 8px;
        }

        /* Premium Header */
        .vision-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }
        
        .vision-back-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #52525B;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .vision-back-btn:hover {
          background: #F4F4F5;
          color: #09090B;
          transform: translateX(-2px);
        }

        .vision-title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.6px;
          color: #09090B;
          margin: 0;
        }

        /* Glassmorphic Form Card */
        .vision-form-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(32px) saturate(150%);
          -webkit-backdrop-filter: blur(32px) saturate(150%);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 20px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0,0,0,0.01);
          padding: 32px;
          max-width: 680px; /* Wider to accommodate 2 columns gracefully */
        }

        /* Form Layout */
        .vision-form-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (min-width: 640px) {
          .vision-form-row {
            grid-template-columns: 1fr 1fr;
          }
        }

        .vision-form-group {
          display: flex;
          flex-direction: column;
        }

        .vision-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #3F3F46;
          margin-bottom: 8px;
          letter-spacing: 0.2px;
        }

        .vision-input, .vision-select {
          width: 100%;
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: #09090B;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.01);
          font-family: inherit;
        }
        
        .vision-input::placeholder {
          color: #A1A1AA;
        }

        .vision-input:focus, .vision-select:focus {
          background: #FFFFFF;
          border-color: rgba(249, 115, 22, 0.4);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1), 0 2px 8px rgba(0,0,0,0.02);
        }

        .vision-input.is-invalid, .vision-select.is-invalid {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.02);
        }
        .vision-input.is-invalid:focus, .vision-select.is-invalid:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        /* Custom Select Wrapper */
        .vision-select {
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
        }
        .vision-select-wrapper {
          position: relative;
          width: 100%;
        }
        .vision-select-wrapper::after {
          content: "";
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 10px;
          height: 6px;
          background-color: #A1A1AA;
          clip-path: polygon(100% 0%, 0 0%, 50% 100%);
          pointer-events: none;
        }

        .vision-error-text {
          color: #EF4444;
          font-size: 12px;
          margin-top: 6px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Alert Banner */
        .vision-alert-danger {
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

        /* Buttons */
        .vision-actions {
          display: flex;
          gap: 12px;
          margin-top: 36px;
          padding-top: 24px;
          border-top: 1px solid rgba(0, 0, 0, 0.04);
        }

        .vision-btn-primary {
          background: #09090B;
          color: #FFFFFF;
          border: none;
          padding: 10px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .vision-btn-primary:hover:not(:disabled) {
          background: #27272A;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .vision-btn-primary:disabled {
          background: #52525B;
          cursor: not-allowed;
          box-shadow: none;
        }

        .vision-btn-secondary {
          background: transparent;
          color: #71717A;
          border: 1px solid transparent;
          padding: 10px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .vision-btn-secondary:hover {
          background: rgba(0, 0, 0, 0.04);
          color: #09090B;
        }

        /* Custom spinner */
        .vision-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #FFF;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="vision-header">
        <button 
          type="button"
          className="vision-back-btn" 
          onClick={() => navigate('/users')}
          title="Back to Users"
        >
          <i className="bi bi-arrow-left" style={{ fontSize: 16 }} />
        </button>
        <h4 className="vision-title">{isEdit ? 'Edit User details' : 'Register new User'}</h4>
      </div>

      <div className="vision-form-card">
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          
          <div className="vision-form-row">
            <div className="vision-form-group">
              <label className="vision-label">
                Full Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                className={`vision-input ${errors.full_name ? 'is-invalid' : ''}`}
                placeholder="e.g. Jane Doe"
                {...register('full_name', { required: 'Full name is required' })}
              />
              {errors.full_name && (
                <div className="vision-error-text">
                  <i className="bi bi-exclamation-circle" /> {errors.full_name.message}
                </div>
              )}
            </div>

            <div className="vision-form-group">
              <label className="vision-label">
                Username <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                className={`vision-input ${errors.username ? 'is-invalid' : ''}`}
                placeholder="e.g. janedoe"
                {...register('username', { required: 'Username is required' })}
              />
              {errors.username && (
                <div className="vision-error-text">
                  <i className="bi bi-exclamation-circle" /> {errors.username.message}
                </div>
              )}
            </div>
          </div>

          <div className="vision-form-row">
            <div className="vision-form-group">
              <label className="vision-label">
                Email Address <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="email"
                className={`vision-input ${errors.email ? 'is-invalid' : ''}`}
                placeholder="jane@example.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <div className="vision-error-text">
                  <i className="bi bi-exclamation-circle" /> {errors.email.message}
                </div>
              )}
            </div>

            <div className="vision-form-group">
              <label className="vision-label">
                Password {!isEdit && <span style={{ color: '#EF4444' }}>*</span>}
              </label>
              <input
                type="password"
                className={`vision-input ${errors.password ? 'is-invalid' : ''}`}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Enter secure password'}
                {...register('password', { required: !isEdit ? 'Password is required' : false })}
              />
              {errors.password && (
                <div className="vision-error-text">
                  <i className="bi bi-exclamation-circle" /> {errors.password.message}
                </div>
              )}
            </div>
          </div>

          <div className="vision-form-row">
            <div className="vision-form-group">
              <label className="vision-label">
                System Role <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div className="vision-select-wrapper">
                <select
                  className={`vision-select ${errors.role_id ? 'is-invalid' : ''}`}
                  {...register('role_id', { required: 'Role is required', valueAsNumber: true })}
                >
                  <option value="">— Select System Role —</option>
                  {(rolesRes?.data ?? []).map((r: Role) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              {errors.role_id && (
                <div className="vision-error-text">
                  <i className="bi bi-exclamation-circle" /> {errors.role_id.message}
                </div>
              )}
            </div>

            <div className="vision-form-group">
              <label className="vision-label">Account Status</label>
              <div className="vision-select-wrapper">
                <select className="vision-select" {...register('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="vision-form-row">
            <div className="vision-form-group">
              <label className="vision-label">Assigned Branch</label>
              <div className="vision-select-wrapper">
                <select className="vision-select" {...register('branch_id', { valueAsNumber: true })}>
                  <option value="">— Select Branch —</option>
                  {(branchesRes?.data ?? []).map((b: Branch) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="vision-form-group">
              <label className="vision-label">Assigned Department</label>
              <div className="vision-select-wrapper">
                <select className="vision-select" {...register('department_id', { valueAsNumber: true })}>
                  <option value="">— Select Department —</option>
                  {(deptsRes?.data ?? []).map((d: Department) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {mutation.isError && (
            <div className="vision-alert-danger mt-3">
              <i className="bi bi-x-circle-fill" />
              <span>Failed to save the user. Please check your connection and try again.</span>
            </div>
          )}

          <div className="vision-actions">
            <button type="submit" className="vision-btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <div className="vision-spinner" /> Saving...
                </>
              ) : (
                'Save User'
              )}
            </button>
            <button 
              type="button" 
              className="vision-btn-secondary" 
              onClick={() => navigate('/users')}
              disabled={mutation.isPending}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}