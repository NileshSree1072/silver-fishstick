import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';
import MessageItem, { DayDivider } from '../../../components/thread/MessageItem';
import { StatusBadge } from '../../../components/ui/Badge';
import { EmptyState, SkeletonList } from '../../../components/ui/Primitives';
import { PRIORITY_META, STATUS_META, dayLabel, formatDateTime, getTicketNumber, timeAgo } from '../../../utils/ticketMeta';
import ProgressTracker from './ProgressTracker';

const TicketList = ({ tickets, loading, selectedId, onSelect, search, onSearchChange, status, onStatusChange, priority, onPriorityChange, category, onCategoryChange, categories, onRefresh, onNewTicket }) => {
  const filtered = !!(search || status || priority || category);
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-3.5 pb-3 border-b border-outline-variant space-y-2.5">
        <div className="flex items-center">
          <h2 className="flex-1 text-[15px] font-semibold text-on-surface">My tickets</h2>
          <button type="button" onClick={onRefresh} className="icon-btn" aria-label="Refresh">
            <span className="material-symbols-outlined !text-[18px]">refresh</span>
          </button>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 !text-[17px] text-on-surface-variant">search</span>
          <input className="field !py-1.5 !pl-8 !text-[13px]" placeholder="Search tickets" value={search} onChange={e => onSearchChange(e.target.value)} aria-label="Search my tickets" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CustomSelect
            options={[{ value: '', label: 'Any status' }, ...Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }))]}
            value={status}
            onChange={onStatusChange}
            triggerClassName="py-1.5 px-2.5 text-[12.5px]"
          />
          <CustomSelect
            options={[{ value: '', label: 'Any priority' }, ...Object.entries(PRIORITY_META).map(([value, m]) => ({ value, label: m.label }))]}
            value={priority}
            onChange={onPriorityChange}
            triggerClassName="py-1.5 px-2.5 text-[12.5px]"
          />
        </div>
        {categories.length > 0 && (
          <CustomSelect
            options={[{ value: '', label: 'Any category' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
            value={category}
            onChange={onCategoryChange}
            triggerClassName="py-1.5 px-2.5 text-[12.5px]"
          />
        )}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && tickets.length === 0 ? (
          <SkeletonList rows={5} />
        ) : tickets.length === 0 ? (
          filtered ? (
            <EmptyState icon="search_off" title="No tickets match" description="Try a different search or clear the filters." />
          ) : (
            <EmptyState
              icon="confirmation_number"
              title="No tickets yet"
              description="When you contact support, your tickets and replies appear here."
              action={<button type="button" className="btn btn-primary btn-sm" onClick={onNewTicket}>New ticket</button>}
            />
          )
        ) : tickets.map(t => {
          const selected = selectedId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              className={`relative w-full text-left px-4 py-3 border-b border-outline-variant cursor-pointer transition-colors ${selected ? 'bg-brand-soft' : 'hover:bg-surface-container-high'}`}
            >
              {selected && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
              <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                <span className="font-mono">{getTicketNumber(t).split('-').pop()}</span>
                <span className="ml-auto tabular-nums">{timeAgo(t.updatedAt || t.createdAt)}</span>
              </div>
              <p className="text-[13.5px] font-medium text-on-surface truncate mt-0.5 mb-1.5">{t.title}</p>
              <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                <StatusBadge status={t.status} />
                {t.aiFeedback === 'PENDING' && t.status !== 'CLOSED' && <span className="text-ai font-medium">Your feedback needed</span>}
                {!t.aiFeedback && <span className="truncate">{t.assignedToName ? t.assignedToName : 'Waiting for an agent'}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const AiFeedbackCard = ({ ticket, submitting, onFeedback }) => (
  <div className="px-4 lg:px-6 pb-3 shrink-0">
    <div className="mx-auto max-w-[760px] flex gap-3 rounded-[10px] border border-outline-variant bg-surface-container-low shadow-[var(--shadow-sm)] px-4 py-3.5">
      <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-ai-soft border border-ai-border text-ai">
        <span className="material-symbols-outlined icon-fill !text-[17px]">auto_awesome</span>
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-on-surface">Did this answer solve your issue?</p>
        <p className="text-[13px] text-on-surface-variant mt-0.5 mb-3">
          {ticket.aiResolved
            ? 'If not, tell us and a support agent will pick it up — usually within a few hours.'
            : 'Your ticket is still open. If this didn’t help, an agent will reply — usually within a few hours.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={submitting} onClick={() => onFeedback(true)} className="btn btn-primary btn-sm">
            <span className="material-symbols-outlined !text-[16px]">check</span>Yes, close ticket
          </button>
          <button type="button" disabled={submitting} onClick={() => onFeedback(false)} className="btn btn-secondary btn-sm">
            No, talk to a person
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ResolvedPanel = ({ ticket, rating, score, onScoreChange, comment, onCommentChange, submitting, onSubmitRating, onReopen }) => (
  <div className="border-t border-outline-variant bg-surface-container-low px-4 lg:px-6 py-3.5 shrink-0">
    <div className="mx-auto max-w-[760px] space-y-3">
      {ticket.status === 'RESOLVED' && (
        <div className="flex items-center gap-3 text-[13px]">
          <span className="material-symbols-outlined !text-[18px] text-success">task_alt</span>
          <span className="flex-1 text-on-surface">This ticket is resolved. Still having the problem?</span>
          <button type="button" onClick={onReopen} className="btn btn-secondary btn-sm">Reopen ticket</button>
        </div>
      )}
      {rating ? (
        <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
          <span className="flex">{[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={`material-symbols-outlined !text-[17px] ${s <= rating.score ? 'icon-fill' : ''}`} style={{ color: s <= rating.score ? 'var(--warning)' : 'var(--text-disabled)' }}>star</span>
          ))}</span>
          Thanks for rating your experience.
          {rating.comment && <span className="truncate italic">“{rating.comment}”</span>}
        </div>
      ) : (
        <form onSubmit={onSubmitRating} className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <span className="text-[13px] font-medium text-on-surface">How was your support experience?</span>
          <span className="flex" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} type="button" role="radio" aria-checked={score === s} aria-label={`${s} star${s > 1 ? 's' : ''}`} onClick={() => onScoreChange(s)} className="p-0.5 cursor-pointer">
                <span className={`material-symbols-outlined !text-[21px] ${s <= score ? 'icon-fill' : ''}`} style={{ color: s <= score ? 'var(--warning)' : 'var(--text-disabled)' }}>star</span>
              </button>
            ))}
          </span>
          {score > 0 && (
            <span className="flex flex-1 gap-2">
              <input className="field !py-1.5 !text-[13px]" placeholder="Anything we could do better? (optional)" value={comment} onChange={e => onCommentChange(e.target.value)} />
              <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">{submitting ? <Loader2 size={14} className="animate-spin" /> : 'Submit'}</button>
            </span>
          )}
        </form>
      )}
    </div>
  </div>
);

const CustomerComposer = ({ value, onChange, attachments, onAddFiles, onRemoveAttachment, onEditAttachment, sending, onSend, textareaRef }) => {
  const fileRef = useRef(null);
  const canSend = !sending && (value.trim().length > 0 || attachments.length > 0);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, textareaRef]);

  return (
    <div className="border-t border-outline-variant bg-surface-container-low px-4 lg:px-6 py-3 shrink-0">
      <div className="mx-auto max-w-[760px] rounded-[10px] border border-outline bg-[var(--bg-input)] shadow-[var(--shadow-xs)] focus-within:border-primary focus-within:shadow-[var(--shadow-brand)]">
        <textarea
          ref={textareaRef}
          rows={2}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) onSend(); } }}
          placeholder="Write a message…"
          aria-label="Message"
          className="block w-full resize-none bg-transparent px-3.5 pt-2.5 pb-1 text-[13.5px] text-on-surface placeholder:text-on-surface-variant/70 outline-none"
        />
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-1.5">
            {attachments.map(item => {
              const isImage = item.file.type?.startsWith('image/');
              return (
                <span key={item.id} className="inline-flex items-center gap-1.5 max-w-[240px] rounded-md border border-outline-variant bg-surface-container-low pl-2 pr-1 py-0.5 text-[12px] text-on-surface">
                  <span className="material-symbols-outlined !text-[15px] text-on-surface-variant">{isImage ? 'image' : 'attach_file'}</span>
                  <span className="truncate">{item.name}</span>
                  {isImage && (
                    <button type="button" onClick={() => onEditAttachment(item.id)} className="icon-btn !w-5 !h-5" aria-label={`Annotate ${item.name}`}>
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
        <div className="flex items-center px-1.5 py-1.5">
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
          <span className="hidden sm:inline text-[11.5px] text-on-surface-variant/80 ml-1">Enter to send · Shift+Enter for a new line</span>
          <button type="button" onClick={onSend} disabled={!canSend} className="btn btn-primary btn-sm ml-auto">
            {sending && <Loader2 size={14} className="animate-spin" />}Send
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * "My tickets": list on the left, conversation on the right (stacked on mobile).
 */
const MyTicketsTab = ({ list, detail, endRef, composerRef }) => {
  const { ticket } = detail;
  const showDetailOnMobile = !!ticket;
  let lastDay = null;

  const opening = ticket && {
    id: `description-${ticket.id}`,
    senderId: ticket.createdById,
    senderName: ticket.createdByName,
    senderRole: 'USER',
    message: ticket.description,
    createdAt: ticket.createdAt,
    attachments: detail.ticketAttachments,
  };

  return (
    <div className="h-full flex min-h-0">
      <aside className={`${showDetailOnMobile ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-[320px] shrink-0 bg-surface-container-low md:border-r border-outline-variant`}>
        <TicketList {...list} selectedId={ticket?.id} />
      </aside>

      <main className={`${showDetailOnMobile ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 bg-background`}>
        {!ticket ? (
          <div className="flex-1 grid place-items-center">
            <EmptyState icon="forum" title="Select a ticket" description="Choose a ticket to see the conversation and reply to support." />
          </div>
        ) : (
          <>
            <div className="px-4 lg:px-6 py-3.5 border-b border-outline-variant bg-surface-container-low shrink-0">
              <div className="flex items-start gap-2">
                <button type="button" onClick={detail.onBack} className="icon-btn md:hidden -ml-1.5" aria-label="Back to tickets">
                  <span className="material-symbols-outlined !text-[20px]">arrow_back</span>
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15.5px] font-semibold text-on-surface truncate">{ticket.title}</h2>
                  <p className="text-[12.5px] text-on-surface-variant mt-0.5">
                    <span className="font-mono text-[12px]">{getTicketNumber(ticket)}</span> · Opened {formatDateTime(ticket.createdAt)}
                    {ticket.categoryName ? ` · ${ticket.categoryName}` : ''}
                  </p>
                </div>
                <StatusBadge status={ticket.status} />
              </div>
              <ProgressTracker ticket={ticket} />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="mx-auto max-w-[760px] px-4 lg:px-6 py-5 space-y-4">
                {[opening, ...detail.replies].map((reply, idx) => {
                  const day = dayLabel(reply.createdAt);
                  const divider = day !== lastDay ? <DayDivider label={day} /> : null;
                  lastDay = day;
                  return (
                    <React.Fragment key={reply.id || idx}>
                      {divider}
                      <MessageItem
                        reply={reply}
                        viewer="customer"
                        isMine={reply.senderId === detail.currentUserId}
                        onOpenAttachment={detail.onOpenAttachment}
                        onOpenArticle={detail.onOpenArticle}
                      />
                    </React.Fragment>
                  );
                })}
                {detail.repliesLoading && <SkeletonList rows={2} variant="message" />}
                <div ref={endRef} />
              </div>
            </div>

            {ticket.aiFeedback === 'PENDING' && ticket.status !== 'CLOSED' && (
              <AiFeedbackCard ticket={ticket} submitting={detail.submittingAiFeedback} onFeedback={detail.onAiFeedback} />
            )}

            {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') ? (
              (ticket.aiFeedback !== 'PENDING' || ticket.status === 'CLOSED') && <ResolvedPanel ticket={ticket} {...detail.resolved} />
            ) : (
              <CustomerComposer {...detail.composer} textareaRef={composerRef} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MyTicketsTab;
