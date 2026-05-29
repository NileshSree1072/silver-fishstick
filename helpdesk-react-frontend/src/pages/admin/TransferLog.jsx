import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, format } from 'date-fns';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { getTransferLog } from '../../api/performanceApi';
import DateRangeFilter from '../../components/common/DateRangeFilter';

const SLAStatusBadge = ({ status }) => {
  if (!status) return <span style={{ color: 'var(--text-disabled)' }}>—</span>;
  if (status === 'OK' || status === 'SAFE') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.25)' }}>
      {status}
    </span>
  );
  if (status === 'AT_RISK' || status === 'WARNING') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
      {status}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)' }}>
      {status}
    </span>
  );
};

const fmtTime = d => d ? format(new Date(d), 'MMM d, HH:mm') : '—';

export default function TransferLog() {
  const [filters, setFilters] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['transfer-log', filters, page],
    queryFn: () => getTransferLog({ ...filters, page, size: 25 }),
  });

  const events     = data?.content || [];
  const totalPages = data?.totalPages || 1;
  const total      = data?.totalElements || 0;

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
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <ArrowLeftRight size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>
              Transfer Log
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Ticket handovers with SLA status at time of transfer
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
          {total} transfers
        </span>
      </div>

      {/* Filters */}
      <div className="shrink-0">
        <DateRangeFilter
          onChange={f => { setFilters(f); setPage(0); }}
          showAgentFilter
          showCategoryFilter
        />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading transfer log...</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                {['Time', 'Ticket', 'Priority', 'Transferred By', 'SLA at Transfer', 'Note'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  No transfers found for this period
                </td></tr>
              ) : events.map(e => (
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
                      <span className="chip chip-purple" style={{ fontSize: 9 }}>{e.priority}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-heading)', fontWeight: 500 }}>
                    {e.actorName || <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <SLAStatusBadge status={e.slaStatusAtTransfer} />
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-muted)', maxWidth: 260 }}>
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
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            ← Prev
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
