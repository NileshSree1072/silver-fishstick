import React from 'react';

/**
 * Where a ticket is in its lifecycle, from the customer's point of view.
 * Submitted → (AI answered) → With an agent → Resolved
 */
const buildSteps = (ticket) => {
  const resolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const agentName = ticket.assignedToName?.split(' ')[0];
  const steps = [{ id: 'submitted', label: 'Submitted' }];
  if (ticket.aiFeedback) steps.push({ id: 'ai', label: 'AI answered' });
  if (!(resolved && ticket.aiResolved)) {
    steps.push({ id: 'agent', label: agentName ? `With ${agentName}` : 'Waiting for an agent' });
  }
  steps.push({ id: 'resolved', label: ticket.status === 'CLOSED' ? 'Closed' : 'Resolved' });

  let current;
  if (resolved) current = steps.length; // everything done
  else if (ticket.aiFeedback === 'PENDING') current = steps.findIndex(s => s.id === 'ai');
  else current = steps.findIndex(s => s.id === 'agent');

  return { steps, current };
};

const ProgressTracker = ({ ticket }) => {
  const { steps, current } = buildSteps(ticket);
  return (
    <ol className="flex items-center mt-3" aria-label="Ticket progress">
      {steps.map((step, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <React.Fragment key={step.id}>
            {i > 0 && <li aria-hidden="true" className={`flex-1 h-[1.5px] mx-2 min-w-3 ${i <= current ? 'bg-primary' : 'bg-[var(--border-medium)]'}`} />}
            <li className={`flex items-center gap-1.5 text-[12.5px] whitespace-nowrap ${done ? 'text-on-surface-variant' : now ? 'text-on-surface font-semibold' : 'text-on-surface-variant/70'}`} aria-current={now ? 'step' : undefined}>
              <span
                className={`w-[18px] h-[18px] rounded-full grid place-items-center border-[1.5px] shrink-0 ${
                  done ? 'bg-primary border-primary text-white'
                    : now ? 'border-primary shadow-[0_0_0_3px_var(--brand-dim)]'
                    : 'border-[var(--border-medium)]'
                }`}
              >
                {done && <span className="material-symbols-outlined !text-[12px]">check</span>}
                {now && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </span>
              <span className={now ? '' : 'hidden sm:inline'}>{step.label}</span>
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
};

export default ProgressTracker;
