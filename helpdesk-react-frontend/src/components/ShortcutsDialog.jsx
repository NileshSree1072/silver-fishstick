import React, { useEffect } from 'react';
import { Kbd } from './ui/Primitives';

const GLOBAL = [
  [['Ctrl', 'K'], 'Command menu'],
  [['?'], 'Keyboard shortcuts'],
];

const AGENT = [
  [['J'], 'Next ticket'],
  [['K'], 'Previous ticket'],
  [['/'], 'Search tickets'],
  [['R'], 'Reply'],
  [['N'], 'Internal note'],
  [['G', 'D'], 'Generate AI reply'],
  [['E'], 'Resolve ticket'],
  [['Enter'], 'Send (Shift+Enter for a new line)'],
];

const ADMIN = [
  [['Ctrl', 'K'], 'Command palette & global search'],
  [['?'], 'Keyboard shortcuts reference'],
  [['Esc'], 'Dismiss modals, popovers & drawers'],
  [['←', '→'], 'Guided tour step navigation'],
];

const ShortcutsDialog = ({ open, onClose, console: activeConsole }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sections = [['General', GLOBAL]];
  if (activeConsole === 'agent') sections.push(['Ticket workspace', AGENT]);
  if (activeConsole === 'admin') sections.push(['Admin navigation', ADMIN]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/30 anim-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="w-full max-w-md rounded-xl border border-outline-variant bg-popover shadow-[var(--shadow-xl)] anim-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-5 py-3.5 border-b border-outline-variant">
          <h2 className="flex-1 text-sm font-semibold">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <span className="material-symbols-outlined !text-[18px]">close</span>
          </button>
        </div>
        <div className="px-5 py-4 space-y-5">
          {sections.map(([title, rows]) => (
            <div key={title}>
              <h3 className="text-[11.5px] font-medium text-on-surface-variant mb-2">{title}</h3>
              <dl className="space-y-2">
                {rows.map(([keys, label]) => (
                  <div key={label} className="flex items-center justify-between text-[13px]">
                    <dt className="text-on-surface">{label}</dt>
                    <dd className="flex gap-1">{keys.map(k => <Kbd key={k}>{k}</Kbd>)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        {activeConsole === 'admin' && (
          <div className="px-5 py-3 border-t border-outline-variant bg-surface-container-low flex items-center justify-between">
            <span className="text-[12px] text-on-surface-variant">Want an interactive walkthrough?</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                setTimeout(() => window.dispatchEvent(new CustomEvent('aegis:start-admin-tour')), 50);
              }}
              className="btn btn-primary btn-sm text-[12px] flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[16px]">help</span>
              <span>Start 8-Step Tour</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShortcutsDialog;
