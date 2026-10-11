import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, format } from 'date-fns';
import { Activity, Loader2 } from 'lucide-react';
import { getTimeline } from '../../api/performanceApi';
import DateRangeFilter from '../../components/common/DateRangeFilter';

const EVENT_COLORS = {
  CREATED:        { bg: 'rgba(76,215,246,0.10)',  color: '#4cd7f6' },
  ASSIGNED:       { bg: 'rgba(79,70,229,0.12)',   color: '#c3c0ff' },
  REASSIGNED:     { bg: 'rgba(124,58,237,0.12)',  color: '#a78bfa' },
  FIRST_REPLY:    { bg: 'rgba(0,200,150,0.12)',   color: '#00c896' },
  REPLY_SENT:     { bg: 'rgba(0,200,150,0.08)',   color: '#34d399' },
  TRANSFERRED:    { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  STATUS_CHANGED: { bg: 'rgba(99,102,241,0.08)',  color: '#818cf8' },
  RESOLVED:       { bg: 'rgba(0,200,150,0.15)',   color: '#00c896' },
  CLOSED:         { bg: 'rgba(145,143,161,0.10)', color: '#918fa1' },
  BREACHED:       { bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e' },
  LATE_ASSIGNED:  { bg: 'rgba(251,146,60,0.12)',  color: '#fb923c' },
};

const EventChip = ({ type }) => {
  const c = EVENT_COLORS[type] || { bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' };
  return (
    <span className="chip" style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
      {(type || '').replace(/_/g, ' ')}
    </span>
  );
};

const fmtTime = (d) => d ? format(new Date(d), 'MMM d, HH:mm') : '—';

export default function TicketAuditLog() {
  const [filters, setFilters] = useState({ from: subDays(new Date(), 7), to: new Date() });
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['timeline', filters, page],
    queryFn: () => getTimeline({ ...filters, page, size: 25 }),
  });

  const events      = data?.content || [];
  const totalPages  = data?.totalPages || 1;
  const totalEvents = data?.totalElements || 0;

  const thStyle = {
    padding: '10px 16px',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    background: 'var(--bg-input)',
    whiteSpace: 'nowrap',
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden anim-fade-in" style={{ padding: '16px 20px' }}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Activity size={16} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>
              Ticket Audit Log
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Full timeline of all ticket lifecycle events
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
          {totalEvents.toLocaleString()} events
        </span>
      </div>

      {/* Filters */}
      <div className="shrink-0">
        <DateRangeFilter
          onChange={f => { setFilters(f); setPage(0); }}
          showAgentFilter
          showEventTypeFilter
        />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading audit log...</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                {['Time', 'Ticket', 'Event', 'Actor', 'Role', 'Note'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  No events found for this filter
                </td></tr>
              ) : events.map(e => (
                <tr key={e.id}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {fmtTime(e.occurredAt)}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {e.ticketNumber ? (
                      <div className="flex flex-col">
                        <span className="font-semibold text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)' }}>
                          {e.ticketNumber}
                        </span>
                        <span className="text-[11px] truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>
                          {e.ticketTitle}
                        </span>
                      </div>
                    ) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <EventChip type={e.eventType} />
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-heading)', fontWeight: 500 }}>
                    {e.actorName || <span style={{ color: 'var(--text-disabled)' }}>System</span>}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {e.actorRole ? (
                      <span className="chip chip-blue" style={{ fontSize: 9 }}>{e.actorRole}</span>
                    ) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-muted)', maxWidth: 280 }}>
                    <span className="truncate block" title={e.note}>{e.note || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 shrink-0">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            ← Prev
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page + 1} of {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
