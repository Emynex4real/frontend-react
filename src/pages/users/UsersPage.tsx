import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../services/api';
import type { User } from '../../types';

export default function UsersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.getAll });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const users = (data?.data ?? []).filter((u: User) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="vision-page-wrapper">
      <style>{`
        .vision-page-wrapper {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          padding: 8px;
        }

        /* Typography */
        .vision-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.8px;
          color: #09090B;
          margin: 0;
        }

        /* Buttons */
        .btn-vision-brand {
          background: #09090B;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 18px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-vision-brand:hover {
          background: #27272A;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-action-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: #71717A;
          transition: all 0.2s ease;
        }
        .btn-action-icon:hover {
          background: rgba(0, 0, 0, 0.04);
          color: #09090B;
        }
        .btn-action-icon.danger:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #DC2626;
        }

        /* Main Container Card */
        .vision-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.02);
          padding: 24px;
        }

        /* Spotlight Search */
        .vision-search-wrapper {
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 12px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%;
          max-width: 340px;
        }
        .vision-search-wrapper:focus-within {
          background: #FFFFFF;
          border-color: rgba(249, 115, 22, 0.4);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1), 0 4px 12px rgba(0, 0, 0, 0.03);
        }
        .vision-search-input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          font-size: 14px;
          color: #09090B;
        }
        .vision-search-input::placeholder {
          color: #A1A1AA;
        }

        /* Grid List Redesign */
        .vision-list-container {
          overflow-x: auto;
        }
        .vision-grid-row {
          display: grid;
          /* Columns: #, Name, Username, Email, Role, Branch, Status, Actions */
          grid-template-columns: 40px 2.5fr 1.5fr 2fr 1.2fr 1.5fr 90px 90px;
          align-items: center;
          min-width: 1050px;
        }
        
        .vision-header-row {
          font-size: 12px;
          font-weight: 600;
          color: #71717A;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0 16px 12px 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
          margin-bottom: 8px;
        }

        .vision-data-row {
          padding: 12px 16px;
          border-radius: 12px;
          transition: background 0.2s ease;
        }
        .vision-data-row:hover {
          background: rgba(0, 0, 0, 0.02);
        }

        /* Avatar */
        .vision-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(249, 115, 22, 0.2);
          border: 1px solid rgba(255,255,255,0.4);
        }

        /* Badges */
        .vision-role-badge {
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.06);
          color: #3F3F46;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          display: inline-block;
        }

        .vision-pill {
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
        }
        .pill-active {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }
        .pill-inactive {
          background: rgba(113, 113, 122, 0.1);
          color: #52525B;
        }
        
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .dot-active { background: #10B981; }
        .dot-inactive { background: #A1A1AA; }
      `}</style>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="vision-title">Users</h1>
        <button className="btn-vision-brand" onClick={() => navigate('/users/new')}>
          <i className="bi bi-plus" style={{ fontSize: 18 }} />
          <span>Add User</span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="vision-card">
        {/* Toolbar */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="vision-search-wrapper">
            <i className="bi bi-search" style={{ color: '#A1A1AA', fontSize: 14 }} />
            <input
              className="vision-search-input"
              placeholder="Search by name, email, or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <i 
                className="bi bi-x-circle-fill text-muted" 
                style={{ cursor: 'pointer', fontSize: 12 }} 
                onClick={() => setSearch('')}
              />
            )}
          </div>
        </div>

        {/* List / Grid Area */}
        {isLoading ? (
          <div className="d-flex flex-column justify-content-center align-items-center py-5" style={{ minHeight: 200 }}>
            <div className="spinner-border spinner-border-sm mb-3" style={{ color: '#F97316', width: '2rem', height: '2rem' }} />
            <span style={{ color: '#71717A', fontSize: 14, fontWeight: 500 }}>Loading users...</span>
          </div>
        ) : (
          <div className="vision-list-container">
            {/* Header Row */}
            <div className="vision-grid-row vision-header-row">
              <div>#</div>
              <div>Name</div>
              <div>Username</div>
              <div>Email</div>
              <div>Role</div>
              <div>Branch</div>
              <div>Status</div>
              <div className="text-end">Actions</div>
            </div>

            {/* Data Rows */}
            <div>
              {users.length === 0 ? (
                <div className="text-center py-5">
                  <div style={{ width: 48, height: 48, background: 'rgba(0,0,0,0.02)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <i className="bi bi-people text-muted" style={{ fontSize: 20 }} />
                  </div>
                  <h6 style={{ color: '#09090B', fontWeight: 600, margin: 0 }}>No users found</h6>
                  <p style={{ color: '#71717A', fontSize: 14, marginTop: 4 }}>Adjust your search or invite a new user.</p>
                </div>
              ) : (
                users.map((user: User, i: number) => {
                  const isActive = user.status === 'active';
                  const initials = user.full_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  
                  return (
                    <div key={user.id} className="vision-grid-row vision-data-row">
                      {/* Index */}
                      <div style={{ color: '#A1A1AA', fontSize: 13, fontWeight: 500 }}>
                        {(i + 1).toString().padStart(2, '0')}
                      </div>
                      
                      {/* Name & Avatar */}
                      <div className="d-flex align-items-center gap-3">
                        <div className="vision-avatar">
                          {initials}
                        </div>
                        <span style={{ color: '#09090B', fontWeight: 600, fontSize: 14 }}>
                          {user.full_name}
                        </span>
                      </div>
                      
                      {/* Username */}
                      <div style={{ color: '#52525B', fontSize: 14, fontWeight: 500 }}>
                        @{user.username}
                      </div>

                      {/* Email */}
                      <div style={{ color: '#71717A', fontSize: 14 }}>
                        {user.email}
                      </div>
                      
                      {/* Role */}
                      <div>
                        <span className="vision-role-badge">
                          {user.role_name ?? 'Unassigned'}
                        </span>
                      </div>
                      
                      {/* Branch */}
                      <div className="d-flex align-items-center gap-2">
                        {user.branch_name ? (
                          <span style={{ color: '#52525B', fontSize: 14 }}>{user.branch_name}</span>
                        ) : (
                          <span style={{ color: '#A1A1AA', fontSize: 14 }}>—</span>
                        )}
                      </div>
                      
                      {/* Status */}
                      <div>
                        <span className={`vision-pill ${isActive ? 'pill-active' : 'pill-inactive'}`}>
                          <span className={`dot ${isActive ? 'dot-active' : 'dot-inactive'}`} />
                          <span style={{ textTransform: 'capitalize' }}>{user.status}</span>
                        </span>
                      </div>
                      
                      {/* Actions */}
                      <div className="d-flex justify-content-end gap-1">
                        <button
                          className="btn-action-icon"
                          onClick={() => navigate(`/users/${user.id}/edit`)}
                          title="Edit User"
                        >
                          <i className="bi bi-pencil" style={{ fontSize: 14 }} />
                        </button>
                        <button
                          className="btn-action-icon danger"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${user.full_name}"?`)) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                          title="Delete User"
                        >
                          <i className="bi bi-trash3" style={{ fontSize: 14 }} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}