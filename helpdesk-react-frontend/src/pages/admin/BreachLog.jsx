import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, format } from 'date-fns';
import { ShieldAlert, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { getBreachLog } from '../../api/performanceApi';
import DateRangeFilter from '../../components/common/DateRangeFilter';

const PRIORITY_COLORS = {
  URGENT: { bg: 'rgba(255,180,171,0.12)', color: '#ffb4ab', border: 'rgba(255,180,171,0.25)' },
  HIGH:   { bg: 'rgba(255,182,149,0.12)', color: '#ffb695', border: 'rgba(255,182,149,0.25)' },
  MEDIUM: { bg: 'rgba(195,192,255,0.12)', color: '#c3c0ff', border: 'rgba(195,192,255,0.25)' },
  LOW:    { bg: 'rgba(195,192,255,0.08)', color: '#c3c0ff', border: 'rgba(195,192,255,0.15)' },
};

const FaultBadge = ({ type }) => {
  if (type === 'SYSTEM') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
      <AlertTriangle size={9} /> SYSTEM
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)' }}>
      <ShieldAlert size={9} /> AGENT
    </span>
  );
};

const fmtTime = d => d ? format(new Date(d), 'MMM d, HH:mm') : '—';

export default function BreachLog() {
  const [filters, setFilters] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['breach-log', filters, page],
    queryFn: () => getBreachLog({ ...filters, page, size: 25 }),
  });

  const events      = data?.content || [];
  const totalPages  = data?.totalPages || 1;
  const totalEvents = data?.totalElements || 0;

  const agentBreaches = events.filter(e => e.faultType === 'AGENT').length;
  const systemBreaches = events.filter(e => e.faultType === 'SYSTEM').length;

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
            style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.2)' }}>
            <ShieldAlert size={16} style={{ color: '#f43f5e' }} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>
              SLA Breach Log
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Agent vs. System fault classification
            </p>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-lg font-semibold"
            style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}>
            {agentBreaches} Agent
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-lg font-semibold"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
            {systemBreaches} System
          </span>
        </div>
      </div>

      {/* Fair evaluation note */}
      <div className="shrink-0 flex items-center gap-3 p-3 rounded-xl"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <ShieldCheck size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: '#f59e0b' }}>SYSTEM</span> breaches occur
          when the agent was assigned with less than 20% of the SLA window remaining — not counted against agent performance.
          <span className="font-semibold ml-1" style={{ color: '#f43f5e' }}>AGENT</span> breaches are
          those where the agent had adequate time.
        </p>
      </div>

      {/* Filters */}
      <div className="shrink-0">
        <DateRangeFilter
          onChange={f => { setFilters(f); setPage(0); }}
          showAgentFilter
          showPriorityFilter
        />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading breach log...</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                {['Time', 'Ticket', 'Priority', 'Assigned Agent', 'Fault', 'Note'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  No SLA breaches found for this period 🎉
                </td></tr>
              ) : events.map(e => {
                const pc = PRIORITY_COLORS[e.priority] || PRIORITY_COLORS.MEDIUM;
                return (
                  <tr key={e.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {fmtTime(e.occurredAt)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className="font-semibold text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)' }}>
                        {e.ticketNumber || '—'}
                      </span>
                      <span className="block text-[11px] truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>
                        {e.ticketTitle}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {e.priority ? (
                        <span className="chip" style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>
                          {e.priority}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-heading)' }}>
                      {e.actorName || <span style={{ color: 'var(--text-disabled)' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {e.faultType ? <FaultBadge type={e.faultType} /> : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', maxWidth: 260 }}>
                      <span className="truncate block" title={e.note}>{e.note || '—'}</span>
                    </td>
                  </tr>
                );
              })}
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
