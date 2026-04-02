import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, entriesApi } from '../../services/api';
import type { Report, ReportField } from '../../types';

export default function EntryFormPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const { data: reportsRes, isLoading } = useQuery({
    queryKey: ['reports-published'],
    queryFn: reportsApi.getAll,
  });

  const publishedReports = (reportsRes?.data ?? []).filter((r: Report) => r.status === 'published');

  const mutation = useMutation({
    mutationFn: entriesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      navigate('/entries');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    mutation.mutate({ report_id: selectedReport.id, data: formData });
  };

  const renderField = (field: ReportField) => {
    // Convert 1/2 and 1/3 widths into flex-basis
    const flexBasis = field.width === 'half' ? 'calc(50% - 10px)' : field.width === 'third' ? 'calc(33.333% - 13px)' : '100%';
    const value = (formData[field.id] ?? '') as string;

    if (field.type === 'section_header') {
      return (
        <div key={field.id} style={{ flexBasis: '100%', marginTop: 16 }}>
          <h4 style={{ 
            margin: 0, 
            fontSize: 16, 
            fontWeight: 700, 
            color: '#09090B', 
            borderBottom: '1px solid rgba(0,0,0,0.06)', 
            paddingBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {field.label || 'Section'}
          </h4>
        </div>
      );
    }
    
    if (field.type === 'instructions') {
      return (
        <div key={field.id} style={{ flexBasis: '100%' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', padding: 16, borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', marginBottom: 4 }}>
              <i className="bi bi-info-circle me-1" /> Instructions
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#1E3A8A' }}>{field.label}</p>
          </div>
        </div>
      );
    }

    return (
      <div key={field.id} style={{ flexBasis, minWidth: 250, flexGrow: field.width === 'full' ? 1 : 0 }}>
        <label className="vision-label">
          {field.label}
          {field.required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
        </label>

        {field.type === 'textarea' ? (
          <textarea
            className="vision-textarea"
            rows={3}
            required={field.required}
            value={value}
            onChange={e => setFormData(d => ({ ...d, [field.id]: e.target.value }))}
            placeholder={field.placeholder || ''}
          />
        ) : field.type === 'select' ? (
          <div className="vision-select-wrapper">
            <select
              className="vision-select"
              required={field.required}
              value={value}
              onChange={e => setFormData(d => ({ ...d, [field.id]: e.target.value }))}
            >
              <option value="">— Select Option —</option>
              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        ) : field.type === 'rating' ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 44 }}>
            {[1, 2, 3, 4, 5].map(star => {
              const isActive = Number(value) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData(d => ({ ...d, [field.id]: star }))}
                  style={{
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 28, lineHeight: 1, color: isActive ? '#F59E0B' : '#E4E4E7',
                    transition: 'color 0.2s ease, transform 0.1s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <i className={`bi bi-star${isActive ? '-fill' : ''}`} />
                </button>
              );
            })}
          </div>
        ) : field.type === 'file' ? (
           <div className="vision-file-drop">
             <i className="bi bi-cloud-arrow-up" style={{ fontSize: 24, marginBottom: 8, color: '#A1A1AA' }} />
             <p style={{ fontSize: 13, margin: 0, fontWeight: 500, color: '#3F3F46' }}>Click to upload file</p>
             <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4 }}>PDF, DOCX, JPG (Max 5MB)</p>
             {/* Note: Actual file handling requires multipart/form-data logic omitted in base prompt, treating as text for now per base prompt logic */}
             <input 
                type="text" 
                style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', top:0, left:0 }} 
                onChange={e => setFormData(d => ({ ...d, [field.id]: e.target.value }))}
             />
           </div>
        ) : (
          <input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            className="vision-input"
            required={field.required}
            value={value}
            onChange={e => setFormData(d => ({ ...d, [field.id]: e.target.value }))}
            placeholder={field.placeholder || ''}
          />
        )}
      </div>
    );
  };

  return (
    <div className="vision-page-wrapper">
      <style>{`
        .vision-page-wrapper {
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

        /* Template Selection Grid */
        .vision-template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .vision-template-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .vision-template-card:hover {
          background: #FFFFFF;
          border-color: rgba(249, 115, 22, 0.3);
          box-shadow: 0 12px 24px rgba(249, 115, 22, 0.08), 0 4px 8px rgba(0,0,0,0.02);
          transform: translateY(-2px);
        }

        .vision-template-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.05) 100%);
          color: #F97316;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          border: 1px solid rgba(249, 115, 22, 0.1);
        }

        /* Form Rendering Styles */
        .vision-form-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(32px) saturate(150%);
          -webkit-backdrop-filter: blur(32px) saturate(150%);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 20px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0,0,0,0.01);
          padding: 32px;
        }

        .vision-dynamic-row {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .vision-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #3F3F46;
          margin-bottom: 8px;
          letter-spacing: 0.2px;
        }

        .vision-input, .vision-select, .vision-textarea {
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

        .vision-input:focus, .vision-select:focus, .vision-textarea:focus {
          background: #FFFFFF;
          border-color: rgba(249, 115, 22, 0.4);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1), 0 2px 8px rgba(0,0,0,0.02);
        }

        .vision-select {
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
        }
        .vision-select-wrapper {
          position: relative;
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

        .vision-file-drop {
          width: 100%;
          background: rgba(0, 0, 0, 0.015);
          border: 1px dashed rgba(0, 0, 0, 0.15);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          transition: all 0.2s;
          position: relative;
        }
        .vision-file-drop:hover {
          background: rgba(249, 115, 22, 0.02);
          border-color: rgba(249, 115, 22, 0.3);
        }

        /* Buttons & Actions */
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
          margin-top: 24px;
        }

        .vision-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #FFF;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div className="vision-header">
        <button 
          type="button"
          className="vision-back-btn" 
          onClick={() => selectedReport ? setSelectedReport(null) : navigate('/entries')}
          title="Go Back"
        >
          <i className="bi bi-arrow-left" style={{ fontSize: 16 }} />
        </button>
        <div>
          <h4 className="vision-title">
            {selectedReport ? `Submitting: ${selectedReport.title}` : 'Submit New Report'}
          </h4>
          {selectedReport && (
            <span style={{ fontSize: 13, color: '#71717A', display: 'block', marginTop: 4 }}>
              Fill out all required fields below to file this report.
            </span>
          )}
        </div>
      </div>

      {/* View 1: Template Selection */}
      {!selectedReport ? (
        <div>
          {isLoading ? (
            <div className="d-flex flex-column justify-content-center align-items-center py-5" style={{ minHeight: 300 }}>
              <div className="spinner-border spinner-border-sm mb-3" style={{ color: '#F97316', width: '2rem', height: '2rem' }} />
              <span style={{ color: '#71717A', fontSize: 14, fontWeight: 500 }}>Loading available templates...</span>
            </div>
          ) : publishedReports.length === 0 ? (
            <div className="text-center py-5 mt-4">
              <div style={{ width: 64, height: 64, background: 'rgba(0,0,0,0.02)', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <i className="bi bi-inbox" style={{ fontSize: 28, color: '#A1A1AA' }} />
              </div>
              <h6 style={{ color: '#09090B', fontWeight: 600, fontSize: 16, margin: 0 }}>No Reports Available</h6>
              <p style={{ color: '#71717A', fontSize: 14, marginTop: 4 }}>There are currently no published templates assigned to your role.</p>
            </div>
          ) : (
            <div className="vision-template-grid">
              {publishedReports.map((report: Report) => (
                <div 
                  key={report.id} 
                  className="vision-template-card"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="vision-template-icon">
                    <i className="bi bi-file-earmark-text" />
                  </div>
                  <div>
                    <h6 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 600, color: '#09090B', lineHeight: 1.2 }}>
                      {report.title}
                    </h6>
                    {report.description && (
                      <p style={{ margin: 0, fontSize: 13, color: '#71717A', lineHeight: 1.4 }}>
                        {report.description.slice(0, 80)}{report.description.length > 80 ? '...' : ''}
                      </p>
                    )}
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      <span style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', color: '#52525B', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>
                        {report.fields?.length ?? 0} Fields
                      </span>
                      {report.category && (
                        <span style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', color: '#52525B', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                          {report.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* View 2: Form Rendering */
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <form onSubmit={handleSubmit}>
            <div className="vision-form-card">
              
              <div className="vision-dynamic-row">
                {(selectedReport.fields ?? [])
                  .sort((a: ReportField, b: ReportField) => a.order - b.order)
                  .map(renderField)}
              </div>

              {mutation.isError && (
                <div className="vision-alert-danger">
                  <i className="bi bi-x-circle-fill" />
                  <span>Failed to submit the report. Please check your connection and try again.</span>
                </div>
              )}

              <div className="vision-actions">
                <button type="submit" className="vision-btn-primary" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <><div className="vision-spinner" /> Submitting...</>
                  ) : (
                    <><i className="bi bi-send" /> Submit Report</>
                  )}
                </button>
                <button 
                  type="button" 
                  className="vision-btn-secondary" 
                  onClick={() => setSelectedReport(null)}
                  disabled={mutation.isPending}
                >
                  Cancel
                </button>
              </div>

            </div>
          </form>
        </div>
      )}
    </div>
  );
}