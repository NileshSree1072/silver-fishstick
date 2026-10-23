import React, { useEffect } from 'react';

/**
 * ConfirmModal – a styled replacement for window.confirm()
 *
 * Props:
 *   open        boolean          – show/hide
 *   title       string           – dialog heading
 *   message     string | node    – body text
 *   confirmText string           – confirm button label (default "Confirm")
 *   cancelText  string           – cancel button label  (default "Cancel")
 *   variant     'danger' | 'warning' | 'info' | 'primary'  (default 'warning')
 *   onConfirm   () => void       – called when user clicks confirm
 *   onCancel    () => void       – called when user clicks cancel / presses Esc
 */
const VARIANTS = {
  danger:  { icon: 'delete',       iconClass: 'text-danger bg-danger-soft border-danger-border',    button: 'btn-danger !bg-danger !text-white !border-danger hover:!opacity-90' },
  warning: { icon: 'warning',      iconClass: 'text-warning bg-warning-soft border-warning-border', button: 'btn-primary' },
  info:    { icon: 'info',         iconClass: 'text-on-surface-variant bg-surface-container border-outline-variant', button: 'btn-primary' },
  primary: { icon: 'check_circle', iconClass: 'text-primary bg-brand-soft border-brand-border',     button: 'btn-primary' },
};

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
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const cfg = VARIANTS[variant] || VARIANTS.warning;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 anim-fade-in" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-xl border border-outline-variant bg-popover shadow-[var(--shadow-xl)] anim-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5 px-5 pt-5 pb-4">
          <div className={`w-10 h-10 rounded-[10px] border grid place-items-center shrink-0 ${cfg.iconClass}`}>
            <span className="material-symbols-outlined !text-[20px]">{cfg.icon}</span>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 id="confirm-title" className="text-[15px] font-semibold text-on-surface">{title}</h3>
            {message && <p className="text-[13.5px] leading-relaxed text-on-surface-variant mt-1">{message}</p>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-outline-variant bg-surface-container rounded-b-xl">
          <button type="button" onClick={onCancel} className="btn btn-secondary">{cancelText}</button>
          <button type="button" onClick={onConfirm} className={`btn ${cfg.button}`} autoFocus>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
