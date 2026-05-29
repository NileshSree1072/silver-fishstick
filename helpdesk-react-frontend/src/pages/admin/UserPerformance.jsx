import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { Users, Loader2, X, Star } from 'lucide-react';
import { getAllUserMetrics, getUserMetrics } from '../../api/performanceApi';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

const getInitials = (n) => n ? n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) : '?';

const QualityBadge = ({ score }) => {
  if (score >= 4) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.25)' }}>
      <Star size={9} /> {score.toFixed(1)}
    </span>
  );
  if (score >= 2) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
      <Star size={9} /> {score.toFixed(1)}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)' }}>
      <Star size={9} /> {score.toFixed(1)}
    </span>
  );
};

function UserDetailModal({ userId, filters, onClose }) {
  const { data: m, isLoading } = useQuery({
    queryKey: ['user-metrics-detail', userId, filters],
    queryFn: () => getUserMetrics(userId, filters.from, filters.to),
    enabled: !!userId,
  });

  if (isLoading) return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
    </div>,
    document.body
  );

  if (!m) return null;

  const rows = [
    { label: 'Total Tickets Submitted', value: m.totalTicketsSubmitted, accent: 'var(--brand)' },
    { label: 'Avg Response Time', value: `${Math.round(m.avgResponseTimeMinutes)}m`, accent: '#4cd7f6' },
    { label: 'Repeat Issues (30d)', value: m.repeatIssueCount, accent: '#f59e0b' },
    { label: 'Avg Rating Given', value: m.avgSatisfactionGiven.toFixed(1) + ' / 5', accent: '#f59e0b' },
    { label: 'Auto-Closed Tickets', value: m.autoClosedCount, accent: '#64748b' },
    { label: 'Ticket Quality Score', value: m.ticketQualityScore.toFixed(1) + ' / 5', accent: '#00c896' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-end"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <div className="h-full w-full max-w-md flex flex-col anim-slide-in-right overflow-y-auto"
        style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xl)' }}>

        <div className="flex items-center justify-between px-6 py-4 sticky top-0"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>
            {m.userName}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {rows.map(({ label, value, accent }) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="text-sm font-bold" style={{ color: accent }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Footer Close Button */}
        <div className="p-6 flex justify-end mt-auto"
          style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-body)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function UserPerformance() {
  const [filters, setFilters] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [page, setPage]       = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: result, isLoading, isError } = useQuery({
    queryKey: ['all-user-metrics', filters, page],
    queryFn: () => getAllUserMetrics(filters.from, filters.to, page, 20),
  });

  if (isError) toast.error('Failed to load user performance data');

  const users      = result?.content || [];
  const totalPages = result?.totalPages || 1;

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
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(76,215,246,0.12)', border: '1px solid rgba(76,215,246,0.2)' }}>
          <Users size={16} style={{ color: '#4cd7f6' }} />
        </div>
        <div>
          <h1 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>
            User Activity
          </h1>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Ticket quality and engagement metrics per user</p>
        </div>
      </div>

      <div className="shrink-0">
        <DateRangeFilter onChange={f => { setFilters(f); setPage(0); }} />
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                {['User', 'Total Tickets', 'Avg Response Time', 'Repeat Issues', 'Avg Rating Given', 'Ticket Quality', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  No users found for this period
                </td></tr>
              ) : users.map(u => (
                <tr
                  key={u.userId}
                  style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setSelectedUser(u)}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
                        {getInitials(u.userName)}
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>{u.userName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-heading)' }}>{u.totalTicketsSubmitted}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{Math.round(u.avgResponseTimeMinutes)}m</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: u.repeatIssueCount > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: u.repeatIssueCount > 0 ? 700 : 400 }}>
                      {u.repeatIssueCount}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: 600 }}>
                    {u.avgSatisfactionGiven.toFixed(1)} ★
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <QualityBadge score={u.ticketQualityScore} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button className="text-xs px-3 py-1 rounded-lg cursor-pointer font-semibold"
                      style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid rgba(79,70,229,0.2)' }}>
                      Details
                    </button>
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

      {selectedUser && (
        <UserDetailModal userId={selectedUser.userId} filters={filters} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}
