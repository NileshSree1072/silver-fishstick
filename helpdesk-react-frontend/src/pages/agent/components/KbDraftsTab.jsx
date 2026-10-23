import React from 'react';
import { Loader2 } from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState, SkeletonList } from '../../../components/ui/Primitives';
import { formatDate } from '../../../utils/ticketMeta';

/**
 * Agent "KB drafts" page: write a new article for admin review and see your drafts.
 */
const KbDraftsTab = ({
  title, onTitleChange, content, onContentChange, category, onCategoryChange, categories,
  submitting, onSubmit, drafts, loading, onRefresh, onDelete,
}) => (
  <div className="h-full overflow-y-auto">
    <div className="mx-auto max-w-[1100px] p-4 lg:p-6 grid gap-5 lg:grid-cols-[1fr_340px] items-start">
      <form onSubmit={onSubmit} className="card p-5 space-y-4">
        <div>
          <h2 className="text-[16px] font-semibold text-on-surface">New knowledge base article</h2>
          <p className="text-[13px] text-on-surface-variant mt-0.5">Drafts are reviewed by an admin before they're published to customers.</p>
        </div>

        <label className="block">
          <span className="block text-[13px] font-medium text-on-surface mb-1.5">Title</span>
          <input
            type="text"
            required
            className="field"
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            placeholder="e.g. Fix VPN disconnects on macOS"
          />
        </label>

        <div>
          <span className="block text-[13px] font-medium text-on-surface mb-1.5">Category</span>
          <CustomSelect
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            value={category}
            onChange={onCategoryChange}
            placeholder="Choose a category"
          />
        </div>

        <label className="block">
          <span className="block text-[13px] font-medium text-on-surface mb-1.5">Content</span>
          <textarea
            required
            rows={10}
            className="field resize-y"
            placeholder="Describe the symptom, the cause, and the step-by-step fix. Markdown is supported."
            value={content}
            onChange={e => onContentChange(e.target.value)}
          />
        </label>

        <div className="flex justify-end">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Saving…' : 'Submit for review'}
          </button>
        </div>
      </form>

      <section className="card overflow-hidden">
        <header className="flex items-center px-4 py-3 border-b border-outline-variant">
          <h2 className="flex-1 text-[14px] font-semibold text-on-surface">My drafts</h2>
          <button type="button" onClick={onRefresh} className="icon-btn" aria-label="Refresh drafts">
            <span className="material-symbols-outlined !text-[18px]">refresh</span>
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <SkeletonList rows={3} />
          ) : drafts.length === 0 ? (
            <EmptyState icon="edit_note" title="No drafts yet" description="Articles you write appear here while they wait for review." />
          ) : drafts.map(art => (
            <div key={art.id} className="group px-4 py-3 border-b border-outline-variant last:border-b-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge tone={art.published ? 'success' : 'warning'}>{art.published ? 'Published' : 'In review'}</Badge>
                <span className="text-[12px] text-on-surface-variant ml-auto">{formatDate(art.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => onDelete(art.id)}
                  className="icon-btn !w-6 !h-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Delete ${art.title}`}
                >
                  <span className="material-symbols-outlined !text-[15px]">delete</span>
                </button>
              </div>
              <p className="text-[13.5px] font-medium text-on-surface truncate">{art.title}</p>
              <p className="text-[12.5px] text-on-surface-variant line-clamp-2 mt-0.5">{art.content}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);

export default KbDraftsTab;
