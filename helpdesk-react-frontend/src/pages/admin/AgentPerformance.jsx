import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { formatDistanceToNow, format } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Award, Clock, Zap, ShieldCheck, ShieldAlert, AlertTriangle, X, Loader2 } from 'lucide-react';
import { getAllAgentMetrics, getAgentMetrics } from '../../api/performanceApi';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

const getInitials = (n) => n ? n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) : '?';

const SLABadge = ({ rate }) => {
  if (rate >= 95) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.25)' }}>
      <ShieldCheck size={10} /> {rate.toFixed(1)}%
    </span>
  );
  if (rate >= 80) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
      <AlertTriangle size={10} /> {rate.toFixed(1)}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)' }}>
      <ShieldAlert size={10} /> {rate.toFixed(1)}%
    </span>
  );
};

const MetricCard = ({ label, value, sub, accent }) => (
  <div className="flex flex-col gap-1 p-4 rounded-xl"
    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span className="text-2xl font-black" style={{ color: accent, fontFamily: 'var(--font-heading)' }}>{value}</span>
    {sub && <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>{sub}</span>}
  </div>
);

function AgentDetailModal({ agentId, filters, onClose }) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['agent-metrics-detail', agentId, filters],
    queryFn: () => getAgentMetrics(agentId, filters.from, filters.to),
    enabled: !!agentId,
  });

  if (isLoading) return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
    </div>,
    document.body
  );

  if (!metrics) return null;

  const chartData = [
    { name: 'Assigned', value: metrics.totalAssigned },
    { name: 'Resolved', value: metrics.totalResolved },
    { name: 'Transferred', value: metrics.totalTransferredOut },
    { name: 'Late Assigned', value: metrics.lateAssignedCount },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-end"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
      <div className="h-full w-full max-w-2xl flex flex-col anim-slide-in-right overflow-y-auto"
        style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xl)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>
              {metrics.agentName}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{metrics.agentCategory || 'No category'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="SLA Compliance" value={`${metrics.slaComplianceRate.toFixed(1)}%`}
              sub={`${metrics.slaCompliantCount}/${metrics.slaEligibleCount} eligible`}
              accent={metrics.slaComplianceRate >= 95 ? '#00c896' : metrics.slaComplianceRate >= 80 ? '#f59e0b' : '#f43f5e'} />
            <MetricCard label="Resolution Rate" value={`${metrics.resolutionRate.toFixed(1)}%`}
              sub={`${metrics.totalResolved} resolved`} accent="var(--brand)" />
            <MetricCard label="Avg FRT" value={`${Math.round(metrics.avgFirstResponseMinutes)}m`}
              sub="First response time" accent="#4cd7f6" />
            <MetricCard label="Avg Handle Time" value={`${Math.round(metrics.avgHandleTimeMinutes / 60)}h`}
              sub="From assign to resolve" accent="#7c3aed" />
            <MetricCard label="Avg Rating" value={metrics.avgSatisfactionScore.toFixed(1)}
              sub="Out of 5.0" accent="#f59e0b" />
            <MetricCard label="Late Assigned" value={metrics.lateAssignedCount}
              sub="Excluded from SLA" accent="#f43f5e" />
          </div>

          {/* Bar chart */}
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Ticket Breakdown
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: 'var(--text-heading)' }}
                />
                <Bar dataKey="value" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Late assignment note */}
          {metrics.lateAssignedCount > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
              <ShieldAlert size={16} style={{ color: '#f43f5e', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#f43f5e' }}>
                  {metrics.lateAssignedCount} ticket{metrics.lateAssignedCount !== 1 ? 's' : ''} late-assigned
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  These tickets were assigned when less than 20% of the SLA window remained.
                  They are excluded from the SLA compliance calculation — system delay, not agent fault.
                </p>
              </div>
            </div>
          )}
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

export default function AgentPerformance() {
  const [filters, setFilters] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [selectedAgent, setSelectedAgent] = useState(null);

  const { data: agents = [], isLoading, isError } = useQuery({
    queryKey: ['all-agent-metrics', filters],
    queryFn: () => getAllAgentMetrics(filters.from, filters.to),
  });

  if (isError) toast.error('Failed to load agent performance data');

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
      {/* Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.2)' }}>
          <TrendingUp size={16} style={{ color: '#00c896' }} />
        </div>
        <div>
          <h1 className="text-base font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>
            Agent Performance
          </h1>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Fair SLA metrics — late-assigned tickets excluded
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="shrink-0">
        <DateRangeFilter onChange={setFilters} />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading metrics...</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                {['Agent', 'Category', 'Assigned', 'Resolved', 'Resolution %', 'Avg FRT', 'SLA Compliance', 'Late Assigned', 'Avg Rating', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  No agents found for this period
                </td></tr>
              ) : agents.map(a => (
                <tr
                  key={a.agentId}
                  style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setSelectedAgent(a)}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>
                        {getInitials(a.agentName)}
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>{a.agentName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{a.agentCategory || '—'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-heading)', fontWeight: 600 }}>{a.totalAssigned}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-heading)', fontWeight: 600 }}>{a.totalResolved}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: a.resolutionRate >= 80 ? '#00c896' : '#f59e0b', fontWeight: 700 }}>
                      {a.resolutionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {Math.round(a.avgFirstResponseMinutes)}m
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <SLABadge rate={a.slaComplianceRate} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      title="These tickets are excluded from SLA compliance calculation"
                      className="cursor-default"
                      style={{
                        color: a.lateAssignedCount > 0 ? '#f43f5e' : 'var(--text-muted)',
                        fontWeight: a.lateAssignedCount > 0 ? 700 : 400,
                      }}
                    >
                      {a.lateAssignedCount}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                      {'★'.repeat(Math.round(a.avgSatisfactionScore))} {a.avgSatisfactionScore.toFixed(1)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button className="text-xs px-3 py-1 rounded-lg cursor-pointer font-semibold transition-colors"
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

      {/* Detail modal */}
      {selectedAgent && (
        <AgentDetailModal
          agentId={selectedAgent.agentId}
          filters={filters}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
