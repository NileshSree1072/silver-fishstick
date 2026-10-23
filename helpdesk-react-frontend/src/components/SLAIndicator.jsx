import React from 'react';

export function calculateSla(ticket, rules = []) {
  if (!ticket) return null;
  const priority = ticket.priority; // 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
  
  // Find rule or fallback
  const rule = rules.find(r => r.priority === priority) || {
    priority,
    resolutionHours: priority === 'URGENT' ? 4 : priority === 'HIGH' ? 12 : priority === 'MEDIUM' ? 24 : 72
  };
  
  const createdAt = new Date(ticket.createdAt);
  const deadline = new Date(createdAt.getTime() + rule.resolutionHours * 60 * 60 * 1000);
  const now = new Date();
  
  let status;
  let hoursRemaining = 0;
  
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    const completionTime = ticket.resolvedAt ? new Date(ticket.resolvedAt) : new Date(ticket.updatedAt);
    status = completionTime > deadline ? 'BREACHED' : 'OK';
  } else {
    if (now > deadline) {
      status = 'BREACHED';
      hoursRemaining = 0;
    } else {
      hoursRemaining = Math.max(0, Math.floor((deadline - now) / (1000 * 60 * 60)));
      status = hoursRemaining <= 2 ? 'WARNING' : 'OK';
    }
  }
  
  return { status, hoursRemaining, deadline, resolutionHours: rule.resolutionHours };
}

const SLAIndicator = ({ ticket, rules = [], slaInfo = null, showDetails = false }) => {
  // If slaInfo is passed directly, use it; otherwise compute it from ticket & rules.
  const info = slaInfo || calculateSla(ticket, rules);
  
  if (!info) return null;
  
  const { status, hoursRemaining } = info;
  
  let badgeClasses;
  let dotClasses;
  let statusLabel;
  let description;

  switch (status) {
    case 'BREACHED':
      badgeClasses = 'bg-danger/10 border border-danger/20 text-danger-text';
      dotClasses = 'bg-danger';
      statusLabel = 'Breached';
      description = 'Resolution deadline exceeded';
      break;
    case 'WARNING':
      badgeClasses = 'bg-warning/10 border border-warning/20 text-warning-text';
      dotClasses = 'bg-warning animate-pulse';
      statusLabel = 'Warning';
      description = `${hoursRemaining}h remaining`;
      break;
    case 'OK':
    default:
      badgeClasses = 'bg-success/10 border border-success/20 text-success-text';
      dotClasses = 'bg-success';
      statusLabel = 'OK';
      description = `${hoursRemaining}h remaining`;
      break;
  }

  if (showDetails) {
    return (
      <div className={`flex flex-col gap-1.5 p-3.5 rounded-xl border transition-all duration-200 ${
        status === 'BREACHED' 
          ? 'bg-danger/5 border-danger/10' 
          : status === 'WARNING' 
            ? 'bg-warning/5 border-warning/10' 
            : 'bg-success/5 border-success/10'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider uppercase opacity-80 text-on-surface-variant">SLA Resolution Status</span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${badgeClasses}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClasses}`}></span>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-end justify-between mt-1">
          <div>
            <p className="text-sm font-semibold text-on-surface">
              {status === 'BREACHED' ? 'Overdue (Breached)' : `${hoursRemaining} hours left`}
            </p>
            <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
              Deadline: {new Date(info.deadline).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">SLA Window</p>
            <p className="text-xs font-semibold text-on-surface">{info.resolutionHours || info.resolutionSLA}h</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeClasses}`} title={description}>
      <span className={`w-1 h-1 rounded-full ${dotClasses}`}></span>
      <span className="uppercase font-semibold tracking-wider">{status === 'BREACHED' ? 'Breached' : `${hoursRemaining}h left`}</span>
    </span>
  );
};

export default SLAIndicator;
