import React from 'react';
import FormattedMessage from '../FormattedMessage';
import { Avatar } from '../ui/Primitives';
import { Badge } from '../ui/Badge';
import { formatTime, getAttachmentKind } from '../../utils/ticketMeta';

// Knowledge articles / past tickets an AI reply or draft was grounded on.
// Customers only ever receive article sources from the API.
export const AiSourceList = ({ sources, label = 'Sources', onOpenArticle, emptyLabel, className = '' }) => {
  if (!Array.isArray(sources) || sources.length === 0) {
    return emptyLabel ? <p className={`mt-2.5 text-[11.5px] text-on-surface-variant ${className}`}>{emptyLabel}</p> : null;
  }
  return (
    <div className={`flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-outline-variant text-[11.5px] ${className}`}>
      {label && <span className="text-on-surface-variant">{label}</span>}
      {sources.map(src => {
        const clickable = src.type === 'article' && onOpenArticle;
        const Tag = clickable ? 'button' : 'span';
        return (
          <Tag
            key={`${src.type}-${src.id}`}
            type={clickable ? 'button' : undefined}
            onClick={clickable ? () => onOpenArticle(src.id) : undefined}
            title={src.title}
            className={`inline-flex items-center gap-1 max-w-full rounded-md border border-outline-variant bg-surface-container px-1.5 leading-[20px] text-on-surface-variant ${
              clickable ? 'cursor-pointer hover:border-outline hover:text-on-surface' : ''
            }`}
          >
            <span className="material-symbols-outlined !text-[14px] text-on-surface-variant">{src.type === 'article' ? 'description' : 'confirmation_number'}</span>
            <span className="truncate max-w-[200px]">
              {src.type === 'ticket' && src.ticketNumber ? `${src.ticketNumber.split('-').pop()} · ` : ''}{src.title}
            </span>
            {typeof src.score === 'number' && <span className="tabular-nums text-on-surface-variant/80">{Math.round(src.score * 100)}%</span>}
          </Tag>
        );
      })}
    </div>
  );
};

export const AttachmentChips = ({ attachments, onOpen, className = '' }) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;
  return (
    <div className={`mt-2.5 flex flex-wrap gap-1.5 ${className}`}>
      {attachments.map(att => (
        <button
          key={att.id}
          type="button"
          onClick={() => onOpen?.(att)}
          className="inline-flex items-center gap-1.5 max-w-[240px] rounded-md border border-outline-variant bg-surface-container-low px-2 py-1 text-[12px] text-on-surface hover:bg-surface-container-high cursor-pointer transition-colors"
          title={getAttachmentKind(att) === 'file' ? 'Open file' : 'Preview'}
        >
          <span className="material-symbols-outlined !text-[15px] text-on-surface-variant">
            {getAttachmentKind(att) === 'image' ? 'image' : getAttachmentKind(att) === 'pdf' ? 'picture_as_pdf' : 'attach_file'}
          </span>
          <span className="truncate">{att.fileName}</span>
        </button>
      ))}
    </div>
  );
};

export const DayDivider = ({ label }) => (
  <div className="flex items-center gap-3 text-[11px] text-on-surface-variant/80 my-1">
    <span className="flex-1 h-px bg-outline-variant" />
    {label}
    <span className="flex-1 h-px bg-outline-variant" />
  </div>
);

const roleLabelFor = (reply, viewer, isMine) => {
  if (reply.isAiGenerated) return viewer === 'customer' ? null : 'AI assistant';
  if (reply.isInternal) return 'Internal note';
  if (viewer === 'customer') return isMine ? null : 'Support';
  if (reply.senderRole === 'USER') return 'Customer';
  return reply.senderRole === 'ADMIN' ? 'Admin' : 'Agent';
};

/**
 * One message in a ticket thread.
 * Neutral by default; only the viewer's own messages (brand tint),
 * AI messages (violet rule) and internal notes (amber) are marked.
 */
const MessageItem = ({ reply, viewer = 'agent', isMine = false, onOpenAttachment, onOpenArticle }) => {
  const isAi = reply.isAiGenerated;
  const isNote = reply.isInternal;
  const name = isAi ? (viewer === 'customer' ? 'AI Assistant' : 'Aegis AI') : isMine && viewer === 'customer' ? 'You' : reply.senderName;
  const role = roleLabelFor(reply, viewer, isMine);
  const hasText = reply.message && reply.message.trim().length > 0;

  const bubble = isNote
    ? 'bg-note-soft border-note-border border-l-2 border-l-note-rule rounded-l-[4px]'
    : isAi
      ? 'bg-surface-container-low border-outline-variant border-l-2 border-l-ai rounded-l-[4px]'
      : isMine
        ? 'bg-brand-soft border-brand-border'
        : 'bg-surface-container-low border-outline-variant';

  return (
    <div className="flex gap-2.5 items-start">
      <Avatar name={reply.senderName} ai={isAi} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1 text-[12.5px]">
          <span className="font-semibold text-on-surface truncate">{name}</span>
          {role && <span className="text-[11.5px] text-on-surface-variant">{role}</span>}
          {isAi && viewer === 'customer' && <Badge tone="ai" className="!px-1.5">Automated</Badge>}
          <time className="ml-auto text-[11px] text-on-surface-variant/80 tabular-nums shrink-0">{formatTime(reply.createdAt)}</time>
        </div>
        <div className={`rounded-[10px] border px-3.5 py-2.5 text-on-surface shadow-[var(--shadow-xs)] ${bubble}`}>
          {hasText ? (
            <FormattedMessage content={reply.message} className="text-[13px] text-on-surface" />
          ) : (
            <p className="text-[13px] text-on-surface-variant italic">Sent an attachment</p>
          )}
          <AttachmentChips attachments={reply.attachments} onOpen={onOpenAttachment} />
          {isAi && (
            <AiSourceList
              sources={reply.aiSources}
              label={viewer === 'customer' ? 'Based on' : 'Sources'}
              onOpenArticle={onOpenArticle}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
