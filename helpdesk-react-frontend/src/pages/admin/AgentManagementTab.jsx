import React, { useState, useRef } from 'react';
import CustomSelect from '../../components/CustomSelect';
import {
  UserCog, Search, RefreshCw, Loader2, ArrowRightLeft,
  X, CheckCircle2, Inbox, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, Maximize2, Minimize2,
  ChevronDown, ChevronUp, GripVertical, GripHorizontal, RotateCcw
} from 'lucide-react';

const AGENT_AVAILABILITY_OPTIONS = [
  { value: 'ONLINE', label: 'Online', description: 'Can receive new tickets.' },
  { value: 'AWAY', label: 'Away', description: 'Temporarily unavailable.' },
  { value: 'BUSY', label: 'Busy', description: 'Working, no new tickets.' },
  { value: 'ON_BREAK', label: 'On Break', description: 'Paused for break.' },
  { value: 'IN_MEETING', label: 'In Meeting', description: 'Unavailable in meeting.' },
  { value: 'TRAINING', label: 'Training', description: 'Unavailable for queue work.' },
  { value: 'IDLE', label: 'Idle', description: 'Inactive recently.' },
  { value: 'OFFLINE', label: 'Offline', description: 'Not working now.' },
];

const DEFAULT_LAYOUT = {
  leftWidth: 288,
  rightWidth: 320,
  leftCollapsed: false,
  rightCollapsed: false,
  middleMaximized: false,
  splitTopPercent: 50,
  reassignCollapsed: false,
  unassignedCollapsed: false,
};

const AgentManagementTab = ({
  agentStats,
  agentStatsLoading,
  fetchAgentStats,
  selectedAgentMgmt,
  selectAgentMgmt,
  agentTickets,
  agentTicketsLoading,
  agentTicketStatus,
  setAgentTicketStatus,
  agentTicketSearch,
  setAgentTicketSearch,
  agentTicketPriority,
  setAgentTicketPriority,
  agentTicketCategory,
  setAgentTicketCategory,
  unassignedTickets,
  unassignedLoading,
  fetchUnassignedTickets,
  unassignedSearch,
  setUnassignedSearch,
  unassignedStatus,
  setUnassignedStatus,
  unassignedPriority,
  setUnassignedPriority,
  unassignedCategory,
  setUnassignedCategory,
  selectedUnassignedIds,
  setSelectedUnassignedIds,
  reassignRequests,
  reassignRequestsLoading,
  fetchReassignRequests,
  selectedAssignees,
  setSelectedAssignees,
  reassignTicketId,
  setReassignTicketId,
  agentSearchQuery,
  setAgentSearchQuery,
  categories,
  handleAssignTicket,
  handleBulkAssign,
  handleResolveReassignRequest,
  handleAgentAvailabilityChange,
  getInitials,
  formatDate,
  getTicketNumber,
  getAgentLoad,
  getAvailabilityMeta
}) => {
  // Layout preferences persisted in localStorage
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem('aegis_agent_mgmt_layout_v2');
      return saved ? { ...DEFAULT_LAYOUT, ...JSON.parse(saved) } : DEFAULT_LAYOUT;
    } catch {
      return DEFAULT_LAYOUT;
    }
  });

  const updateLayout = (updater) => {
    setLayout(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      try {
        localStorage.setItem('aegis_agent_mgmt_layout_v2', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [resizing, setResizing] = useState(null); // 'left' | 'right' | 'horizontal' | null
  const rightColRef = useRef(null);

  const startResize = (type, e) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(type);
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = layout.leftWidth;
    const startRight = layout.rightWidth;
    const startSplit = layout.splitTopPercent;
    const rightHeight = rightColRef.current?.getBoundingClientRect().height || 500;

    const onMouseMove = (moveEvt) => {
      moveEvt.preventDefault();
      if (type === 'left') {
        const delta = moveEvt.clientX - startX;
        const newW = Math.max(180, Math.min(520, startLeft + delta));
        updateLayout(p => ({ ...p, leftWidth: newW, leftCollapsed: false, middleMaximized: false }));
      } else if (type === 'right') {
        const delta = startX - moveEvt.clientX;
        const newW = Math.max(220, Math.min(560, startRight + delta));
        updateLayout(p => ({ ...p, rightWidth: newW, rightCollapsed: false, middleMaximized: false }));
      } else if (type === 'horizontal') {
        const delta = moveEvt.clientY - startY;
        const deltaPct = (delta / rightHeight) * 100;
        const newPct = Math.max(15, Math.min(85, startSplit + deltaPct));
        updateLayout(p => ({ ...p, splitTopPercent: newPct, reassignCollapsed: false, unassignedCollapsed: false }));
      }
    };

    const onMouseUp = () => {
      setResizing(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = type === 'horizontal' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const isLeftCollapsed = layout.leftCollapsed || layout.middleMaximized;
  const isRightCollapsed = layout.rightCollapsed || layout.middleMaximized;

  return (
    <div 
      className="flex gap-2 h-full overflow-hidden anim-fade-in relative"
      style={{ userSelect: resizing ? 'none' : 'auto' }}
    >
      {/* ── PANEL 1: AGENT ROSTER ───────────────────────────────────── */}
      {isLeftCollapsed ? (
        <div 
          className="w-12 shrink-0 card flex flex-col items-center py-3 overflow-hidden transition-all duration-200"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => updateLayout({ leftCollapsed: false, middleMaximized: false })}
            className="p-1.5 rounded-lg text-muted hover:text-heading hover:bg-card cursor-pointer transition-colors"
            title="Expand Agents Roster"
          >
            <PanelLeftOpen size={15} style={{ color: 'var(--brand)' }} />
          </button>
          <div className="my-2.5 w-6 border-b border-subtle" />
          <div className="flex flex-col items-center gap-2 overflow-y-auto flex-1 w-full px-1">
            {agentStats.map(a => {
              const isSelected = selectedAgentMgmt?.agentId === a.agentId;
              const avail = getAvailabilityMeta(a.availabilityStatus, a.isActive);
              return (
                <div
                  key={a.agentId}
                  onClick={() => {
                    selectAgentMgmt(a);
                    updateLayout({ leftCollapsed: false, middleMaximized: false });
                  }}
                  className="relative cursor-pointer group"
                  title={`${a.name} (${a.category || 'General'}) - Click to view`}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all"
                    style={{
                      background: isSelected ? 'var(--brand-dim)' : 'var(--bg-input)',
                      color: isSelected ? 'var(--brand)' : 'var(--text-body)',
                      border: isSelected ? '1px solid var(--brand)' : '1px solid var(--border-subtle)'
                    }}
                  >
                    {getInitials(a.name)}
                  </div>
                  <span 
                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border"
                    style={{ background: avail.color, borderColor: 'var(--bg-card)' }}
                  />
                </div>
              );
            })}
          </div>
          <div className="pt-2 text-[9px] font-bold text-muted">
            {agentStats.length}
          </div>
        </div>
      ) : (
        <div 
          className="shrink-0 card flex flex-col overflow-hidden transition-all"
          style={{
            width: `${layout.leftWidth}px`,
            transition: resizing === 'left' ? 'none' : 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <UserCog size={14} style={{ color: 'var(--brand)' }} className="shrink-0" />
              <span className="text-xs font-bold truncate" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>Agents</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold shrink-0"
                style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                {agentStats.length}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {layout.leftWidth !== 288 && (
                <button 
                  onClick={() => updateLayout({ leftWidth: 288 })} 
                  className="p-1 rounded hover:bg-card cursor-pointer text-muted hover:text-heading" 
                  title="Reset column width (288px)"
                >
                  <RotateCcw size={11} />
                </button>
              )}
              <button onClick={fetchAgentStats} className="p-1 rounded hover:bg-card cursor-pointer text-muted hover:text-heading" title="Refresh agents">
                <RefreshCw size={12} />
              </button>
              <button 
                onClick={() => updateLayout({ leftCollapsed: true })} 
                className="p-1 rounded hover:bg-card cursor-pointer text-muted hover:text-heading"
                title="Collapse Agents panel (Gives more space to tickets)"
              >
                <PanelLeftClose size={13} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
              <Search size={11} style={{ color: 'var(--text-muted)' }} />
              <input className="flex-1 bg-transparent text-xs outline-none" placeholder="Search agents..."
                style={{ color: 'var(--text-body)' }}
                value={agentSearchQuery} onChange={e => setAgentSearchQuery(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {agentStatsLoading ? (
              <div className="flex items-center justify-center gap-2 py-10" style={{ color: 'var(--text-muted)' }}>
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : agentStats
                .filter(a => !agentSearchQuery || a.name?.toLowerCase().includes(agentSearchQuery.toLowerCase()))
                .map(agent => {
              const isSelected = selectedAgentMgmt?.agentId === agent.agentId;
              const load = getAgentLoad(agent);
              const loadColor = load > 5 ? 'var(--danger)' : load > 2 ? 'var(--warning)' : 'var(--brand)';
              const availability = getAvailabilityMeta(agent.availabilityStatus, agent.isActive);
              const lastAct = agent.lastActivity
                ? (() => { const diff = Date.now() - new Date(agent.lastActivity).getTime(); const m = Math.floor(diff/60000); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m/60)}h ago`; })()
                : 'No activity';
              return (
                <div key={agent.agentId}
                  onClick={() => selectAgentMgmt(agent)}
                  className="p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: isSelected ? 'var(--brand-dim)' : 'var(--bg-input)',
                    border: isSelected ? '1px solid color-mix(in srgb, var(--brand) 25%, transparent)' : '1px solid var(--border-subtle)',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-input)'; }}>

                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: 'var(--brand-dim)', color: 'var(--brand)' }}>
                        {getInitials(agent.name)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{ background: availability.color, borderColor: 'var(--bg-card)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-heading)' }}>{agent.name}</p>
                      {agent.category && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: 'color-mix(in srgb, var(--brand) 10%, transparent)', color: 'var(--brand)' }}>
                          {agent.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ color: availability.color, background: `color-mix(in srgb, ${availability.color} 9%, transparent)` }}>
                      {availability.label}
                    </span>
                    <span className="text-[9px] font-semibold" style={{ color: agent.assignable ? 'var(--brand)' : 'var(--text-disabled)' }}>
                      {load}/{agent.maxActiveTickets || 10} capacity
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-1 text-center">
                    {[['Open', agent.openTickets || 0, loadColor], ['Progress', agent.inProgressTickets || 0, 'var(--warning)'], ['Resolved', agent.resolvedTickets || 0, 'var(--brand)']].map(([lbl, val, col]) => (
                      <div key={lbl} className="rounded-lg py-1" style={{ background: 'color-mix(in srgb, var(--text-heading) 3%, transparent)' }}>
                        <p className="text-[11px] font-bold" style={{ color: col }}>{val}</p>
                        <p className="text-[9px]" style={{ color: 'var(--text-disabled)' }}>{lbl}</p>
                      </div>
                    ))}
                  </div>

                  {/* Activity row */}
                  <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--text-disabled)' }}>💬 </span>{agent.replyCount || 0} replies
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{lastAct}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SPLITTER 1: Between Left and Middle ────────────────────────── */}
      {!isLeftCollapsed && (
        <div
          onMouseDown={(e) => startResize('left', e)}
          onDoubleClick={() => updateLayout({ leftWidth: 288 })}
          title="Drag to resize Agents roster (Double-click to reset 288px)"
          className="group relative w-1.5 flex items-center justify-center cursor-col-resize shrink-0 select-none z-10 hover:w-2 transition-all -mx-0.5"
        >
          <div className={`w-0.5 h-full rounded-full transition-colors ${resizing === 'left' ? 'bg-success w-1' : 'bg-transparent group-hover:bg-success/60'}`} />
          <div className="absolute top-1/2 -translate-y-1/2 p-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
            <GripVertical size={10} className="text-muted" />
          </div>
        </div>
      )}

      {/* ── PANEL 2: AGENT'S TICKETS ─────────────────────────────────── */}
      <div className="flex-1 card flex flex-col overflow-hidden min-w-[280px] transition-all">
        {selectedAgentMgmt ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 flex flex-col gap-2.5" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              
              {/* Top Row: Title, Stats & Availability + Controls */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {isLeftCollapsed && (
                      <button
                        onClick={() => updateLayout({ leftCollapsed: false, middleMaximized: false })}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold bg-card border border-subtle text-muted hover:text-heading hover:border-brand cursor-pointer shrink-0 transition-colors"
                        title="Restore Agents roster"
                      >
                        <PanelLeftOpen size={12} style={{ color: 'var(--brand)' }} />
                        <span>Agents ({agentStats.length})</span>
                      </button>
                    )}
                    <h3 className="text-sm font-bold truncate" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-heading)' }}>
                      {selectedAgentMgmt.name}'s Tickets
                    </h3>
                    <CustomSelect
                      options={AGENT_AVAILABILITY_OPTIONS}
                      value={selectedAgentMgmt.availabilityStatus || 'OFFLINE'}
                      onChange={val => handleAgentAvailabilityChange(selectedAgentMgmt.agentId, val)}
                      placeholder="Availability"
                      className="!w-auto"
                      optionsClassName="!w-64 !left-0 !right-auto"
                      renderTrigger={(selectedOption) => {
                        const meta = getAvailabilityMeta(selectedOption?.value || 'OFFLINE', selectedAgentMgmt.isActive);
                        return (
                          <button
                            type="button"
                            className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-surface-container border border-outline-variant hover:bg-surface-container-high transition-colors cursor-pointer animate-none"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                            <span style={{ color: meta.color }}>{selectedOption?.label || 'Offline'}</span>
                            <span className="material-symbols-outlined text-[12px] text-on-surface-variant shrink-0">expand_more</span>
                          </button>
                        );
                      }}
                      renderOption={(opt, isSelected) => {
                        const meta = getAvailabilityMeta(opt.value);
                        return (
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: meta.color }} />
                            <div className="min-w-0">
                              <p className="font-semibold text-[10px]" style={{ color: isSelected ? 'var(--brand)' : 'var(--text-heading)' }}>{opt.label}</p>
                              <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{opt.description}</p>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {[['Total', selectedAgentMgmt.totalTickets || 0, 'var(--text-muted)'],
                      ['Open', selectedAgentMgmt.openTickets || 0, 'var(--danger)'],
                      ['In Progress', selectedAgentMgmt.inProgressTickets || 0, 'var(--warning)'],
                      ['Resolved', selectedAgentMgmt.resolvedTickets || 0, 'var(--brand)']
                    ].map(([lbl, val, col]) => (
                      <span key={lbl} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--bg-input)', color: col, border: '1px solid var(--border-subtle)' }}>
                        {val} {lbl}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right-aligned layout controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isRightCollapsed && (
                    <button
                      onClick={() => updateLayout({ rightCollapsed: false, middleMaximized: false })}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold bg-card border border-subtle text-muted hover:text-heading hover:border-brand cursor-pointer transition-colors"
                      title="Restore Queues panel"
                    >
                      <PanelRightOpen size={12} style={{ color: 'var(--brand)' }} />
                      <span>Queues ({reassignRequests.length + unassignedTickets.length})</span>
                    </button>
                  )}
                  <button
                    onClick={() => updateLayout(p => ({ ...p, middleMaximized: !p.middleMaximized }))}
                    className="p-1.5 rounded-lg border border-subtle bg-card hover:bg-card-hover text-muted hover:text-heading cursor-pointer transition-colors"
                    title={layout.middleMaximized ? "Restore standard multi-column view" : "Maximize tickets view (Expand across screen)"}
                  >
                    {layout.middleMaximized ? <Minimize2 size={13} style={{ color: 'var(--brand)' }} /> : <Maximize2 size={13} />}
                  </button>
                </div>
              </div>

              {/* Bottom Row: Ticket Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-2" style={{ borderTop: '1px solid color-mix(in srgb, var(--text-heading) 3%, transparent)' }}>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg flex-1 min-w-[150px]" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                  <Search size={11} style={{ color: 'var(--text-muted)' }} />
                  <input
                    className="bg-transparent text-[11px] outline-none w-full"
                    placeholder="Search tickets..."
                    style={{ color: 'var(--text-body)' }}
                    value={agentTicketSearch}
                    onChange={e => setAgentTicketSearch(e.target.value)}
                  />
                </div>
                <CustomSelect
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'OPEN', label: 'Open' },
                    { value: 'IN_PROGRESS', label: 'In Progress' },
                    { value: 'RESOLVED', label: 'Resolved' },
                    { value: 'CLOSED', label: 'Closed' }
                  ]}
                  value={agentTicketStatus}
                  onChange={val => setAgentTicketStatus(val)}
                  placeholder="All Statuses"
                  className="!w-auto"
                  triggerClassName="!bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-heading)] font-medium py-1.5 px-2.5 text-[11px] min-w-[110px]"
                />
                <CustomSelect
                  options={[{ value: '', label: 'All Priorities' }, 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(v => typeof v === 'string' ? { value: v, label: v } : v)}
                  value={agentTicketPriority}
                  onChange={setAgentTicketPriority}
                  className="!w-auto"
                  triggerClassName="!bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-heading)] font-medium py-1.5 px-2.5 text-[11px] min-w-[110px]"
                />
                <CustomSelect
                  options={[{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                  value={agentTicketCategory}
                  onChange={setAgentTicketCategory}
                  className="!w-auto"
                  triggerClassName="!bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-heading)] font-medium py-1.5 px-2.5 text-[11px] min-w-[120px]"
                />
              </div>
            </div>

            {/* Ticket list */}
            <div className="flex-1 overflow-auto">
              {agentTicketsLoading ? (
                <div className="flex items-center justify-center gap-2 py-16" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : agentTickets.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16" style={{ color: 'var(--text-muted)' }}>
                  <Inbox size={36} className="opacity-20" />
                  <p className="text-sm">No tickets for this filter</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse" style={{ fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {['Ticket', 'Customer', 'Priority', 'Status', 'Created', 'Reassign'].map(h => (
                        <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: 'var(--text-muted)', background: 'var(--bg-input)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agentTickets.map(t => {
                      const statusCfg = { OPEN: 'var(--brand)', IN_PROGRESS: 'var(--warning)', RESOLVED: 'var(--success)', CLOSED: 'var(--text-muted)' };
                      const priCfg = { URGENT: 'var(--danger)', HIGH: 'var(--warning)', MEDIUM: 'var(--warning)', LOW: 'var(--text-muted)' };
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td className="px-4 py-3" style={{ maxWidth: 220 }}>
                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-heading)' }} title={t.title}>{t.title}</p>
                            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--brand)' }}>{getTicketNumber(t)}</p>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{t.createdByName}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ color: priCfg[t.priority] || 'var(--text-muted)', background: `color-mix(in srgb, ${priCfg[t.priority] || 'var(--text-muted)'} 9%, transparent)` }}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ color: statusCfg[t.status] || 'var(--text-muted)', background: `color-mix(in srgb, ${statusCfg[t.status] || 'var(--text-muted)'} 9%, transparent)` }}>
                              {t.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDate(t.createdAt)}</td>
                          <td className="px-4 py-3">
                            {reassignTicketId === t.id ? (
                              <div className="flex items-center gap-1.5">
                                <CustomSelect
                                  options={[
                                    { value: '', label: 'Pick agent…' },
                                    ...agentStats
                                      .filter(a => a.agentId !== selectedAgentMgmt?.agentId && a.assignable)
                                      .map(a => ({
                                        value: a.agentId,
                                        label: `${a.name} (${getAgentLoad(a)}/${a.maxActiveTickets || 10})`
                                      }))
                                  ]}
                                  value=""
                                  onChange={val => { if (val) handleAssignTicket(t.id, val); }}
                                  placeholder="Pick agent…"
                                  className="!w-auto"
                                  triggerClassName="!bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-body)] py-1 px-1.5 text-[10px] max-w-[130px]"
                                  optionsClassName="!min-w-[180px] !right-0 !left-auto"
                                />
                                <button onClick={() => setReassignTicketId(null)} className="cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setReassignTicketId(t.id)}
                                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg cursor-pointer transition-all"
                                style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--brand) 30%, transparent)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}>
                                <ArrowRightLeft size={11} /> Reassign
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--text-muted)' }}>
            <UserCog size={40} className="opacity-20" />
            <p className="text-sm">Select an agent to view their tickets</p>
          </div>
        )}
      </div>

      {/* ── SPLITTER 2: Between Middle and Right ───────────────────────── */}
      {!isRightCollapsed && (
        <div
          onMouseDown={(e) => startResize('right', e)}
          onDoubleClick={() => updateLayout({ rightWidth: 320 })}
          title="Drag to resize Queue panels (Double-click to reset 320px)"
          className="group relative w-1.5 flex items-center justify-center cursor-col-resize shrink-0 select-none z-10 hover:w-2 transition-all -mx-0.5"
        >
          <div className={`w-0.5 h-full rounded-full transition-colors ${resizing === 'right' ? 'bg-success w-1' : 'bg-transparent group-hover:bg-success/60'}`} />
          <div className="absolute top-1/2 -translate-y-1/2 p-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
            <GripVertical size={10} className="text-muted" />
          </div>
        </div>
      )}

      {/* ── PANEL 3: REASSIGNMENTS & UNASSIGNED QUEUE ─────────────────── */}
      {isRightCollapsed ? (
        <div
          className="w-12 shrink-0 card flex flex-col items-center py-3 overflow-hidden transition-all duration-200"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => updateLayout({ rightCollapsed: false, middleMaximized: false })}
            className="p-1.5 rounded-lg text-muted hover:text-heading hover:bg-card cursor-pointer transition-colors"
            title="Expand Queue panels"
          >
            <PanelRightOpen size={15} style={{ color: 'var(--brand)' }} />
          </button>
          <div className="my-2.5 w-6 border-b border-subtle" />
          <div className="flex flex-col items-center gap-4 flex-1">
            <div
              onClick={() => updateLayout({ rightCollapsed: false, middleMaximized: false, reassignCollapsed: false })}
              className="flex flex-col items-center gap-1 cursor-pointer group"
              title="Pending Reassignments"
            >
              <ArrowRightLeft size={14} className="text-muted group-hover:text-heading" />
              {reassignRequests.length > 0 && (
                <span className="text-[9px] px-1 py-0.2 rounded-full font-bold bg-warning/20 text-warning-text border border-warning/30">
                  {reassignRequests.length}
                </span>
              )}
            </div>
            <div
              onClick={() => updateLayout({ rightCollapsed: false, middleMaximized: false, unassignedCollapsed: false })}
              className="flex flex-col items-center gap-1 cursor-pointer group"
              title="Unassigned Queue"
            >
              <Inbox size={14} className="text-muted group-hover:text-heading" />
              {unassignedTickets.length > 0 && (
                <span className="text-[9px] px-1 py-0.2 rounded-full font-bold bg-danger/20 text-danger-text border border-danger/30">
                  {unassignedTickets.length}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div 
          ref={rightColRef}
          className="shrink-0 flex flex-col gap-2 overflow-hidden h-full transition-all"
          style={{
            width: `${layout.rightWidth}px`,
            transition: resizing === 'right' ? 'none' : 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          
          {/* SUB-PANEL 3A: Pending Reassignments */}
          <div 
            className="card flex flex-col overflow-hidden transition-all"
            style={{
              height: layout.reassignCollapsed 
                ? 'auto' 
                : layout.unassignedCollapsed 
                  ? '100%' 
                  : `calc(${layout.splitTopPercent}% - 5px)`,
              minHeight: layout.reassignCollapsed ? 'auto' : '110px',
              transition: resizing === 'horizontal' ? 'none' : 'height 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-subtle bg-card/40">
              <div className="flex items-center gap-2 min-w-0">
                <ArrowRightLeft size={13} style={{ color: 'var(--brand)' }} className="shrink-0" />
                <span className="text-xs font-bold font-heading text-heading truncate">Reassignments</span>
                {reassignRequests.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
                    style={{ background: 'color-mix(in srgb, var(--warning) 12%, transparent)', color: 'var(--warning-text)' }}>
                    {reassignRequests.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!layout.reassignCollapsed && !layout.unassignedCollapsed && layout.splitTopPercent !== 50 && (
                  <button 
                    onClick={() => updateLayout({ splitTopPercent: 50 })} 
                    className="p-1 rounded hover:bg-card cursor-pointer text-muted hover:text-heading" 
                    title="Reset height split to 50/50"
                  >
                    <RotateCcw size={11} />
                  </button>
                )}
                <button onClick={fetchReassignRequests} className="p-1 rounded hover:bg-card cursor-pointer text-muted hover:text-heading" title="Refresh reassignments">
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={() => updateLayout(p => ({
                    ...p,
                    reassignCollapsed: !p.reassignCollapsed,
                    unassignedCollapsed: p.reassignCollapsed ? p.unassignedCollapsed : false
                  }))}
                  className="p-1 rounded hover:bg-card cursor-pointer text-muted hover:text-heading"
                  title={layout.reassignCollapsed ? "Expand Reassignments" : "Shrink Reassignments"}
                >
                  {layout.reassignCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                </button>
                <button 
                  onClick={() => updateLayout({ rightCollapsed: true })} 
                  className="p-1 rounded hover:bg-card cursor-pointer text-muted hover:text-heading"
                  title="Collapse Queues panel"
                >
                  <PanelRightClose size={13} />
                </button>
              </div>
            </div>

            {!layout.reassignCollapsed && (
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {reassignRequestsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8" style={{ color: 'var(--text-muted)' }}>
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                ) : reassignRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={24} className="opacity-25" style={{ color: 'var(--brand)' }} />
                    <p className="text-[11px] font-medium">Clear Queue!</p>
                    <p className="text-[9px]">No pending reassignments</p>
                  </div>
                ) : (
                  reassignRequests.map(req => {
                    const targetCat = req.targetCategoryName;
                    const groupMembers = agentStats.filter(a => a.assignable && targetCat && a.category === targetCat);
                    const otherAgents = agentStats.filter(a => a.assignable && (!targetCat || a.category !== targetCat));

                    return (
                      <div key={req.id} className="p-3 rounded-xl border border-subtle bg-input space-y-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-snug text-heading truncate" title={req.ticketTitle}>
                            {req.ticketTitle}
                          </p>
                          <p className="text-[9px] text-muted mt-0.5">
                            Requested by <strong className="text-heading font-medium">{req.requestedByName}</strong>
                          </p>
                          {req.targetCategoryName && (
                            <div className="flex items-center gap-1 mt-1 text-[9px] font-semibold text-brand">
                              <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                              <span>Target: {req.targetCategoryName}</span>
                            </div>
                          )}
                        </div>
                        
                        {req.reason && (
                          <p className="text-[10px] italic leading-normal p-2 rounded-lg bg-card/30 text-body font-medium">
                            "{req.reason}"
                          </p>
                        )}

                        {/* Direct Assign Options */}
                        <div className="text-[9px] space-y-1">
                          <span className="text-muted block font-semibold">Assign to Group Member (Optional):</span>
                          <CustomSelect
                            options={[
                              { value: '', label: 'None (Leave Unassigned)' },
                              ...(groupMembers.length > 0 ? [{ label: `--- Members of ${targetCat} ---`, disabled: true, value: '' }] : []),
                              ...groupMembers.map(a => ({
                                value: a.agentId,
                                label: `${a.name} (${getAgentLoad(a)}/${a.maxActiveTickets || 10})`
                              })),
                              ...(otherAgents.length > 0 ? [{ label: '--- Other Active Agents ---', disabled: true, value: '' }] : []),
                              ...otherAgents.map(a => ({
                                value: a.agentId,
                                label: `${a.name} (${a.category || 'No Cat'})`
                              }))
                            ]}
                            value={selectedAssignees[req.id] || ''}
                            onChange={val => setSelectedAssignees(prev => ({ ...prev, [req.id]: val }))}
                            placeholder="Select assignee..."
                            triggerClassName="!bg-[var(--bg-card)] !border-[var(--border-subtle)] !text-[var(--text-body)] py-1 px-1.5 text-[10px]"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-subtle/50">
                          <button
                            onClick={() => handleResolveReassignRequest(req.id, true, selectedAssignees[req.id])}
                            className="flex-1 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider text-center cursor-pointer transition-all border border-success/20 bg-success/10 text-success-text hover:bg-success/20"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleResolveReassignRequest(req.id, false)}
                            className="flex-1 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider text-center cursor-pointer transition-all border border-danger/20 bg-danger/10 text-danger-text hover:bg-danger/20"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* HORIZONTAL SPLITTER: Between 3A and 3B */}
          {!layout.reassignCollapsed && !layout.unassignedCollapsed && (
            <div
              onMouseDown={(e) => startResize('horizontal', e)}
              onDoubleClick={() => updateLayout({ splitTopPercent: 50 })}
              title="Drag to resize Reassignments vs Unassigned height (Double-click to reset 50%)"
              className="group relative h-1.5 flex items-center justify-center cursor-row-resize shrink-0 select-none z-10 hover:h-2 transition-all -my-0.5"
            >
              <div className={`h-0.5 w-full rounded-full transition-colors ${resizing === 'horizontal' ? 'bg-success h-1' : 'bg-transparent group-hover:bg-success/60'}`} />
              <div className="absolute left-1/2 -translate-x-1/2 p-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
                <GripHorizontal size={10} className="text-muted" />
              </div>
            </div>
          )}

          {/* SUB-PANEL 3B: Assign Unassigned Tickets */}
          <div 
            className="card flex flex-col overflow-hidden transition-all"
            style={{
              height: layout.unassignedCollapsed 
                ? 'auto' 
                : layout.reassignCollapsed 
                  ? '100%' 
                  : `calc(${100 - layout.splitTopPercent}% - 5px)`,
              minHeight: layout.unassignedCollapsed ? 'auto' : '110px',
              transition: resizing === 'horizontal' ? 'none' : 'height 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-subtle bg-card/40">
              <div className="flex items-center gap-2 min-w-0">
                <Inbox size={13} style={{ color: 'var(--brand)' }} className="shrink-0" />
                <span className="text-xs font-bold font-heading text-heading truncate">Unassigned</span>
                {unassignedTickets.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
                    style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger-text)' }}>
                    {unassignedTickets.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={fetchUnassignedTickets} className="p-1 rounded hover:bg-card cursor-pointer text-muted hover:text-heading" title="Refresh unassigned tickets">
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={() => updateLayout(p => ({
                    ...p,
                    unassignedCollapsed: !p.unassignedCollapsed,
                    reassignCollapsed: p.unassignedCollapsed ? p.reassignCollapsed : false
                  }))}
                  className="p-1 rounded hover:bg-card cursor-pointer text-muted hover:text-heading"
                  title={layout.unassignedCollapsed ? "Expand Unassigned" : "Shrink Unassigned"}
                >
                  {layout.unassignedCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                </button>
              </div>
            </div>

            {!layout.unassignedCollapsed && (
              <>
                <div className="px-3 py-2 border-b border-subtle space-y-2 bg-card/30">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-input border border-subtle">
                    <Search size={11} className="text-muted" />
                    <input
                      className="flex-1 bg-transparent text-[11px] outline-none text-body"
                      placeholder="Search ID, title, customer..."
                      value={unassignedSearch}
                      onChange={e => setUnassignedSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CustomSelect
                      options={[{ value: '', label: 'All Statuses' }, { value: 'OPEN', label: 'Open' }, { value: 'IN_PROGRESS', label: 'In Progress' }, { value: 'RESOLVED', label: 'Resolved' }, { value: 'CLOSED', label: 'Closed' }]}
                      value={unassignedStatus}
                      onChange={setUnassignedStatus}
                      triggerClassName="!bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-body)] py-1.5 px-2 text-[10px]"
                    />
                    <CustomSelect
                      options={[{ value: '', label: 'All Priorities' }, 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(v => typeof v === 'string' ? { value: v, label: v } : v)}
                      value={unassignedPriority}
                      onChange={setUnassignedPriority}
                      triggerClassName="!bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-body)] py-1.5 px-2 text-[10px]"
                    />
                  </div>
                  <CustomSelect
                    options={[{ value: '', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                    value={unassignedCategory}
                    onChange={setUnassignedCategory}
                    triggerClassName="!bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-body)] py-1.5 px-2 text-[10px]"
                  />
                </div>

                {unassignedTickets.length > 0 && (
                  <div className="px-3 py-2 border-b border-subtle flex flex-col gap-1.5 bg-card/40">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          className="rounded border-subtle bg-input text-brand focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                          checked={unassignedTickets.length > 0 && selectedUnassignedIds.length === unassignedTickets.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUnassignedIds(unassignedTickets.map(t => t.id));
                            } else {
                              setSelectedUnassignedIds([]);
                            }
                          }}
                        />
                        Select All
                      </label>
                      {selectedUnassignedIds.length > 0 && (
                        <span className="text-[9px] font-bold text-brand uppercase tracking-wider">
                          {selectedUnassignedIds.length} selected
                        </span>
                      )}
                    </div>
                    {selectedUnassignedIds.length > 0 && (
                      <div className="pt-1.5 border-t border-dashed border-subtle">
                        <CustomSelect
                          options={[
                            { value: '', label: 'Bulk assign to agent…' },
                            ...agentStats
                              .filter(a => a.assignable)
                              .map(a => ({
                                value: a.agentId,
                                label: `${a.name} (${getAgentLoad(a)}/${a.maxActiveTickets || 10})`
                              }))
                          ]}
                          value=""
                          onChange={val => { if (val) handleBulkAssign(val); }}
                          placeholder="Bulk assign to agent…"
                          triggerClassName="!bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-body)] py-1.5 px-2 text-[10px]"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-grow overflow-y-auto p-2 space-y-2">
                  {unassignedLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10" style={{ color: 'var(--text-muted)' }}>
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  ) : unassignedTickets.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10" style={{ color: 'var(--text-muted)' }}>
                      <CheckCircle2 size={28} className="opacity-30" style={{ color: 'var(--brand)' }} />
                      <p className="text-xs">All tickets are assigned!</p>
                    </div>
                  ) : unassignedTickets.map(t => {
                    const priColor = { URGENT: 'var(--danger)', HIGH: 'var(--warning)', MEDIUM: 'var(--warning)', LOW: 'var(--text-muted)' }[t.priority] || 'var(--text-muted)';
                    const isChecked = selectedUnassignedIds.includes(t.id);
                    return (
                      <div key={t.id} className={`p-3 rounded-xl transition-all border ${isChecked ? 'border-brand bg-brand-dim ring-1 ring-brand' : 'border-subtle bg-input'}`}>
                        <div className="flex items-start gap-2.5 mb-2">
                          <input 
                            type="checkbox" 
                            className="mt-0.5 rounded border-subtle bg-input text-brand focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0 w-3.5 h-3.5"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUnassignedIds(prev => [...prev, t.id]);
                              } else {
                                setSelectedUnassignedIds(prev => prev.filter(id => id !== t.id));
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-xs font-semibold leading-snug text-heading truncate">{t.title}</p>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                                style={{ color: priColor, background: `color-mix(in srgb, ${priColor} 9%, transparent)` }}>
                                {t.priority}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted">
                              <span className="font-mono text-brand">{getTicketNumber(t)}</span> · by {t.createdByName} · {formatDate(t.createdAt)}
                            </p>
                          </div>
                        </div>
                        {!isChecked && (
                          <CustomSelect
                            options={[
                              { value: '', label: 'Assign to agent…' },
                              ...agentStats
                                .filter(a => a.assignable)
                                .map(a => ({
                                  value: a.agentId,
                                  label: `${a.name} (${getAgentLoad(a)}/${a.maxActiveTickets || 10})`
                                }))
                            ]}
                            value=""
                            onChange={val => { if (val) handleAssignTicket(t.id, val); }}
                            placeholder="Assign to agent…"
                            triggerClassName="!bg-[var(--bg-card)] !border-[var(--border-subtle)] !text-[var(--text-body)] py-1.5 px-2 text-[10px]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default AgentManagementTab;
