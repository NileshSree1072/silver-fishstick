import React, { useEffect, useRef, useState } from 'react';
import CustomSelect from '../../../components/CustomSelect';
import MessageItem, { DayDivider } from '../../../components/thread/MessageItem';
import { AiFeedbackBadge, PriorityLabel } from '../../../components/ui/Badge';
import { EmptyState, Kbd, SkeletonList } from '../../../components/ui/Primitives';
import { PRIORITY_META, STATUS_META, dayLabel, getTicketNumber } from '../../../utils/ticketMeta';

const MenuItem = ({ icon, label, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-on-surface hover:bg-surface-container-high cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <span className="material-symbols-outlined !text-[17px] text-on-surface-variant">{icon}</span>
    {label}
  </button>
);

const MoreMenu = ({ items }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="icon-btn" onClick={() => setOpen(o => !o)} aria-label="More actions" aria-expanded={open}>
        <span className="material-symbols-outlined !text-[19px]">more_horiz</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 p-1 rounded-lg border border-outline-variant bg-popover shadow-[var(--shadow-lg)] z-30 anim-fade-in">
          {visible.map(item => (
            <MenuItem key={item.label} {...item} onClick={() => { setOpen(false); item.onClick(); }} />
          ))}
        </div>
      )}
    </div>
  );
};

const TicketHeader = ({
  ticket, updating, onUpdate, onBack, showInboxButton, onShowInbox, showCopilotButton, onShowCopilot,
  onDraftKb, onRequestReassign, maximized, onToggleMaximize,
}) => {
  const resolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  return (
    <div className="px-4 lg:px-6 py-3 border-b border-outline-variant bg-surface-container-low shrink-0">
      <div className="flex items-start gap-2">
        {onBack && (
          <button type="button" onClick={onBack} className="icon-btn lg:hidden -ml-1.5" aria-label="Back to inbox">
            <span className="material-symbols-outlined !text-[20px]">arrow_back</span>
          </button>
        )}
        {showInboxButton && (
          <button type="button" onClick={onShowInbox} className="icon-btn hidden lg:inline-flex -ml-1.5" aria-label="Show inbox" title="Show inbox">
            <span className="material-symbols-outlined !text-[19px]">left_panel_open</span>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-[15.5px] font-semibold text-on-surface truncate">{ticket.title}</h2>
          <div className="flex items-center gap-2 flex-wrap mt-1 text-[12.5px] text-on-surface-variant">
            <span className="font-mono text-[12px]">{getTicketNumber(ticket)}</span>
            <span className="w-[3px] h-[3px] rounded-full bg-on-surface-variant/50" />
            <span>{ticket.createdByName}</span>
            <span className="w-[3px] h-[3px] rounded-full bg-on-surface-variant/50" />
            <span>{ticket.categoryName || 'General'}</span>
            {ticket.assignedToName && (
              <>
                <span className="w-[3px] h-[3px] rounded-full bg-on-surface-variant/50" />
                <span className="flex items-center gap-1"><span className="material-symbols-outlined !text-[14px]">person</span>{ticket.assignedToName}</span>
              </>
            )}
            {ticket.aiFeedback && <AiFeedbackBadge feedback={ticket.aiFeedback} variant="agent" confidence={ticket.aiConfidence} />}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <CustomSelect
            options={Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }))}
            value={ticket.status}
            disabled={updating}
            onChange={val => onUpdate({ status: val })}
            className="!w-auto"
            optionsClassName="!min-w-[150px] !left-auto right-0"
            renderTrigger={(opt, isOpen) => (
              <button type="button" disabled={updating} className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-lg border border-outline bg-[var(--bg-input)] shadow-[var(--shadow-xs)] text-[12.5px] font-medium text-on-surface cursor-pointer disabled:opacity-60">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_META[opt.value]?.dot }} />
                <span className="hidden sm:inline">{opt.label}</span>
                <span className={`material-symbols-outlined !text-[16px] text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
            )}
            renderOption={(opt) => (
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_META[opt.value]?.dot }} />{opt.label}</span>
            )}
          />
          <CustomSelect
            options={Object.entries(PRIORITY_META).map(([value, m]) => ({ value, label: m.label }))}
            value={ticket.priority}
            disabled={updating}
            onChange={val => onUpdate({ priority: val })}
            className="!w-auto"
            optionsClassName="!min-w-[140px] !left-auto right-0"
            renderTrigger={(opt, isOpen) => (
              <button type="button" disabled={updating} className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border border-outline bg-[var(--bg-input)] shadow-[var(--shadow-xs)] text-[12.5px] font-medium text-on-surface cursor-pointer disabled:opacity-60">
                <PriorityLabel priority={opt.value} />
                <span className={`material-symbols-outlined !text-[16px] text-on-surface-variant transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
            )}
            renderOption={(opt) => <PriorityLabel priority={opt.value} />}
          />
          <MoreMenu
            items={[
              resolved && { icon: 'library_add', label: 'Draft KB article from ticket', onClick: onDraftKb },
              ticket.assignedToId && { icon: 'swap_horiz', label: 'Request reassignment', onClick: onRequestReassign },
              { icon: maximized ? 'close_fullscreen' : 'open_in_full', label: maximized ? 'Exit focus mode' : 'Focus mode', onClick: onToggleMaximize },
            ]}
          />
          {showCopilotButton && (
            <button type="button" onClick={onShowCopilot} className="icon-btn hidden lg:inline-flex" aria-label="Show Copilot" title="Show Copilot">
              <span className="material-symbols-outlined !text-[19px] text-ai">auto_awesome</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Middle panel of the agent workspace: ticket header, conversation and composer.
 */
const ConversationPanel = ({
  ticket, replies, repliesLoading, ticketAttachments, currentUserId,
  onOpenAttachment, onOpenArticle, chatEndRef, composer, header,
}) => {
  if (!ticket) {
    return (
      <div className="flex-1 grid place-items-center">
        <EmptyState
          icon="forum"
          title="No ticket selected"
          description="Pick a ticket from the inbox to read the conversation and reply."
          action={<span className="flex items-center gap-1 text-[12px] text-on-surface-variant"><Kbd>J</Kbd><Kbd>K</Kbd> to move through tickets</span>}
        />
      </div>
    );
  }

  // The ticket description is shown as the customer's first message
  const opening = {
    id: `description-${ticket.id}`,
    senderName: ticket.createdByName,
    senderRole: 'USER',
    message: ticket.description,
    createdAt: ticket.createdAt,
    attachments: ticketAttachments,
  };
  const thread = [opening, ...replies];

  let lastDay = null;

  return (
    <>
      <TicketHeader ticket={ticket} {...header} />
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto max-w-[780px] px-4 lg:px-6 py-5 space-y-4">
          {thread.map((reply, idx) => {
            const day = dayLabel(reply.createdAt);
            const divider = day !== lastDay ? <DayDivider label={day} /> : null;
            lastDay = day;
            return (
              <React.Fragment key={reply.id || idx}>
                {divider}
                <MessageItem
                  reply={reply}
                  viewer="agent"
                  isMine={!!currentUserId && reply.senderId === currentUserId}
                  onOpenAttachment={onOpenAttachment}
                  onOpenArticle={onOpenArticle}
                />
              </React.Fragment>
            );
          })}
          {repliesLoading && <SkeletonList rows={2} variant="message" />}
          <div ref={chatEndRef} />
        </div>
      </div>
      {composer}
    </>
  );
};

export default ConversationPanel;
