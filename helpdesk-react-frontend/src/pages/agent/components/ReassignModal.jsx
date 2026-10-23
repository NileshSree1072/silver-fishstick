import React from 'react';
import { Loader2 } from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';

const ReassignModal = ({ open, onClose, categories, category, onCategoryChange, reason, onReasonChange, submitting, onSubmit }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 anim-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassign-title"
        className="w-full max-w-md rounded-xl border border-outline-variant bg-popover shadow-[var(--shadow-xl)] anim-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-outline-variant">
          <div className="flex-1">
            <h2 id="reassign-title" className="text-[15px] font-semibold text-on-surface">Request reassignment</h2>
            <p className="text-[13px] text-on-surface-variant mt-0.5">An admin will review the request and move the ticket.</p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <span className="material-symbols-outlined !text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-5 py-4 space-y-4">
          <div>
            <span className="block text-[13px] font-medium text-on-surface mb-1.5">Move to category <span className="text-on-surface-variant font-normal">(optional)</span></span>
            <CustomSelect
              options={[{ value: '', label: 'Keep current category' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
              value={category}
              onChange={onCategoryChange}
            />
          </div>
          <label className="block">
            <span className="block text-[13px] font-medium text-on-surface mb-1.5">Reason</span>
            <textarea
              required
              rows={4}
              className="field resize-none"
              placeholder="Why should someone else handle this ticket?"
              value={reason}
              onChange={e => onReasonChange(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Submit request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReassignModal;
