import React, { useEffect } from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';

/**
 * ConfirmModal – a styled replacement for window.confirm()
 *
 * Props:
 *   open        boolean          – show/hide
 *   title       string           – dialog heading
 *   message     string | node    – body text
 *   confirmText string           – confirm button label (default "Confirm")
 *   cancelText  string           – cancel button label  (default "Cancel")
 *   variant     'danger' | 'warning' | 'info'  (default 'warning')
 *   onConfirm   () => void       – called when user clicks confirm
 *   onCancel    () => void       – called when user clicks cancel / presses Esc
 */
const ConfirmModal = ({
  open,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
}) => {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const cfg = {
    danger:  { icon: <Trash2   size={22} />, color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  btn: 'bg-red-500/90 hover:bg-red-500 text-white' },
    warning: { icon: <AlertTriangle size={22} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', btn: 'bg-amber-500/90 hover:bg-amber-500 text-white' },
    info:    { icon: <Info      size={22} />, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', btn: 'bg-blue-500/90 hover:bg-blue-500 text-white' },
  }[variant] || cfg?.warning;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      {/* Dialog panel */}
      <div
        className="relative w-full max-w-md rounded-2xl anim-bounce-in overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${cfg.border}`,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Coloured top stripe */}
        <div style={{ height: 3, background: cfg.color, opacity: 0.9 }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-0 gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
            >
              {cfg.icon}
            </div>
            <h3
              className="text-sm font-bold leading-tight"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg cursor-pointer transition-colors shrink-0 mt-0.5"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-heading)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pt-3 pb-5">
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-body)', paddingLeft: '3.25rem' }}
          >
            {message}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 0 }} />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-body)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all ${cfg.btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
