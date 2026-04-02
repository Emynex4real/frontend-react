import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, rolesApi, branchesApi } from '../../services/api';
import type { ReportForm, ReportField } from '../../types';
import type { Role } from '../../types';
import type { Branch } from '../../types';

// ── Palette definition ────────────────────────────────
const PALETTE = [
  { group: 'Basic Fields', items: [
    { type: 'text'     as const, label: 'Short Text',     icon: 'bi-type' },
    { type: 'number'   as const, label: 'Number',         icon: 'bi-123' },
    { type: 'textarea' as const, label: 'Long Text',      icon: 'bi-chat-square-text' },
    { type: 'select'   as const, label: 'Dropdown',       icon: 'bi-list-check' },
    { type: 'date'     as const, label: 'Date Picker',    icon: 'bi-calendar-event' },
  ]},
  { group: 'Advanced & Layout', items: [
    { type: 'file'           as const, label: 'File Upload',    icon: 'bi-cloud-arrow-up' },
    { type: 'rating'         as const, label: 'Star Rating',    icon: 'bi-star' },
    { type: 'section_header' as const, label: 'Section Header', icon: 'bi-layout-text-window' },
    { type: 'instructions'   as const, label: 'Instructions',   icon: 'bi-info-circle' },
  ]},
];

const FIELD_ICONS: Record<string, string> = {
  text: 'bi-type', number: 'bi-123', textarea: 'bi-chat-square-text', select: 'bi-list-check',
  date: 'bi-calendar-event', file: 'bi-cloud-arrow-up', rating: 'bi-star',
  section_header: 'bi-layout-text-window', instructions: 'bi-info-circle',
};
const FIELD_LABELS: Record<string, string> = {
  text: 'Text', number: 'Number', textarea: 'Textarea', select: 'Dropdown',
  date: 'Date', file: 'File', rating: 'Rating', section_header: 'Section Header', instructions: 'Instructions',
};

let _fc = 0;
function mkField(type: ReportField['type']): ReportField {
  return {
    id: `f_${++_fc}_${Date.now()}`,
    type,
    label: FIELD_LABELS[type] ?? type,
    required: false,
    options: type === 'select' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
    width: 'full',
    order: _fc,
  };
}

// ── Toast ─────────────────────────────────────────────
interface Toast { id: number; msg: string; kind: 'success' | 'error' | 'info' }
let _tid = 0;

// ── Field edit modal state ────────────────────────────
interface FieldEdit {
  id: string;
  type: ReportField['type'];
  label: string;
  required: boolean;
  placeholder: string;
  optionsText: string;
  width: ReportField['width'];
}
function toEdit(f: ReportField): FieldEdit {
  return {
    id: f.id, type: f.type, label: f.label, required: f.required,
    placeholder: f.placeholder ?? '', optionsText: (f.options ?? []).join('\n'), width: f.width,
  };
}

// ── Staff preview field renderer ──────────────────────
function StaffInput({ f }: { f: ReportField }) {
  const ph = f.placeholder ?? '';
  const baseClass = "vision-input preview-only";
  
  switch (f.type) {
    case 'select':
      return <select className={baseClass} disabled><option>Select an option...</option>{(f.options ?? []).map(o => <option key={o}>{o}</option>)}</select>;
    case 'textarea':
      return <textarea className={`${baseClass} vision-textarea`} placeholder={ph} rows={3} disabled />;
    case 'file':
      return <div className="vision-file-drop preview-only"><i className="bi bi-cloud-arrow-up" style={{ fontSize: 24, marginBottom: 8 }} /><p style={{ fontSize: 13, margin: 0, fontWeight: 500 }}>Click to upload or drag & drop</p></div>;
    case 'rating': {
      const max = 5;
      return <div className="d-flex gap-1" style={{ color: '#D4D4D8', fontSize: 24 }}>{Array.from({ length: max }, (_, i) => <i key={i} className={`bi bi-star${i < 3 ? '-fill' : ''}`} style={i < 3 ? { color: '#F59E0B' } : {}} />)}</div>;
    }
    case 'date':
      return <input className={baseClass} type="date" disabled />;
    case 'number':
      return <input className={baseClass} type="number" placeholder={ph} disabled />;
    default:
      return <input className={baseClass} type="text" placeholder={ph} disabled />;
  }
}

export default function ReportFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [fields, setFields] = useState<ReportField[]>([]);
  const [fieldEdit, setFieldEdit] = useState<FieldEdit | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Drag state refs
  const dragPaletteType = useRef<string | null>(null);
  const dragFieldIdx = useRef<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const toast = (msg: string, kind: Toast['kind'] = 'success') => {
    const t: Toast = { id: ++_tid, msg, kind };
    setToasts(p => [...p, t]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 3500);
  };

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ReportForm>({
    defaultValues: { priority: 'medium', status: 'draft', target_roles: [], target_branches: [] },
  });
  const status = watch('status');
  const formTitle = watch('title' as keyof ReportForm) as string | undefined;
  const formDesc = watch('description' as keyof ReportForm) as string | undefined;

  const { data: reportRes } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.getOne(Number(id)),
    enabled: isEdit,
  });
  const { data: rolesRes }    = useQuery({ queryKey: ['roles'],    queryFn: rolesApi.getAll });
  const { data: branchesRes } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.getAll });

  useEffect(() => {
    if (reportRes?.data) {
      const r = reportRes.data;
      reset(r as unknown as ReportForm);
      setFields(r.fields ?? []);
    }
  }, [reportRes, reset]);

  const mutation = useMutation({
    mutationFn: (data: ReportForm) => {
      const payload = { ...data, fields, target_roles: (data.target_roles ?? []).map(Number), target_branches: (data.target_branches ?? []).map(Number) };
      return isEdit ? reportsApi.update(Number(id), payload) : reportsApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); navigate('/reports'); },
    onError: () => toast('Failed to save template', 'error'),
  });

  // ── Field actions ─────────────────────────────────────
  const addField = (type: ReportField['type']) => {
    const f = mkField(type);
    setFields(p => [...p, f]);
    toast(`${FIELD_LABELS[type]} added to canvas`);
    if (type === 'select') setFieldEdit(toEdit(f));
  };

  const removeField = (fid: string) => {
    setFields(p => p.filter(f => f.id !== fid));
    toast('Field removed', 'info');
  };

  const toggleRequired = (fid: string) => {
    setFields(p => p.map(f => f.id === fid ? { ...f, required: !f.required } : f));
  };

  const saveFieldEdit = () => {
    if (!fieldEdit) return;
    if (!fieldEdit.label.trim()) { toast('Label is required', 'error'); return; }
    const opts = fieldEdit.optionsText.split('\n').map(o => o.trim()).filter(Boolean);
    if (fieldEdit.type === 'select' && opts.length < 2) { toast('Add at least 2 options', 'error'); return; }
    setFields(p => p.map(f => f.id === fieldEdit.id ? {
      ...f, type: fieldEdit.type, label: fieldEdit.label, required: fieldEdit.required,
      placeholder: fieldEdit.placeholder || undefined,
      options: opts.length ? opts : undefined,
      width: fieldEdit.width,
    } : f));
    setFieldEdit(null);
    toast('Field configuration saved');
  };

  // ── Drag & drop ───────────────────────────────────────
  const onPaletteDragStart = (type: string) => {
    dragPaletteType.current = type;
    dragFieldIdx.current = null;
  };

  const onFieldDragStart = (e: React.DragEvent, idx: number) => {
    dragFieldIdx.current = idx;
    dragPaletteType.current = null;
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onFieldDragEnd = () => {
    setDraggingIdx(null);
    setDragOverIdx(null);
    dragFieldIdx.current = null;
  };

  const onZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onZoneDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragActive(false);
      setDragOverIdx(null);
    }
  };

  const onZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    setDragOverIdx(null);
    if (dragPaletteType.current) {
      addField(dragPaletteType.current as ReportField['type']);
      dragPaletteType.current = null;
    }
  };

  const onFieldDragOver = (e: React.DragEvent, idx: number) => {
    if (dragFieldIdx.current === null || dragFieldIdx.current === idx) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverIdx(idx);
  };

  const onFieldDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const srcIdx = dragFieldIdx.current;
    setDragOverIdx(null);
    if (srcIdx === null || srcIdx === targetIdx) return;
    setFields(p => {
      const next = [...p];
      const [moved] = next.splice(srcIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    dragFieldIdx.current = null;
    setDraggingIdx(null);
  };

  // ── Submit ────────────────────────────────────────────
  const onSubmit = (data: ReportForm) => {
    if (!fields.length) { toast('Please add at least one field to the form.', 'error'); return; }
    mutation.mutate(data);
  };

  const dataFieldCount = fields.filter(f => f.type !== 'section_header' && f.type !== 'instructions').length;

  return (
    <div className="vision-builder-wrapper">
      <style>{`
        .vision-builder-wrapper {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
          padding: 8px;
          height: calc(100vh - 72px); /* Assuming 72px header */
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .vision-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-shrink: 0;
        }
        
        .vision-back-btn {
          background: transparent;
          border: none;
          color: #F97316;
          font-weight: 600;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 0;
          margin-bottom: 4px;
          transition: opacity 0.2s;
        }
        .vision-back-btn:hover { opacity: 0.8; }

        .vision-title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.6px;
          color: #09090B;
          margin: 0;
          line-height: 1.2;
        }

        /* Buttons */
        .btn-vision-brand {
          background: #09090B;
          color: #FFFFFF;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .btn-vision-brand:hover:not(:disabled) {
          background: #27272A;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .btn-vision-brand:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-vision-secondary {
          background: #FFFFFF;
          color: #3F3F46;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }
        .btn-vision-secondary:hover {
          background: #F4F4F5;
          color: #09090B;
        }

        /* 3-Column Layout */
        .vision-builder-grid {
          display: grid;
          grid-template-columns: 280px 1fr 340px;
          gap: 20px;
          flex-grow: 1;
          min-height: 0; /* Important for scrollable columns */
        }

        .vision-panel {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .vision-panel-header {
          background: rgba(0,0,0,0.015);
          padding: 12px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          font-size: 13px;
          font-weight: 700;
          color: #09090B;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .vision-panel-body {
          padding: 16px;
          overflow-y: auto;
          flex-grow: 1;
        }

        /* Palette Styles */
        .palette-group-label {
          font-size: 11px;
          font-weight: 700;
          color: #A1A1AA;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 16px 0 8px 4px;
        }
        .palette-group-label:first-child { margin-top: 0; }

        .palette-chip {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FFFFFF;
          border: 1px solid rgba(0,0,0,0.06);
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          color: #3F3F46;
          cursor: grab;
          margin-bottom: 8px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.01);
        }
        .palette-chip:hover {
          border-color: rgba(249, 115, 22, 0.3);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.08);
          color: #09090B;
          transform: translateY(-1px);
        }
        .palette-chip:active { cursor: grabbing; }
        .palette-chip i { color: #F97316; font-size: 16px; }
        
        .chip-add-btn {
          margin-left: auto;
          opacity: 0;
          font-size: 11px;
          font-weight: 600;
          color: #F97316;
          background: rgba(249, 115, 22, 0.1);
          padding: 2px 8px;
          border-radius: 100px;
          transition: opacity 0.2s;
        }
        .palette-chip:hover .chip-add-btn { opacity: 1; }

        /* Canvas Styles */
        .canvas-zone {
          min-height: 100%;
          border-radius: 12px;
          transition: all 0.2s;
          padding-bottom: 40px;
        }
        .canvas-zone.drag-active {
          background: rgba(249, 115, 22, 0.02);
          border: 2px dashed rgba(249, 115, 22, 0.4);
        }

        .canvas-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 300px;
          color: #A1A1AA;
          text-align: center;
          border: 2px dashed rgba(0,0,0,0.06);
          border-radius: 16px;
          background: rgba(0,0,0,0.01);
        }

        /* Canvas Field Items */
        .cf-item {
          background: #FFFFFF;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: all 0.2s ease;
          position: relative;
        }
        .cf-item:hover {
          border-color: rgba(0,0,0,0.15);
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }
        .cf-item.cf-dragging { opacity: 0.4; }
        .cf-item.cf-drag-over {
          border-top: 3px solid #F97316;
          margin-top: 16px;
        }

        .cf-handle {
          color: #D4D4D8;
          cursor: grab;
          font-size: 18px;
          transition: color 0.2s;
        }
        .cf-handle:hover { color: #A1A1AA; }
        .cf-handle:active { cursor: grabbing; }

        .cf-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(249, 115, 22, 0.1);
          color: #F97316;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .cf-content { flex-grow: 1; min-width: 0; }
        .cf-label {
          font-size: 14px;
          font-weight: 600;
          color: #09090B;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cf-meta {
          display: flex;
          gap: 8px;
          font-size: 11px;
          font-weight: 500;
          color: #71717A;
          margin-top: 4px;
        }
        .cf-meta span {
          background: rgba(0,0,0,0.04);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .cf-meta .cf-req { background: rgba(239, 68, 68, 0.1); color: #DC2626; }

        .cf-actions { display: flex; gap: 4px; }
        .cf-action-btn {
          background: transparent;
          border: none;
          color: #A1A1AA;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .cf-action-btn:hover { background: rgba(0,0,0,0.04); color: #09090B; }
        .cf-action-btn.del:hover { background: rgba(239, 68, 68, 0.1); color: #DC2626; }
        .cf-action-btn.req-active { color: #F97316; }

        /* Section Item Variant */
        .cf-item.section {
          background: #FAFAFA;
          border: 1px solid rgba(0,0,0,0.04);
          padding: 10px 16px;
        }

        /* Settings Inputs */
        .vision-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #3F3F46;
          margin-bottom: 6px;
        }
        .vision-input, .vision-select, .vision-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: #09090B;
          transition: all 0.2s;
          outline: none;
        }
        .vision-input:focus, .vision-select:focus, .vision-textarea:focus {
          background: #FFFFFF;
          border-color: rgba(249, 115, 22, 0.4);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
        }
        .vision-input.preview-only {
          background: #FFFFFF;
          cursor: not-allowed;
          opacity: 0.8;
        }
        
        /* Custom Checkbox Pill */
        .vision-check-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #FFFFFF;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #3F3F46;
          cursor: pointer;
          margin-bottom: 6px;
          transition: all 0.2s;
        }
        .vision-check-pill:hover { background: rgba(0,0,0,0.02); }
        .vision-check-pill input[type="checkbox"] {
          accent-color: #F97316;
          width: 16px;
          height: 16px;
          margin: 0;
          cursor: pointer;
        }

        /* Custom Toggle Switch */
        .vision-toggle-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          border: 1px solid rgba(0,0,0,0.06);
          padding: 12px 16px;
          border-radius: 12px;
          margin-top: 16px;
        }
        .vision-toggle {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .vision-toggle input { opacity: 0; width: 0; height: 0; }
        .vision-slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #D4D4D8;
          transition: .3s;
          border-radius: 24px;
        }
        .vision-slider:before {
          position: absolute;
          content: "";
          height: 18px; width: 18px;
          left: 3px; bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .vision-toggle input:checked + .vision-slider { background-color: #10B981; }
        .vision-toggle input:checked + .vision-slider:before { transform: translateX(20px); }

        /* Modals */
        .vision-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 1050;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vision-modal {
          background: #FFFFFF;
          border-radius: 20px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.04);
          width: 100%;
          max-width: 500px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }
        .vision-modal.modal-lg { max-width: 700px; }
        
        .vision-modal-header {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .vision-modal-body {
          padding: 24px;
          overflow-y: auto;
        }
        .vision-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid rgba(0,0,0,0.06);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #FAFAFA;
        }

        /* Toasts */
        .vision-toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1100;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .vision-toast {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          border-radius: 12px;
          padding: 12px 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          font-weight: 500;
          color: #09090B;
          border-left: 4px solid #10B981;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .vision-toast.error { border-left-color: #EF4444; }
        .vision-toast.info { border-left-color: #3B82F6; }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="vision-header">
        <div>
          <button className="vision-back-btn" onClick={() => navigate('/reports')}>
            <i className="bi bi-arrow-left" /> Back to Templates
          </button>
          <h1 className="vision-title">{isEdit ? 'Edit Template Builder' : 'Report Template Builder'}</h1>
          <p style={{ fontSize: 13, color: '#71717A', margin: '4px 0 0 0' }}>
            Drag and drop fields to design your perfect report form.
          </p>
        </div>
        <div className="d-flex gap-3">
          <button type="button" className="btn-vision-secondary" onClick={() => setPreviewOpen(true)}>
            <i className="bi bi-eye" /> Preview Form
          </button>
          <button type="button" className="btn-vision-brand" disabled={mutation.isPending} onClick={handleSubmit(onSubmit)}>
            {mutation.isPending ? (
              <><span className="vision-spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> Saving...</>
            ) : (
              <><i className="bi bi-check2" /> Save Template</>
            )}
          </button>
        </div>
      </div>

      {/* 3-Column Builder Layout */}
      <div className="vision-builder-grid">
        
        {/* LEFT: Palette */}
        <div className="vision-panel">
          <div className="vision-panel-header">
            <span><i className="bi bi-grid me-2" style={{ color: '#F97316' }} /> Tool Palette</span>
          </div>
          <div className="vision-panel-body">
            {PALETTE.map(({ group, items }) => (
              <div key={group} style={{ marginBottom: 24 }}>
                <div className="palette-group-label">{group}</div>
                {items.map(it => (
                  <div
                    key={it.type}
                    className="palette-chip"
                    draggable
                    onDragStart={() => onPaletteDragStart(it.type)}
                    onDragEnd={() => { dragPaletteType.current = null; }}
                    onClick={() => addField(it.type)}
                  >
                    <i className={it.icon} />
                    <span>{it.label}</span>
                    <span className="chip-add-btn">+ Add</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div className="vision-panel">
          <div className="vision-panel-header">
            <span><i className="bi bi-kanban me-2" style={{ color: '#F97316' }} /> Form Canvas</span>
            <span style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: 100, fontSize: 11 }}>
              {dataFieldCount} Input{dataFieldCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="vision-panel-body" style={{ background: '#FAFAFA' }}>
            <div
              className={`canvas-zone ${dragActive ? 'drag-active' : ''}`}
              onDragOver={onZoneDragOver}
              onDragLeave={onZoneDragLeave}
              onDrop={onZoneDrop}
            >
              {fields.length === 0 && (
                <div className="canvas-empty-state">
                  <i className="bi bi-magic" style={{ fontSize: 32, marginBottom: 12, color: '#D4D4D8' }} />
                  <span style={{ fontWeight: 600, color: '#3F3F46' }}>It's empty here!</span>
                  <span style={{ fontSize: 13, marginTop: 4 }}>Drag fields from the left to start building.</span>
                </div>
              )}

              {fields.map((f, idx) => {
                const isSection = f.type === 'section_header' || f.type === 'instructions';
                const dragClasses = `${draggingIdx === idx ? 'cf-dragging' : ''} ${dragOverIdx === idx ? 'cf-drag-over' : ''}`;

                return (
                  <div
                    key={f.id}
                    className={`cf-item ${isSection ? 'section' : ''} ${dragClasses}`}
                    draggable
                    onDragStart={e => onFieldDragStart(e, idx)}
                    onDragEnd={onFieldDragEnd}
                    onDragOver={e => onFieldDragOver(e, idx)}
                    onDrop={e => onFieldDrop(e, idx)}
                  >
                    <i className="bi bi-grip-vertical cf-handle" />
                    
                    {!isSection && (
                      <div className="cf-icon-box">
                        <i className={FIELD_ICONS[f.type] ?? 'bi-input-cursor'} />
                      </div>
                    )}

                    <div className="cf-content">
                      <div className="cf-label" style={isSection ? { fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#71717A' } : {}}>
                        {isSection && <i className={`${FIELD_ICONS[f.type]} me-2`} />}
                        {f.label}
                      </div>
                      {!isSection && (
                        <div className="cf-meta">
                          <span>{FIELD_LABELS[f.type] ?? f.type}</span>
                          {f.required && <span className="cf-req">Required</span>}
                          {f.width !== 'full' && <span>{f.width === 'half' ? '1/2 Width' : '1/3 Width'}</span>}
                        </div>
                      )}
                    </div>

                    <div className="cf-actions">
                      {!isSection && (
                        <button type="button" className={`cf-action-btn ${f.required ? 'req-active' : ''}`} onClick={() => toggleRequired(f.id)} title={f.required ? 'Make Optional' : 'Make Required'}>
                          <i className={`bi ${f.required ? 'bi-asterisk' : 'bi-circle'}`} style={{ fontSize: 12 }} />
                        </button>
                      )}
                      <button type="button" className="cf-action-btn" onClick={() => setFieldEdit(toEdit(f))} title="Configure">
                        <i className="bi bi-gear" />
                      </button>
                      <button type="button" className="cf-action-btn del" onClick={() => removeField(f.id)} title="Remove">
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Settings */}
        <div className="vision-panel">
          <div className="vision-panel-header">
            <span><i className="bi bi-sliders me-2" style={{ color: '#F97316' }} /> Settings</span>
          </div>
          <div className="vision-panel-body" style={{ padding: '20px 16px' }}>
            
            {/* General Info */}
            <div style={{ marginBottom: 24 }}>
              <label className="vision-label">Template Title <span style={{ color: '#EF4444' }}>*</span></label>
              <input 
                className={`vision-input ${errors.title ? 'is-invalid' : ''}`} 
                placeholder="e.g. Weekly Status Update" 
                {...register('title', { required: true })} 
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="vision-label">Description (Optional)</label>
              <textarea 
                className="vision-textarea" 
                rows={2} 
                placeholder="What is the purpose of this form?" 
                {...register('description')} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
              <div>
                <label className="vision-label">Category</label>
                <select className="vision-select" {...register('category')}>
                  <option value="">Select...</option>
                  <option value="Attendance">Attendance</option>
                  <option value="Performance">Performance</option>
                  <option value="Sales">Sales</option>
                  <option value="Incident">Incident</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="vision-label">Priority</label>
                <select className="vision-select" {...register('priority')}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Target Audience */}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 24, marginBottom: 32 }}>
              <h6 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Distribution Targets</h6>
              
              <label className="vision-label" style={{ marginTop: 16 }}>Required Roles</label>
              <div style={{ maxHeight: 150, overflowY: 'auto', paddingRight: 4, marginBottom: 16 }}>
                {(rolesRes?.data ?? []).map((role: Role) => (
                  <label key={role.id} className="vision-check-pill">
                    <input type="checkbox" value={role.id} {...register('target_roles')} />
                    <i className="bi bi-shield-check" style={{ color: '#A1A1AA' }} />
                    {role.name}
                  </label>
                ))}
              </div>

              <label className="vision-label">Target Branches</label>
              <div style={{ maxHeight: 150, overflowY: 'auto', paddingRight: 4 }}>
                {(branchesRes?.data ?? []).map((branch: Branch) => (
                  <label key={branch.id} className="vision-check-pill">
                    <input type="checkbox" value={branch.id} {...register('target_branches')} />
                    <i className="bi bi-building" style={{ color: '#A1A1AA' }} />
                    {branch.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Status Toggle */}
            <div className="vision-toggle-wrapper">
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: status === 'published' ? '#10B981' : '#71717A' }}>
                  {status === 'published' ? 'Live (Published)' : 'Draft Mode'}
                </div>
                <div style={{ fontSize: 11, color: '#A1A1AA' }}>Make available to staff</div>
              </div>
              <label className="vision-toggle">
                <input 
                  type="checkbox" 
                  checked={status === 'published'}
                  onChange={e => reset({ ...watch(), status: e.target.checked ? 'published' : 'draft' })} 
                />
                <span className="vision-slider" />
              </label>
            </div>

          </div>
        </div>
      </div>

      {/* ── Field Edit Modal ──────────────────────────── */}
      {fieldEdit && (
        <div className="vision-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setFieldEdit(null); }}>
          <div className="vision-modal" onClick={e => e.stopPropagation()}>
            <div className="vision-modal-header">
              <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}><i className="bi bi-sliders me-2" style={{ color: '#F97316' }}/> Configure Field</h5>
              <button type="button" className="btn-close" onClick={() => setFieldEdit(null)} style={{ fontSize: 12 }} />
            </div>
            
            <div className="vision-modal-body">
              <div style={{ marginBottom: 20 }}>
                <label className="vision-label">Field Label <span style={{ color: '#EF4444' }}>*</span></label>
                <input className="vision-input" value={fieldEdit.label} onChange={e => setFieldEdit(p => p && { ...p, label: e.target.value })} placeholder="e.g. Employee Name" />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label className="vision-label">Field Type</label>
                  <select className="vision-select" value={fieldEdit.type} onChange={e => setFieldEdit(p => p && { ...p, type: e.target.value as ReportField['type'] })}>
                    {PALETTE.map(g => (
                      <optgroup key={g.group} label={g.group}>
                        {g.items.map(it => <option key={it.type} value={it.type}>{it.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="vision-label">Column Width</label>
                  <select className="vision-select" value={fieldEdit.width} onChange={e => setFieldEdit(p => p && { ...p, width: e.target.value as ReportField['width'] })}>
                    <option value="full">100% (Full Row)</option>
                    <option value="half">50% (Half Row)</option>
                    <option value="third">33% (One Third)</option>
                  </select>
                </div>
              </div>

              {fieldEdit.type === 'select' && (
                <div style={{ marginBottom: 20 }}>
                  <label className="vision-label">Dropdown Options <span style={{ color: '#EF4444' }}>*</span> <span style={{ color: '#A1A1AA', fontWeight: 400 }}>(One per line)</span></label>
                  <textarea className="vision-textarea" rows={4} value={fieldEdit.optionsText} onChange={e => setFieldEdit(p => p && { ...p, optionsText: e.target.value })} placeholder={'Option A\nOption B\nOption C'} />
                </div>
              )}
              
              {fieldEdit.type !== 'section_header' && fieldEdit.type !== 'instructions' && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <label className="vision-check-pill" style={{ width: 'fit-content', background: fieldEdit.required ? 'rgba(249, 115, 22, 0.05)' : '#FFF', borderColor: fieldEdit.required ? 'rgba(249, 115, 22, 0.3)' : 'rgba(0,0,0,0.06)' }}>
                      <input type="checkbox" checked={fieldEdit.required} onChange={e => setFieldEdit(p => p && { ...p, required: e.target.checked })} />
                      Make this a required field
                    </label>
                  </div>
                  <div>
                    <label className="vision-label">Placeholder Text <span style={{ color: '#A1A1AA', fontWeight: 400 }}>(Optional)</span></label>
                    <input className="vision-input" value={fieldEdit.placeholder} onChange={e => setFieldEdit(p => p && { ...p, placeholder: e.target.value })} placeholder="Hint text shown inside the input..." />
                  </div>
                </>
              )}
            </div>

            <div className="vision-modal-footer">
              <button type="button" className="btn-vision-secondary" onClick={() => setFieldEdit(null)}>Cancel</button>
              <button type="button" className="btn-vision-brand" onClick={saveFieldEdit}>Save Configuration</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Staff Preview Modal ───────────────────────── */}
      {previewOpen && (
        <div className="vision-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setPreviewOpen(false); }}>
          <div className="vision-modal modal-lg" onClick={e => e.stopPropagation()} style={{ background: '#F4F4F5' }}>
            <div className="vision-modal-header" style={{ background: '#FFF' }}>
              <div>
                <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}><i className="bi bi-display me-2" style={{ color: '#F97316' }}/> Staff View Preview</h5>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#71717A' }}>This is exactly how staff will see this form.</p>
              </div>
              <button type="button" className="btn-close" onClick={() => setPreviewOpen(false)} style={{ fontSize: 12 }} />
            </div>
            
            <div className="vision-modal-body" style={{ padding: 32 }}>
              <div style={{ background: '#FFF', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.01)', border: '1px solid rgba(0,0,0,0.04)' }}>
                
                <div style={{ borderLeft: '4px solid #F97316', paddingLeft: 16, marginBottom: 32 }}>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#09090B' }}>{formTitle || 'Untitled Report Form'}</h2>
                  {formDesc && <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#52525B' }}>{formDesc}</p>}
                </div>

                {fields.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#A1A1AA' }}>
                    <i className="bi bi-inbox" style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                    <span style={{ fontSize: 14 }}>Form is empty.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-8px' }}>
                    {fields.map(f => {
                      if (f.type === 'section_header') {
                        return (
                          <div key={f.id} style={{ width: '100%', padding: '24px 8px 8px 8px' }}>
                            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#09090B', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 8 }}>
                              {f.label}
                            </h4>
                          </div>
                        );
                      }
                      if (f.type === 'instructions') {
                        return (
                          <div key={f.id} style={{ width: '100%', padding: 8 }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', padding: 16, borderRadius: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', marginBottom: 4 }}><i className="bi bi-info-circle me-1" /> Instructions</div>
                              <p style={{ margin: 0, fontSize: 13, color: '#1E3A8A' }}>{f.label}</p>
                            </div>
                          </div>
                        );
                      }
                      
                      const flexBasis = f.width === 'half' ? '50%' : f.width === 'third' ? '33.333%' : '100%';
                      return (
                        <div key={f.id} style={{ flexBasis, padding: 8, maxWidth: flexBasis, flexGrow: 1 }}>
                          <label className="vision-label" style={{ fontSize: 13 }}>
                            {f.label}{f.required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
                          </label>
                          <StaffInput f={f} />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button type="button" className="btn-vision-secondary" style={{ opacity: 0.5, cursor: 'not-allowed' }}>Save Draft</button>
                  <button type="button" className="btn-vision-brand" style={{ opacity: 0.5, cursor: 'not-allowed' }}>Submit Report</button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ───────────────────────────────────── */}
      <div className="vision-toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`vision-toast ${t.kind}`}>
            <i className={`bi ${t.kind === 'success' ? 'bi-check-circle-fill text-success' : t.kind === 'error' ? 'bi-exclamation-circle-fill text-danger' : 'bi-info-circle-fill text-primary'}`} style={{ fontSize: 16 }} />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}