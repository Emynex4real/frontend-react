import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../../services/api';
import type { Report } from '../../types';

// Refined 2026 SaaS Color Palette for Priorities
const PRIORITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  high: { bg: 'rgba(239, 68, 68, 0.08)', text: '#DC2626', dot: '#EF4444' }, // Red
  medium: { bg: 'rgba(245, 158, 11, 0.08)', text: '#D97706', dot: '#F59E0B' }, // Amber
  low: { bg: 'rgba(16, 185, 129, 0.08)', text: '#059669', dot: '#10B981' }, // Emerald
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['reports'], queryFn: reportsApi.getAll });

  const deleteMutation = useMutation({
    mutationFn: reportsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });

  const reports = (data?.data ?? []).filter((r: Report) =>
    r.title.toLowerCase().includes(search.toLowerCase())
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
          gap: 8px;
        }
        .btn-vision-brand:hover {
          background: #27272A;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-vision-secondary {
          background: #FFFFFF;
          color: #3F3F46;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 18px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }
        .btn-vision-secondary:hover {
          background: #F4F4F5;
          color: #09090B;
          transform: translateY(-1px);
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
          color: #A1A1AA;
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

        /* Template Cards Grid */
        .vision-template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 24px;
        }

        .vision-template-card {
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.01);
        }
        .vision-template-card:hover {
          border-color: rgba(0, 0, 0, 0.12);
          box-shadow: 0 12px 24px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.02);
          transform: translateY(-2px);
        }

        /* Badges & Pills */
        .vision-badge-category {
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.05);
          color: #52525B;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .vision-pill {
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-transform: capitalize;
        }
        
        .vision-status-published {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }
        .vision-status-draft {
          background: rgba(113, 113, 122, 0.1);
          color: #52525B;
        }
        
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
      `}</style>

      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <h1 className="vision-title">Report Templates</h1>
        <div className="d-flex gap-2">
          <button className="btn-vision-secondary" onClick={() => navigate('/reports/builder')}>
            <i className="bi bi-tools text-muted" />
            <span>Form Builder</span>
          </button>
          <button className="btn-vision-brand" onClick={() => navigate('/reports/new')}>
            <i className="bi bi-plus" style={{ fontSize: 16 }} />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="vision-card">
        {/* Toolbar */}
        <div className="vision-search-wrapper">
          <i className="bi bi-search" style={{ color: '#A1A1AA', fontSize: 14 }} />
          <input
            className="vision-search-input"
            placeholder="Search templates by name..."
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

        {/* Content Area */}
        {isLoading ? (
          <div className="d-flex flex-column justify-content-center align-items-center py-5" style={{ minHeight: 200 }}>
            <div className="spinner-border spinner-border-sm mb-3" style={{ color: '#F97316', width: '2rem', height: '2rem' }} />
            <span style={{ color: '#71717A', fontSize: 14, fontWeight: 500 }}>Loading templates...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-5 mt-4">
            <div style={{ width: 64, height: 64, background: 'rgba(0,0,0,0.02)', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, transform: 'rotate(-5deg)' }}>
              <i className="bi bi-file-earmark-ruled" style={{ fontSize: 28, color: '#A1A1AA' }} />
            </div>
            <h6 style={{ color: '#09090B', fontWeight: 600, fontSize: 16, margin: 0 }}>No templates found</h6>
            <p style={{ color: '#71717A', fontSize: 14, marginTop: 4, marginBottom: 20 }}>
              {search ? "We couldn't find any templates matching your search." : "Get started by building your first report template."}
            </p>
            {!search && (
              <button className="btn-vision-brand mx-auto" onClick={() => navigate('/reports/new')}>
                Create Template
              </button>
            )}
          </div>
        ) : (
          <div className="vision-template-grid">
            {reports.map((report: Report) => {
              const priorityStyle = PRIORITY_STYLES[report.priority?.toLowerCase()] || PRIORITY_STYLES.medium;
              const isPublished = report.status === 'published';

              return (
                <div key={report.id} className="vision-template-card">
                  {/* Top Row: Title & Priority */}
                  <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#09090B', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                        {report.title}
                      </h3>
                      {report.category && (
                        <span className="vision-badge-category">
                          {report.category}
                        </span>
                      )}
                    </div>
                    <span 
                      className="vision-pill"
                      style={{ background: priorityStyle.bg, color: priorityStyle.text }}
                    >
                      <span className="dot" style={{ background: priorityStyle.dot }} />
                      {report.priority || 'Medium'}
                    </span>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: 13, color: '#71717A', margin: '8px 0 16px 0', lineHeight: 1.5, flexGrow: 1 }}>
                    {report.description ? (
                      report.description.length > 90 ? `${report.description.slice(0, 90)}...` : report.description
                    ) : (
                      <span style={{ fontStyle: 'italic', opacity: 0.6 }}>No description provided.</span>
                    )}
                  </p>

                  {/* Divider */}
                  <div style={{ height: 1, background: 'rgba(0,0,0,0.04)', margin: '0 -20px 12px -20px' }} />

                  {/* Bottom Row: Status, Fields Count, Actions */}
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                      <span className={`vision-pill ${isPublished ? 'vision-status-published' : 'vision-status-draft'}`} style={{ padding: '2px 8px', fontSize: 11 }}>
                        {report.status}
                      </span>
                      <div className="d-flex align-items-center gap-1" style={{ color: '#A1A1AA', fontSize: 12, fontWeight: 500 }}>
                        <i className="bi bi-view-list" />
                        <span>{report.fields?.length ?? 0} Fields</span>
                      </div>
                    </div>

                    <div className="d-flex gap-1">
                      <button
                        className="btn-action-icon"
                        onClick={() => navigate(`/reports/${report.id}/edit`)}
                        title="Edit Template"
                      >
                        <i className="bi bi-pencil" style={{ fontSize: 14 }} />
                      </button>
                      <button
                        className="btn-action-icon danger"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the template "${report.title}"?`)) {
                            deleteMutation.mutate(report.id);
                          }
                        }}
                        title="Delete Template"
                      >
                        <i className="bi bi-trash3" style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}