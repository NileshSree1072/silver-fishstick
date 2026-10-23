import React, { useEffect, useRef, useState } from 'react';
import CustomSelect from '../../../components/CustomSelect';
import { calculateSla } from '../../../components/SLAIndicator';
import { AiFeedbackBadge, PriorityBars } from '../../../components/ui/Badge';
import { EmptyState, Kbd, SkeletonList } from '../../../components/ui/Primitives';
import { PRIORITY_META, STATUS_META, timeAgo } from '../../../utils/ticketMeta';

const SCOPES = [
  { id: 'my', label: 'Mine' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'all', label: 'All' },
];

export const isAtRisk = (ticket) => {
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') return false;
  const sla = calculateSla(ticket);
  return sla?.status === 'WARNING' || sla?.status === 'BREACHED';
};

const SlaLabel = ({ ticket }) => {
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') return null;
  const sla = calculateSla(ticket);
  if (!sla) return null;
  const h = sla.hoursRemaining;
  const text = sla.status === 'BREACHED' ? 'Breached' : h >= 48 ? `${Math.floor(h / 24)}d left` : h < 1 ? '<1h left' : `${h}h left`;
  const tone = sla.status === 'BREACHED' ? 'text-danger-text font-medium' : sla.status === 'WARNING' ? 'text-warning-text' : 'text-on-surface-variant';
  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums ${tone}`} title="Time left to meet the resolution SLA">
      <span className="material-symbols-outlined !text-[13px]">schedule</span>{text}
    </span>
  );
};

const TicketRow = ({ ticket, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(ticket)}
    data-selected={selected}
    className={`relative w-full text-left px-4 py-3 border-b border-outline-variant cursor-pointer transition-colors ${
      selected ? 'bg-brand-soft' : 'hover:bg-surface-container-high'
    }`}
  >
    {selected && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
    <div className="flex items-center gap-1.5 text-[12px] text-on-surface-variant">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: (STATUS_META[ticket.status] || STATUS_META.OPEN).dot }} title={STATUS_META[ticket.status]?.label} />
      <span className="font-medium text-on-surface-variant truncate flex-1">{ticket.createdByName || 'Unknown customer'}</span>
      <span className="tabular-nums text-[11.5px]">{timeAgo(ticket.updatedAt || ticket.createdAt)}</span>
    </div>
    <p className="text-[13.5px] font-medium text-on-surface truncate mt-0.5 mb-1.5">{ticket.title}</p>
    <div className="flex items-center gap-2 flex-wrap text-[11.5px]">
      <PriorityBars priority={ticket.priority} />
      <SlaLabel ticket={ticket} />
      <AiFeedbackBadge feedback={ticket.aiFeedback} />
      {!ticket.assignedToName && <span className="text-on-surface-variant">Unassigned</span>}
    </div>
  </button>
);

/**
 * Left panel of the agent workspace: scope tabs, quick filters, and the ticket list.
 */
const TicketQueue = ({
  tickets, visibleTickets, loading, selectedId, onSelect, onRefresh,
  scope, onScopeChange, quickFilter, onQuickFilterChange,
  statusFilter, onStatusFilterChange, priorityFilter, onPriorityFilterChange,
  categoryFilter, onCategoryFilterChange, categories,
  search, onSearchChange, searchRef, onCollapse,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const listRef = useRef(null);

  const riskCount = tickets.filter(isAtRisk).length;
  const rejectedCount = tickets.filter(t => t.aiFeedback === 'REJECTED').length;
  const activeFilterCount = [statusFilter !== 'ACTIVE', !!priorityFilter, !!categoryFilter].filter(Boolean).length;

  useEffect(() => {
    listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const clearFilters = () => {
    onQuickFilterChange(null);
    onStatusFilterChange('ACTIVE');
    onPriorityFilterChange('');
    onCategoryFilterChange('');
    onSearchChange('');
  };

  const quickChip = (id, label, count) => (
    <button
      type="button"
      onClick={() => onQuickFilterChange(quickFilter === id ? null : id)}
      aria-pressed={quickFilter === id}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[12px] font-medium cursor-pointer transition-colors ${
        quickFilter === id
          ? 'bg-brand-soft border-brand-border text-on-primary-container'
          : 'border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
      }`}
    >
      {label}<span className="tabular-nums opacity-70">{count}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-3.5 pb-3 border-b border-outline-variant space-y-3">
        <div className="flex items-center gap-1">
          <h2 className="flex-1 text-[15px] font-semibold text-on-surface">Inbox</h2>
          <button type="button" onClick={() => setShowFilters(s => !s)} className={`icon-btn relative ${showFilters ? '!bg-surface-container-high !text-on-surface' : ''}`} aria-label="Filters" aria-expanded={showFilters} title="Filters">
            <span className="material-symbols-outlined !text-[18px]">tune</span>
            {activeFilterCount > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
          <button type="button" onClick={onRefresh} className="icon-btn" aria-label="Refresh" title="Refresh">
            <span className="material-symbols-outlined !text-[18px]">refresh</span>
          </button>
          {onCollapse && (
            <button type="button" onClick={onCollapse} className="icon-btn hidden lg:inline-flex" aria-label="Collapse inbox" title="Collapse">
              <span className="material-symbols-outlined !text-[18px]">left_panel_close</span>
            </button>
          )}
        </div>

        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 !text-[17px] text-on-surface-variant">search</span>
          <input
            ref={searchRef}
            className="field !py-1.5 !pl-8 !pr-8 !text-[13px]"
            placeholder="Search tickets"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && e.currentTarget.blur()}
            aria-label="Search tickets"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"><Kbd>/</Kbd></span>
        </div>

        <div className="flex p-0.5 rounded-lg bg-surface-container-high border border-outline-variant" role="tablist" aria-label="Queue">
          {SCOPES.map(s => (
            <button
              key={s.id}
              role="tab"
              aria-selected={scope === s.id}
              onClick={() => onScopeChange(s.id)}
              className={`flex-1 py-1 rounded-md text-[12.5px] font-medium cursor-pointer transition-colors ${
                scope === s.id ? 'bg-surface-container-low text-on-surface shadow-[var(--shadow-xs)]' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {quickChip('risk', 'At risk', riskCount)}
          {quickChip('ai-rejected', 'AI rejected', rejectedCount)}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-2 pt-1 anim-slide-down-fade">
            <CustomSelect
              options={[
                { value: 'ACTIVE', label: 'Open & in progress' },
                { value: '', label: 'All statuses' },
                ...Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label })),
              ]}
              value={statusFilter}
              onChange={onStatusFilterChange}
              triggerClassName="pl-3 pr-8 py-1.5 text-[12.5px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <CustomSelect
                options={[{ value: '', label: 'Any priority' }, ...Object.entries(PRIORITY_META).map(([value, m]) => ({ value, label: m.label }))]}
                value={priorityFilter}
                onChange={onPriorityFilterChange}
                triggerClassName="pl-3 pr-8 py-1.5 text-[12.5px]"
              />
              <CustomSelect
                options={[{ value: '', label: 'Any category' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                value={categoryFilter}
                onChange={onCategoryFilterChange}
                triggerClassName="pl-3 pr-8 py-1.5 text-[12.5px]"
              />
            </div>
          </div>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
        {loading && tickets.length === 0 ? (
          <SkeletonList rows={6} />
        ) : visibleTickets.length === 0 ? (
          tickets.length === 0 && !search && activeFilterCount === 0 && scope === 'my' ? (
            <EmptyState
              icon="task_alt"
              iconClassName="text-success"
              title="You're all caught up"
              description="No open tickets are assigned to you right now."
              action={<button type="button" className="btn btn-secondary btn-sm" onClick={() => onScopeChange('unassigned')}>View unassigned</button>}
            />
          ) : (
            <EmptyState
              icon="search_off"
              title="No tickets match"
              description={search ? `Nothing matches “${search}” with the current filters.` : 'Nothing matches the current filters.'}
              action={<button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear filters</button>}
            />
          )
        ) : (
          visibleTickets.map(t => (
            <TicketRow key={t.id} ticket={t} selected={selectedId === t.id} onSelect={onSelect} />
          ))
        )}
      </div>

      <div className="hidden lg:flex items-center gap-3 px-4 py-2 border-t border-outline-variant bg-surface-container text-[11.5px] text-on-surface-variant">
        <span className="flex items-center gap-1"><Kbd>J</Kbd><Kbd>K</Kbd> navigate</span>
        <span className="flex items-center gap-1"><Kbd>R</Kbd> reply</span>
        <button type="button" className="flex items-center gap-1 cursor-pointer hover:text-on-surface" onClick={() => window.dispatchEvent(new Event('aegis:show-shortcuts'))}>
          <Kbd>?</Kbd> all shortcuts
        </button>
      </div>
    </div>
  );
};

export default TicketQueue;
