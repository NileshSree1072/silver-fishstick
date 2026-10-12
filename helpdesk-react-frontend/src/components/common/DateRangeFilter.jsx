import React, { useState } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosInstance';

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7d',    days: 7 },
  { label: '30d',   days: 30 },
  { label: 'Custom', days: null },
];

const EVENT_TYPES = [
  'CREATED','ASSIGNED','REASSIGNED','FIRST_REPLY','REPLY_SENT',
  'TRANSFERRED','STATUS_CHANGED','RESOLVED','CLOSED','BREACHED','LATE_ASSIGNED',
];

const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'];

export default function DateRangeFilter({
  onChange,
  showAgentFilter    = false,
  showUserFilter     = false,
  showEventTypeFilter = false,
  showCategoryFilter  = false,
  showPriorityFilter  = false,
}) {
  const [preset, setPreset]         = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [agentId, setAgentId]       = useState('');
  const [userId, setUserId]         = useState('');
  const [eventType, setEventType]   = useState('');
  const [category, setCategory]     = useState('');
  const [priority, setPriority]     = useState('');

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-list'],
    queryFn: () => axiosInstance.get('/api/admin/agents').then(r => r.data),
    enabled: showAgentFilter,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => axiosInstance.get('/api/admin/categories').then(r => r.data),
    enabled: showCategoryFilter,
  });

  const computeDates = (p, cf, ct) => {
    const now = new Date();
    if (p === 'Today')  return { from: startOfDay(now), to: endOfDay(now) };
    if (p === '7d')     return { from: subDays(now, 7), to: now };
    if (p === '30d')    return { from: subDays(now, 30), to: now };
    if (p === 'Custom') return { from: cf ? new Date(cf) : subDays(now, 30), to: ct ? new Date(ct) : now };
    return { from: subDays(now, 30), to: now };
  };

  const emit = (overrides = {}) => {
    const base = computeDates(preset, customFrom, customTo);
    onChange({
      ...base,
      agentId: agentId || undefined,
      userId: userId || undefined,
      eventType: eventType || undefined,
      category: category || undefined,
      priority: priority || undefined,
      ...overrides,
    });
  };

  const handlePreset = (p) => {
    setPreset(p);
    const base = computeDates(p, customFrom, customTo);
    onChange({
      ...base,
      agentId: agentId || undefined,
      userId: userId || undefined,
      eventType: eventType || undefined,
      category: category || undefined,
      priority: priority || undefined,
    });
  };

  const inputCls = "text-xs rounded-lg px-3 py-1.5 border outline-none transition-colors cursor-pointer";
  const inputStyle = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-heading)',
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 p-3 rounded-xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Date range presets */}
      <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.label)}
            className="px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer"
            style={{
              background: preset === p.label ? 'var(--brand)' : 'transparent',
              color: preset === p.label ? '#fff' : 'var(--text-muted)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {preset === 'Custom' && (
        <>
          <input
            type="datetime-local"
            className={inputCls}
            style={inputStyle}
            value={customFrom}
            onChange={e => { setCustomFrom(e.target.value); emit({ from: e.target.value ? new Date(e.target.value) : undefined }); }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>→</span>
          <input
            type="datetime-local"
            className={inputCls}
            style={inputStyle}
            value={customTo}
            onChange={e => { setCustomTo(e.target.value); emit({ to: e.target.value ? new Date(e.target.value) : undefined }); }}
          />
        </>
      )}

      {/* Agent filter */}
      {showAgentFilter && (
        <select
          className={inputCls}
          style={inputStyle}
          value={agentId}
          onChange={e => { setAgentId(e.target.value); emit({ agentId: e.target.value || undefined }); }}
        >
          <option value="">All Agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      )}

      {/* Event type filter */}
      {showEventTypeFilter && (
        <select
          className={inputCls}
          style={inputStyle}
          value={eventType}
          onChange={e => { setEventType(e.target.value); emit({ eventType: e.target.value || undefined }); }}
        >
          <option value="">All Events</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      )}

      {/* Priority filter */}
      {showPriorityFilter && (
        <select
          className={inputCls}
          style={inputStyle}
          value={priority}
          onChange={e => { setPriority(e.target.value); emit({ priority: e.target.value || undefined }); }}
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      )}

      {/* Category filter */}
      {showCategoryFilter && (
        <select
          className={inputCls}
          style={inputStyle}
          value={category}
          onChange={e => { setCategory(e.target.value); emit({ category: e.target.value || undefined }); }}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
    </div>
  );
}
