import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../../services/api';
import type { RoleForm } from '../../types';

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
];

// Helper to format permission strings beautifully
const formatPermissionName = (perm: string) => {
  return perm.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function RoleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<RoleForm>({
    defaultValues: { permissions: [] },
  });

  const { data: roleRes } = useQuery({
    queryKey: ['role', id],
    queryFn: () => rolesApi.getOne(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (roleRes?.data) reset(roleRes.data as unknown as RoleForm);
  }, [roleRes, reset]);

  const mutation = useMutation({
    mutationFn: (data: RoleForm) =>
      isEdit ? rolesApi.update(Number(id), data) : rolesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      navigate('/roles');
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
          max-width: 680px;
        }

        /* Form Controls */
        .vision-form-group {
          margin-bottom: 24px;
        }

        .vision-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #3F3F46;
          margin-bottom: 8px;
          letter-spacing: 0.2px;
        }

        .vision-input, .vision-textarea {
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

        .vision-textarea {
          resize: vertical;
          min-height: 80px;
        }
        
        .vision-input::placeholder, .vision-textarea::placeholder {
          color: #A1A1AA;
        }

        .vision-input:focus, .vision-textarea:focus {
          background: #FFFFFF;
          border-color: rgba(249, 115, 22, 0.4);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1), 0 2px 8px rgba(0,0,0,0.02);
        }

        .vision-input.is-invalid {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.02);
        }
        .vision-input.is-invalid:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        /* Permission Checkbox Cards (Modern Redesign) */
        .vision-perms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.015);
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .vision-perm-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.01);
        }

        .vision-perm-card:hover {
          border-color: rgba(0, 0, 0, 0.15);
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
          transform: translateY(-1px);
        }

        .vision-perm-card.active {
          background: rgba(249, 115, 22, 0.04);
          border-color: rgba(249, 115, 22, 0.4);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.08);
        }

        .vision-perm-card input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .perm-indicator {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 1.5px solid #D4D4D8;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          background: #FFFFFF;
          flex-shrink: 0;
        }

        .vision-perm-card.active .perm-indicator {
          background: #F97316;
          border-color: #F97316;
        }

        .perm-indicator::after {
          content: "";
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .vision-perm-card.active .perm-indicator::after {
          opacity: 1;
        }

        .perm-label {
          font-size: 13px;
          font-weight: 500;
          color: #3F3F46;
          user-select: none;
          transition: color 0.2s ease;
        }
        
        .vision-perm-card.active .perm-label {
          color: #09090B;
          font-weight: 600;
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
          margin-top: 32px;
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
          onClick={() => navigate('/roles')}
          title="Back to Roles"
        >
          <i className="bi bi-arrow-left" style={{ fontSize: 16 }} />
        </button>
        <h4 className="vision-title">{isEdit ? 'Edit Role Details' : 'Define New Role'}</h4>
      </div>

      <div className="vision-form-card">
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          
          <div className="vision-form-group">
            <label className="vision-label">
              Role Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              className={`vision-input ${errors.name ? 'is-invalid' : ''}`}
              placeholder="e.g. Branch Manager"
              {...register('name', { required: 'Role name is required' })}
            />
            {errors.name && (
              <div className="vision-error-text">
                <i className="bi bi-exclamation-circle" /> {errors.name.message}
              </div>
            )}
          </div>

          <div className="vision-form-group">
            <label className="vision-label">Description</label>
            <textarea 
              className="vision-textarea" 
              placeholder="Briefly describe the responsibilities of this role..." 
              {...register('description')} 
            />
          </div>

          <div className="vision-form-group" style={{ marginTop: 32 }}>
            <label className="vision-label" style={{ marginBottom: 12 }}>
              Access Permissions
            </label>
            
            <Controller
              name="permissions"
              control={control}
              render={({ field }) => (
                <div className="vision-perms-grid">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = field.value.includes(perm);
                    
                    return (
                      <label key={perm} className={`vision-perm-card ${isChecked ? 'active' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              field.onChange([...field.value, perm]);
                            } else {
                              field.onChange(field.value.filter((p) => p !== perm));
                            }
                          }}
                        />
                        <div className="perm-indicator" />
                        <span className="perm-label">{formatPermissionName(perm)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {mutation.isError && (
            <div className="vision-alert-danger mt-3">
              <i className="bi bi-x-circle-fill" />
              <span>Failed to save the role. Please check your connection and try again.</span>
            </div>
          )}

          <div className="vision-actions">
            <button type="submit" className="vision-btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <div className="vision-spinner" /> Saving...
                </>
              ) : (
                'Save Role'
              )}
            </button>
            <button 
              type="button" 
              className="vision-btn-secondary" 
              onClick={() => navigate('/roles')}
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