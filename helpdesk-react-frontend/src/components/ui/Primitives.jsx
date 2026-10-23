import React from 'react';
import { getInitials } from '../../utils/ticketMeta';

export const Kbd = ({ children }) => <kbd className="kbd">{children}</kbd>;

export const Avatar = ({ name, ai = false, size = 28, className = '' }) => (
  <div
    className={`rounded-full shrink-0 grid place-items-center font-semibold border ${
      ai ? 'bg-ai-soft text-ai border-ai-border' : 'bg-surface-container-high text-on-surface-variant border-outline-variant'
    } ${className}`}
    style={{ width: size, height: size, fontSize: Math.round(size * 0.37) }}
  >
    {ai ? <span className="material-symbols-outlined icon-fill" style={{ fontSize: Math.round(size * 0.55) }}>auto_awesome</span> : getInitials(name)}
  </div>
);

export const Skeleton = ({ className = '', style }) => <div className={`skeleton ${className}`} style={style} />;

// Placeholder rows shaped like the content that is loading
export const SkeletonList = ({ rows = 4, variant = 'ticket' }) => (
  <div aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      variant === 'message' ? (
        <div key={i} className="flex gap-3 px-1 py-3">
          <Skeleton className="w-7 h-7 !rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-2.5" style={{ width: `${22 + (i % 3) * 6}%` }} />
            <Skeleton className="h-14 !rounded-lg" style={{ width: `${70 + (i % 2) * 18}%` }} />
          </div>
        </div>
      ) : (
        <div key={i} className="px-4 py-3 border-b border-outline-variant space-y-2">
          <Skeleton className="h-2.5" style={{ width: `${30 + (i % 3) * 8}%` }} />
          <Skeleton className="h-3" style={{ width: `${65 + (i % 2) * 20}%` }} />
          <Skeleton className="h-2.5" style={{ width: `${42 + (i % 3) * 7}%` }} />
        </div>
      )
    ))}
  </div>
);

// Explains why a list is empty and offers the next step
export const EmptyState = ({ icon = 'inbox', iconClassName = '', title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center text-center px-6 py-10 ${className}`}>
    <div className="w-11 h-11 rounded-[10px] grid place-items-center mb-3 bg-surface-container-low border border-outline-variant shadow-[var(--shadow-xs)] text-on-surface-variant">
      <span className={`material-symbols-outlined !text-[22px] ${iconClassName}`}>{icon}</span>
    </div>
    {title && <h4 className="text-sm font-semibold text-on-surface mb-1">{title}</h4>}
    {description && <p className="text-[13px] text-on-surface-variant max-w-[280px] mb-4 leading-relaxed">{description}</p>}
    {action}
  </div>
);

// Section header + body used throughout the copilot and side panels
export const Card = ({ icon, title, actions, children, className = '', bodyClassName = '' }) => (
  <section className={`rounded-[10px] border border-outline-variant bg-surface-container-low shadow-[var(--shadow-xs)] ${className}`}>
    {(title || actions) && (
      <header className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        {icon && <span className="material-symbols-outlined !text-[16px] text-on-surface-variant">{icon}</span>}
        <h3 className="flex-1 min-w-0 text-[12.5px] font-semibold text-on-surface truncate">{title}</h3>
        {actions}
      </header>
    )}
    <div className={`px-3 pb-3 text-[13px] ${bodyClassName}`}>{children}</div>
  </section>
);
