import React, { useState, useEffect, useCallback } from 'react';
import { Kbd } from '../ui/Primitives';
import {
  LayoutDashboard,
  Search,
  Users,
  UserCog,
  BookOpen,
  Clock,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 'dashboard',
    tab: 'dashboard',
    targetSelector: '#tour-nav-dashboard',
    title: 'Dashboard Overview',
    badge: '1/8',
    icon: LayoutDashboard,
    iconColor: '#3e5fd8',
    arrowSide: 'left',
    description: 'Track real-time KPIs: ticket volume, open and in-progress queues, CSAT rating, and live activity streams.',
    highlights: [
      'Live metric cards update in real time',
      'CSAT customer satisfaction scoring'
    ],
    shortcutTip: { keys: ['Ctrl', 'K'], label: 'Global command menu' }
  },
  {
    id: 'command-palette',
    tab: 'dashboard',
    targetSelector: '#tour-search-bar',
    title: 'Command Palette',
    badge: '2/8',
    icon: Search,
    iconColor: '#6e56cf',
    arrowSide: 'top',
    description: 'Jump to any ticket by ID or name, switch console views, or toggle themes with zero mouse clicks.',
    highlights: [
      'Omnisearch across all queues',
      'Toggle Dark / Light themes instantly'
    ],
    shortcutTip: { keys: ['Ctrl', 'K'], label: 'Press Ctrl+K anytime' }
  },
  {
    id: 'agents',
    tab: 'agents',
    targetSelector: '#tour-nav-agents',
    title: 'Agent Management',
    badge: '3/8',
    icon: Users,
    iconColor: '#12b76a',
    arrowSide: 'left',
    description: 'Supervise agent presence (Online, Away, Busy), balance ticket loads, and bulk-assign backlog tickets.',
    highlights: [
      'Live agent availability status',
      'Reassignment approval workflows'
    ],
    shortcutTip: { keys: ['Tab'], label: 'Cycle through agent cards' }
  },
  {
    id: 'users',
    tab: 'users',
    targetSelector: '#tour-nav-users',
    title: 'User Directory',
    badge: '4/8',
    icon: UserCog,
    iconColor: '#f79009',
    arrowSide: 'left',
    description: 'Onboard support agents, assign category specialties, and manage roles (Admin, Agent, Customer).',
    highlights: [
      'One-click agent provisioning',
      'Instant account status toggles'
    ],
    shortcutTip: { keys: ['?'], label: 'View keyboard shortcuts' }
  },
  {
    id: 'articles',
    tab: 'articles',
    targetSelector: '#tour-nav-articles',
    title: 'KB Approvals',
    badge: '5/8',
    icon: BookOpen,
    iconColor: '#3e5fd8',
    arrowSide: 'left',
    description: 'Review help center articles drafted by agents. Preview markdown and approve for customer publishing.',
    highlights: [
      'Agent drafts review queue',
      'Full markdown live preview'
    ],
    shortcutTip: { keys: ['Esc'], label: 'Dismiss preview modals' }
  },
  {
    id: 'sla',
    tab: 'sla',
    targetSelector: '#tour-nav-sla',
    title: 'SLA Rules & Policies',
    badge: '6/8',
    icon: Clock,
    iconColor: '#d92d20',
    arrowSide: 'left',
    description: 'Set maximum response and resolution time targets by ticket priority and configure automated escalation alerts.',
    highlights: [
      'Priority-based response limits',
      'Automated breach escalation'
    ],
    shortcutTip: { keys: ['Ctrl', 'K'], label: 'Jump to SLA configuration' }
  },
  {
    id: 'audit-logs',
    tab: 'audit-log',
    targetSelector: '#tour-nav-audit-log',
    title: 'Audit & Compliance',
    badge: '7/8',
    icon: ShieldCheck,
    iconColor: '#6e56cf',
    arrowSide: 'left',
    description: 'Tamper-evident logs of all ticket state changes, priority shifts, SLA breach events, and reassignments.',
    highlights: [
      'Complete immutable audit trail',
      'Breach and transfer logs'
    ],
    shortcutTip: { keys: ['/'], label: 'Search and filter logs' }
  },
  {
    id: 'shortcuts-summary',
    tab: 'dashboard',
    targetSelector: '#tour-nav-dashboard',
    title: 'Shortcuts & Pro Tips',
    badge: '8/8',
    icon: Sparkles,
    iconColor: '#f79009',
    arrowSide: 'left',
    description: 'You\'re all set! Use Ctrl+K for search, ? for shortcuts, and click Help anytime to revisit this tour.',
    highlights: [
      'Ctrl+K: Omnisearch & navigation',
      '?: Full keyboard reference'
    ],
    shortcutTip: { keys: ['?'], label: 'Open full shortcuts modal', actionType: 'open-shortcuts' }
  }
];

export default function AdminTourModal({
  isOpen,
  onClose,
  activeTab,
  setActiveTab
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [initialTab, setInitialTab] = useState(activeTab || 'dashboard');
  const [targetRect, setTargetRect] = useState(null);
  const [arrowSide, setArrowSide] = useState('left');
  const [popoverPos, setPopoverPos] = useState({ top: 120, left: 260 });

  // When tour opens, remember starting tab and reset to step 0
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setInitialTab(activeTab || 'dashboard');
    }
  }, [isOpen]);

  // Synchronize active tab with the step's associated tab
  useEffect(() => {
    if (isOpen && setActiveTab) {
      const step = TOUR_STEPS[currentStepIndex];
      if (step && step.tab && step.tab !== activeTab) {
        setActiveTab(step.tab);
      }
    }
  }, [isOpen, currentStepIndex, setActiveTab]);

  // Recalculate target position smoothly
  const updatePosition = useCallback(() => {
    if (!isOpen) return;
    const step = TOUR_STEPS[currentStepIndex];
    if (!step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      const popoverWidth = 330;
      const popoverHeight = 290;
      let top = rect.top;
      let left = rect.right + 14;
      let side = step.arrowSide || 'left';

      if (side === 'top' || step.targetSelector === '#tour-search-bar') {
        top = rect.bottom + 10;
        left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, rect.left));
        side = 'top';
      } else {
        // Position directly to the right of the tab, vertically aligned with it
        top = rect.top + rect.height / 2 - 40;
        top = Math.max(16, Math.min(window.innerHeight - popoverHeight - 16, top));
        left = Math.min(window.innerWidth - popoverWidth - 16, rect.right + 14);
      }

      setPopoverPos({ top, left });
      setArrowSide(side);
    } else {
      setTargetRect(null);
      setPopoverPos({ top: 100, left: 260 });
      setArrowSide('left');
    }
  }, [isOpen, currentStepIndex]);

  useEffect(() => {
    updatePosition();
    // Allow slight delay for DOM tab changes if layout shifted
    const timer = setTimeout(updatePosition, 60);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [updatePosition]);

  const handleClose = useCallback(() => {
    if (setActiveTab && initialTab) {
      setActiveTab(initialTab);
    }
    onClose();
  }, [onClose, setActiveTab, initialTab]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleClose();
    }
  }, [currentStepIndex, handleClose]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // Keyboard navigation for tour
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleClose]);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;

  return (
    <>
      {/* Target element spotlight highlight (NO background blur) */}
      {targetRect && (
        <div
          className="fixed pointer-events-none z-[96] rounded-lg transition-all duration-300 ease-out border-2 border-primary shadow-[0_0_14px_rgba(62,95,216,0.6)]"
          style={{
            top: targetRect.top - 2,
            left: targetRect.left - 2,
            width: targetRect.width + 4,
            height: targetRect.height + 4,
          }}
        >
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
        </div>
      )}

      {/* Floating Tour Box (Compact, anchored close to the target tab, zero blur) */}
      <div
        className="fixed z-[98] transition-all duration-300 ease-out"
        style={{
          top: `${popoverPos.top}px`,
          left: `${popoverPos.left}px`,
          width: '330px',
        }}
      >
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Admin Tour Step"
          className="relative rounded-xl border border-outline-variant bg-popover shadow-[var(--shadow-xl)] overflow-hidden flex flex-col anim-scale-up"
          style={{ border: '1px solid var(--border-medium)' }}
        >
          {/* Arrow pointing directly to the target tab or search bar */}
          {arrowSide === 'left' && (
            <div
              className="absolute -left-2 top-8 w-3.5 h-3.5 rotate-45 bg-popover border-l border-b border-outline-variant"
              style={{ borderLeftColor: 'var(--border-medium)', borderBottomColor: 'var(--border-medium)' }}
            />
          )}
          {arrowSide === 'top' && (
            <div
              className="absolute -top-2 left-6 w-3.5 h-3.5 rotate-45 bg-popover border-t border-l border-outline-variant"
              style={{ borderTopColor: 'var(--border-medium)', borderLeftColor: 'var(--border-medium)' }}
            />
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-outline-variant bg-surface-container-low">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 shadow-xs"
                style={{
                  background: `color-mix(in srgb, ${currentStep.iconColor} 16%, transparent)`,
                  color: currentStep.iconColor
                }}
              >
                <StepIcon size={14} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                    {currentStep.badge}
                  </span>
                  <h3 className="text-[12.5px] font-semibold text-on-surface truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                    {currentStep.title}
                  </h3>
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="icon-btn !w-6 !h-6 text-on-surface-variant hover:text-on-surface cursor-pointer shrink-0 ml-1"
              title="Close tour (Esc)"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-3.5 space-y-2.5 text-[12px] text-on-surface">
            <p className="leading-relaxed text-on-surface">
              {currentStep.description}
            </p>

            {/* Highlights bullets */}
            <div className="rounded-lg bg-surface-container-low border border-outline-variant/70 p-2 space-y-1.5">
              {currentStep.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11.5px] text-on-surface-variant">
                  <CheckCircle2 size={13} className="text-success mt-0.5 shrink-0" />
                  <span className="leading-snug">{h}</span>
                </div>
              ))}
            </div>

            {/* Shortcut hint */}
            {currentStep.shortcutTip && (
              <div className="flex items-center justify-between gap-1.5 pt-0.5 px-1 text-[11px] text-on-surface-variant">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-primary">Tip:</span>
                  <span>{currentStep.shortcutTip.label}</span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {currentStep.shortcutTip.keys.map(k => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="px-3.5 py-2 border-t border-outline-variant bg-surface-container-low flex items-center justify-between gap-2">
            {/* Step indicator dots */}
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`transition-all rounded-full cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-4 h-1.5 bg-primary'
                      : 'w-1.5 h-1.5 bg-outline-variant hover:bg-outline'
                  }`}
                  title={`Step ${idx + 1}: ${s.title}`}
                  aria-label={`Step ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="btn btn-secondary !py-1 !px-2 text-[11.5px] flex items-center gap-0.5 cursor-pointer"
                >
                  <ChevronLeft size={13} />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="btn btn-primary !py-1 !px-2.5 text-[11.5px] font-medium flex items-center gap-0.5 cursor-pointer"
              >
                <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
