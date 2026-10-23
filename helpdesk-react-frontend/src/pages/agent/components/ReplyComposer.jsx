import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../../context/AuthContext';
import { Kbd } from '../../../components/ui/Primitives';

const AI_TOOLS = [
  { mode: 'IMPROVE', icon: 'auto_fix_high', label: 'Improve', done: 'Reply polished' },
  { mode: 'SHORTEN', icon: 'compress', label: 'Shorten', done: 'Reply shortened' },
  { mode: 'TRANSLATE', icon: 'translate', label: 'Translate', done: "Translated to the customer's language", title: "Translate into the customer's language" },
];

/**
 * Reply / internal-note composer with AI rewrite tools and attachments.
 * Text, mode and attachments are owned by the workspace so drafts survive re-renders.
 */
const ReplyComposer = ({
  ticketId, value, onChange, isInternal, onModeChange, textareaRef,
  attachments, onAddFiles, onRemoveAttachment, onEditAttachment,
  sending, onSend, onSendAndResolve, addToast,
}) => {
  const fileRef = useRef(null);
  const menuRef = useRef(null);
  const [rewriting, setRewriting] = useState(null);
  const [undoText, setUndoText] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const canSend = !sending && (value.trim().length > 0 || attachments.length > 0);

  // Auto-grow the textarea up to a limit
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [value, textareaRef]);

  useEffect(() => { setUndoText(null); }, [ticketId]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const rewrite = async (tool) => {
    if (!value.trim()) {
      addToast('Write a reply or insert the suggested one first.', 'Nothing to rewrite', 'info');
      return;
    }
    setRewriting(tool.mode);
    try {
      const res = await api.post('/api/ai/rewrite', { ticketId, text: value, mode: tool.mode });
      if (res.data?.text) {
        setUndoText(value);
        onChange(res.data.text);
        addToast(tool.done, 'AI', 'success');
      }
    } catch {
      addToast('The AI could not rewrite this reply right now.', 'AI unavailable', 'error');
    } finally {
      setRewriting(null);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    } else if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="border-t border-outline-variant bg-surface-container-low px-4 lg:px-6 pt-3 pb-3 shrink-0">
      <div
        className={`mx-auto max-w-[780px] rounded-[10px] border shadow-[var(--shadow-xs)] transition-colors focus-within:shadow-[var(--shadow-brand)] ${
          isInternal ? 'bg-note-soft border-note-border focus-within:border-note-rule' : 'bg-[var(--bg-input)] border-outline focus-within:border-primary'
        }`}
      >
        <div className="flex items-center gap-0.5 px-2 pt-1.5" role="tablist" aria-label="Message type">
          {[{ internal: false, label: 'Reply' }, { internal: true, label: 'Internal note' }].map(tab => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={isInternal === tab.internal}
              onClick={() => onModeChange(tab.internal)}
              className={`px-2.5 py-1 rounded-md text-[12.5px] font-medium cursor-pointer transition-colors ${
                isInternal === tab.internal
                  ? tab.internal ? 'bg-note-border text-warning-text' : 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {undoText !== null && (
            <button
              type="button"
              onClick={() => { onChange(undoText); setUndoText(null); }}
              className="ml-auto mr-1 text-[12px] text-on-surface-variant hover:text-on-surface flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined !text-[15px]">undo</span>Undo AI change
            </button>
          )}
        </div>

        <textarea
          ref={textareaRef}
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isInternal ? 'Add an internal note — only agents can see this' : 'Write a reply…'}
          aria-label={isInternal ? 'Internal note' : 'Reply'}
          className="block w-full resize-none bg-transparent px-3.5 py-2 text-[13.5px] text-on-surface placeholder:text-on-surface-variant/70 outline-none"
        />

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {attachments.map(item => {
              const isImage = item.file.type?.startsWith('image/');
              return (
                <span key={item.id} className="inline-flex items-center gap-1.5 max-w-[240px] rounded-md border border-outline-variant bg-surface-container-low pl-2 pr-1 py-0.5 text-[12px] text-on-surface">
                  <span className="material-symbols-outlined !text-[15px] text-on-surface-variant">{isImage ? 'image' : 'attach_file'}</span>
                  <span className="truncate">{item.name}</span>
                  {isImage && (
                    <button type="button" onClick={() => onEditAttachment(item.id)} className="icon-btn !w-5 !h-5" aria-label={`Edit ${item.name}`} title="Annotate image">
                      <span className="material-symbols-outlined !text-[14px]">edit</span>
                    </button>
                  )}
                  <button type="button" onClick={() => onRemoveAttachment(item.id)} className="icon-btn !w-5 !h-5" aria-label={`Remove ${item.name}`}>
                    <span className="material-symbols-outlined !text-[14px]">close</span>
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-0.5 flex-wrap px-1.5 py-1.5 border-t border-outline-variant">
          {AI_TOOLS.map(tool => (
            <button
              key={tool.mode}
              type="button"
              onClick={() => rewrite(tool)}
              disabled={!!rewriting}
              title={tool.title || `${tool.label} with AI`}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[12.5px] font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              {rewriting === tool.mode
                ? <Loader2 size={15} className="animate-spin text-ai" />
                : <span className="material-symbols-outlined !text-[17px] text-ai">{tool.icon}</span>}
              <span className="hidden sm:inline">{tool.label}</span>
            </button>
          ))}
          <span className="w-px h-4 bg-outline-variant mx-1" />
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
            className="hidden"
            onChange={(e) => { onAddFiles(e.target.files); e.target.value = ''; }}
          />
          <button type="button" onClick={() => fileRef.current?.click()} className="icon-btn" aria-label="Attach files" title="Attach files">
            <span className="material-symbols-outlined !text-[18px]">attach_file</span>
          </button>

          <div className="ml-auto flex relative" ref={menuRef}>
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className="btn btn-primary btn-sm !rounded-r-none"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : null}
              {isInternal ? 'Add note' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              disabled={!canSend || isInternal}
              className="btn btn-primary btn-sm !rounded-l-none !px-1.5 border-l !border-l-white/25"
              aria-label="More send options"
              aria-expanded={menuOpen}
            >
              <span className="material-symbols-outlined !text-[17px]">expand_more</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 bottom-full mb-1.5 w-48 p-1 rounded-lg border border-outline-variant bg-popover shadow-[var(--shadow-lg)] z-20 anim-fade-in">
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onSendAndResolve(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-on-surface hover:bg-surface-container-high cursor-pointer text-left"
                >
                  <span className="material-symbols-outlined !text-[17px] text-on-surface-variant">task_alt</span>
                  Send and resolve
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[780px] mt-1.5 hidden md:flex gap-3 text-[11.5px] text-on-surface-variant/80">
        <span className="flex items-center gap-1"><Kbd>Enter</Kbd> send</span>
        <span className="flex items-center gap-1"><Kbd>Shift</Kbd><Kbd>Enter</Kbd> new line</span>
        <span className="flex items-center gap-1"><Kbd>N</Kbd> internal note</span>
      </div>
    </div>
  );
};

export default ReplyComposer;
