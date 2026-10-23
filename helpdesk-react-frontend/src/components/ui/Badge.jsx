import React from 'react';
import { STATUS_META, PRIORITY_META, AI_FEEDBACK_META } from '../../utils/ticketMeta';

const TONES = {
  neutral: 'bg-surface-container-low border-outline-variant text-on-surface-variant',
  brand:   'bg-brand-soft border-brand-border text-on-primary-container',
  ai:      'bg-ai-soft border-ai-border text-ai',
  danger:  'bg-danger-soft border-danger-border text-danger-text',
  warning: 'bg-warning-soft border-warning-border text-warning-text',
  success: 'bg-success-soft border-success-border text-success-text',
};

// Quiet label: neutral by default, colour only when it carries meaning
export const Badge = ({ tone = 'neutral', dot, icon, iconFill = false, className = '', title, children }) => (
  <span
    title={title}
    className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 text-[11px] font-medium leading-[18px] whitespace-nowrap ${TONES[tone] || TONES.neutral} ${className}`}
  >
    {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />}
    {icon && <span className={`material-symbols-outlined !text-[13px] ${iconFill ? 'icon-fill' : ''}`}>{icon}</span>}
    {children}
  </span>
);

export const StatusBadge = ({ status, className = '' }) => {
  const meta = STATUS_META[status] || STATUS_META.OPEN;
  return <Badge dot={meta.dot} className={className}>{meta.label}</Badge>;
};

// Signal-bar priority icon; only Urgent uses colour
export const PriorityBars = ({ priority, className = '' }) => {
  const meta = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;
  const urgent = meta.level === 3;
  return (
    <span className={`inline-flex items-end gap-[1.5px] h-[11px] ${className}`} title={`${meta.label} priority`} aria-label={`${meta.label} priority`}>
      {[5, 8, 11].map((h, i) => (
        <i
          key={h}
          className="block w-[2.5px] rounded-[1px]"
          style={{
            height: h,
            background: urgent ? 'var(--danger)' : i < meta.level ? 'var(--text-muted)' : 'var(--border-medium)',
          }}
        />
      ))}
    </span>
  );
};

export const PriorityLabel = ({ priority }) => {
  const meta = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;
  return (
    <span className={`inline-flex items-center gap-1.5 ${meta.level === 3 ? 'text-danger-text font-medium' : ''}`}>
      <PriorityBars priority={priority} />
      {meta.label}
    </span>
  );
};

export const AiFeedbackBadge = ({ feedback, variant = 'short', confidence }) => {
  const meta = AI_FEEDBACK_META[feedback];
  if (!meta) return null;
  return (
    <Badge
      tone={meta.tone}
      icon="auto_awesome"
      iconFill
      title={confidence != null ? `Best knowledge match: ${Math.round(confidence * 100)}%` : undefined}
    >
      {variant === 'agent' ? meta.agentLabel : meta.label}
    </Badge>
  );
};

export default Badge;
