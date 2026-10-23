import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';
import { PriorityLabel } from '../../../components/ui/Badge';
import { PRIORITY_META } from '../../../utils/ticketMeta';

const SuggestionSkeleton = () => (
  <div className="rounded-lg border border-outline-variant p-3 space-y-2">
    <div className="skeleton h-3 w-3/4" />
    <div className="skeleton h-2.5 w-full" />
  </div>
);

/**
 * New ticket form with live article suggestions — answers first, ticket second.
 */
const NewTicketTab = ({
  title, onTitleChange, description, onDescriptionChange,
  category, onCategoryChange, priority, onPriorityChange, categories,
  attachments, onAddAttachments, onRemoveAttachment, onEditAttachment,
  submitting, onSubmit, onCancel, onDiscard,
  suggestions, suggestionsLoading, onOpenSuggestion,
}) => {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const typedEnough = title.trim().length >= 5;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1080px] px-4 md:px-6 py-6 md:py-8 grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <form onSubmit={onSubmit} className="card p-5 md:p-6 space-y-5">
          <div>
            <h2 className="text-[18px] font-semibold text-on-surface">New ticket</h2>
            <p className="text-[13.5px] text-on-surface-variant mt-0.5">Describe the problem and we'll suggest answers as you type.</p>
          </div>

          <label className="block">
            <span className="block text-[13px] font-medium text-on-surface mb-1.5">Subject</span>
            <input
              required
              className="field"
              placeholder="A short summary, e.g. VPN disconnects every few minutes"
              value={title}
              onChange={e => onTitleChange(e.target.value)}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="block text-[13px] font-medium text-on-surface mb-1.5">Description</span>
            <textarea
              required
              rows={6}
              className="field resize-y"
              placeholder="What happened? Include any error messages, what you've already tried, and when it started."
              value={description}
              onChange={e => onDescriptionChange(e.target.value)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-[13px] font-medium text-on-surface mb-1.5">Category <span className="text-on-surface-variant font-normal">(optional)</span></span>
              <CustomSelect
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                value={category}
                onChange={onCategoryChange}
                placeholder="Choose a category"
              />
            </div>
            <div>
              <span className="block text-[13px] font-medium text-on-surface mb-1.5">Priority</span>
              <CustomSelect
                options={Object.entries(PRIORITY_META).map(([value, m]) => ({ value, label: m.label }))}
                value={priority}
                onChange={onPriorityChange}
                renderOption={(opt) => <PriorityLabel priority={opt.value} />}
              />
            </div>
          </div>

          <div>
            <span className="block text-[13px] font-medium text-on-surface mb-1.5">Attachments <span className="text-on-surface-variant font-normal">(optional)</span></span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); onAddAttachments(e.dataTransfer.files); }}
              className={`w-full rounded-[10px] border border-dashed px-4 py-5 text-center cursor-pointer transition-colors ${
                dragging ? 'border-primary bg-brand-soft' : 'border-outline hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-on-surface-variant !text-[22px]">upload_file</span>
              <span className="block text-[13px] text-on-surface mt-1"><span className="font-medium text-primary">Click to upload</span> or drag and drop</span>
              <span className="block text-[12px] text-on-surface-variant mt-0.5">Images, PDFs or text logs up to 10 MB</span>
            </button>
            <input type="file" multiple ref={fileRef} className="hidden" onChange={e => { onAddAttachments(e.target.files); e.target.value = ''; }} />
            {attachments.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {attachments.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-1.5 text-[13px]">
                    <span className="material-symbols-outlined !text-[17px] text-on-surface-variant">{f.type?.startsWith('image/') ? 'image' : 'attach_file'}</span>
                    <span className="flex-1 truncate text-on-surface">{f.name}</span>
                    {f.type?.startsWith('image/') && (
                      <button type="button" onClick={() => onEditAttachment(i)} className="icon-btn !w-7 !h-7" aria-label={`Annotate ${f.name}`} title="Annotate image">
                        <span className="material-symbols-outlined !text-[16px]">edit</span>
                      </button>
                    )}
                    <button type="button" onClick={() => onRemoveAttachment(i)} className="icon-btn !w-7 !h-7" aria-label={`Remove ${f.name}`}>
                      <span className="material-symbols-outlined !text-[16px]">close</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant">
            <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Submitting…' : 'Submit ticket'}
            </button>
          </div>
        </form>

        <aside className="card p-4 lg:sticky lg:top-6" aria-live="polite">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined icon-fill !text-[17px] text-ai">auto_awesome</span>
            <h3 className="flex-1 text-[14px] font-semibold text-on-surface">Suggested answers</h3>
            {suggestions.length > 0 && <span className="text-[12px] text-on-surface-variant">{suggestions.length} found</span>}
          </div>
          <p className="text-[12.5px] text-on-surface-variant mb-3">These may solve your problem right away.</p>

          <div className="space-y-2">
            {suggestionsLoading ? (
              <><SuggestionSkeleton /><SuggestionSkeleton /></>
            ) : suggestions.length === 0 ? (
              <p className="text-[12.5px] text-on-surface-variant py-4 text-center">
                {typedEnough ? 'No matching articles yet — add more detail to the subject.' : 'Start typing a subject to see suggestions.'}
              </p>
            ) : suggestions.map((s, idx) => (
              <button
                key={s.id || idx}
                type="button"
                onClick={() => onOpenSuggestion(s)}
                className="w-full text-left rounded-lg border border-outline-variant p-3 hover:border-outline hover:bg-surface-container cursor-pointer"
              >
                <span className="flex items-start gap-2">
                  <span className="material-symbols-outlined !text-[16px] text-on-surface-variant mt-0.5">{s.type === 'ticket' ? 'forum' : 'description'}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium text-on-surface line-clamp-2">{s.title}</span>
                    <span className="block text-[12px] text-on-surface-variant line-clamp-2 mt-0.5">{s.description || s.content}</span>
                    <span className="block text-[11.5px] text-on-surface-variant/80 mt-1">
                      {s.type === 'ticket' ? 'Solved question' : s.categoryName || 'Article'}
                      {typeof s.score === 'number' ? ` · ${Math.round(s.score * 100)}% match` : ''}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-[12.5px]">
              <span className="material-symbols-outlined !text-[18px] text-success">check_circle</span>
              <span className="flex-1">Found your answer?</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onDiscard}>Discard ticket</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default NewTicketTab;
