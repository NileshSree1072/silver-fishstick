import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../../context/AuthContext';
import FormattedMessage from '../../../components/FormattedMessage';
import { calculateSla } from '../../../components/SLAIndicator';
import { AiSourceList } from '../../../components/thread/MessageItem';
import { Card, EmptyState, Kbd, Skeleton } from '../../../components/ui/Primitives';
import { PRIORITY_META, SENTIMENT_META, STATUS_META, getShortTicketNumber } from '../../../utils/ticketMeta';

const TONE_TEXT = { danger: 'text-danger-text', warning: 'text-warning-text', success: 'text-success-text', neutral: 'text-on-surface' };
const TONE_DOT = { danger: 'var(--danger)', warning: 'var(--warning)', success: 'var(--success)', neutral: 'var(--text-disabled)' };

const SkeletonLines = ({ lines = 3 }) => (
  <div className="space-y-2 py-1">
    {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className="h-2.5" style={{ width: `${92 - i * 14}%` }} />)}
  </div>
);

const Unavailable = ({ onRetry }) => (
  <div className="flex items-center gap-2 text-[12.5px] text-on-surface-variant">
    <span className="material-symbols-outlined !text-[17px] text-warning">schedule</span>
    <span className="flex-1">Copilot is temporarily unavailable.</span>
    {onRetry && <button type="button" onClick={onRetry} className="btn btn-ghost btn-sm">Retry</button>}
  </div>
);

const Votes = ({ value, onVote }) => (
  <span className="flex items-center">
    {[true, false].map(helpful => (
      <button
        key={String(helpful)}
        type="button"
        onClick={() => onVote(helpful)}
        aria-pressed={value === helpful}
        aria-label={helpful ? 'Helpful' : 'Not helpful'}
        title={helpful ? 'Helpful' : 'Not helpful'}
        className={`icon-btn !w-7 !h-7 ${value === helpful ? (helpful ? '!text-success' : '!text-danger') : ''}`}
      >
        <span className={`material-symbols-outlined !text-[16px] ${value === helpful ? 'icon-fill' : ''}`}>{helpful ? 'thumb_up' : 'thumb_down'}</span>
      </button>
    ))}
  </span>
);

const Stat = ({ label, children, meter, meterColor }) => (
  <div className="px-2.5 py-2 min-w-0">
    <div className="text-[11.5px] text-on-surface-variant">{label}</div>
    <div className="mt-0.5 text-[13px] font-semibold text-on-surface truncate flex items-center gap-1.5 tabular-nums">{children}</div>
    {meter != null && (
      <div className="h-1 rounded-full bg-surface-container-high overflow-hidden mt-1.5">
        <div className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, meter))}%`, background: meterColor }} />
      </div>
    )}
  </div>
);

const InsightsCard = ({ ticket, sla, insights, onRefresh, onApplyPriority, vote, onVote }) => {
  const slaInfo = sla || calculateSla(ticket);
  const closed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const slaColor = slaInfo?.status === 'BREACHED' ? 'var(--danger)' : slaInfo?.status === 'WARNING' ? 'var(--warning)' : 'var(--success)';
  const slaText = closed ? (slaInfo?.status === 'BREACHED' ? 'Missed' : 'Met')
    : slaInfo?.status === 'BREACHED' ? 'Breached'
    : slaInfo?.hoursRemaining >= 48 ? `${Math.floor(slaInfo.hoursRemaining / 24)}d left` : `${slaInfo?.hoursRemaining ?? '—'}h left`;
  const slaMeter = !closed && slaInfo?.resolutionHours ? (slaInfo.hoursRemaining / slaInfo.resolutionHours) * 100 : null;

  const data = insights.data;
  const sentiment = data ? SENTIMENT_META[data.sentiment] || SENTIMENT_META.NEUTRAL : null;
  const suggestion = data?.suggestedPriority && data.suggestedPriority !== ticket.priority ? data.suggestedPriority : null;

  return (
    <Card
      icon="insights"
      title="Insights"
      actions={
        <span className="flex items-center">
          {data && <Votes value={vote} onVote={onVote} />}
          <button type="button" onClick={onRefresh} className="icon-btn !w-7 !h-7" aria-label="Refresh insights" title="Refresh">
            <span className={`material-symbols-outlined !text-[16px] ${insights.status === 'loading' ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-px rounded-lg overflow-hidden border border-outline-variant bg-[var(--border-subtle)] [&>*]:bg-surface-container-low">
        <Stat label="Sentiment">
          {insights.status === 'loading' ? <Skeleton className="h-3 w-16" />
            : sentiment ? <span className={`flex items-center gap-1.5 ${TONE_TEXT[sentiment.tone]}`}><span className="w-1.5 h-1.5 rounded-full" style={{ background: TONE_DOT[sentiment.tone] }} />{sentiment.label}</span>
            : <span className="text-on-surface-variant font-normal">—</span>}
        </Stat>
        <Stat label="Customer deadline">
          {insights.status === 'loading' ? <Skeleton className="h-3 w-20" />
            : data?.deadline ? <span className="text-warning-text truncate" title={data.deadline}>{data.deadline}</span>
            : <span className="text-on-surface-variant font-normal">None mentioned</span>}
        </Stat>
        <Stat label="SLA" meter={slaMeter} meterColor={slaColor}>
          <span className={slaInfo?.status === 'BREACHED' ? 'text-danger-text' : slaInfo?.status === 'WARNING' ? 'text-warning-text' : ''}>{slaText}</span>
        </Stat>
        <Stat label="Best KB match" meter={ticket.aiConfidence != null ? ticket.aiConfidence * 100 : null} meterColor="var(--brand)">
          {ticket.aiConfidence != null ? `${Math.round(ticket.aiConfidence * 100)}%` : <span className="text-on-surface-variant font-normal">—</span>}
        </Stat>
      </div>

      {insights.status === 'error' && <div className="mt-2.5"><Unavailable onRetry={onRefresh} /></div>}

      {suggestion && (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-2.5 py-2 text-[12.5px]">
          <span className="material-symbols-outlined !text-[17px] text-ai">lightbulb</span>
          <span className="flex-1 min-w-0">
            Set priority to <b className="text-on-surface font-semibold">{PRIORITY_META[suggestion]?.label}</b>
            {data.priorityReason && <span className="block text-on-surface-variant truncate" title={data.priorityReason}>{data.priorityReason}</span>}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onApplyPriority(suggestion)}>Apply</button>
        </div>
      )}
    </Card>
  );
};

const SummaryCard = ({ summary, onSummarize, vote, onVote }) => (
  <Card
    icon="notes"
    title="Summary"
    actions={summary.status === 'ready' && (
      <button type="button" onClick={onSummarize} className="icon-btn !w-7 !h-7" aria-label="Regenerate summary" title="Regenerate">
        <span className="material-symbols-outlined !text-[16px]">refresh</span>
      </button>
    )}
  >
    {summary.status === 'idle' && (
      <div className="flex items-center gap-3">
        <p className="flex-1 text-[12.5px] text-on-surface-variant">Get a short recap of the problem, what's been tried, and what's still open.</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onSummarize}>Summarize</button>
      </div>
    )}
    {summary.status === 'loading' && <SkeletonLines lines={4} />}
    {summary.status === 'error' && <Unavailable onRetry={onSummarize} />}
    {summary.status === 'ready' && (
      <>
        <p className="text-[13px] leading-relaxed text-on-surface">{summary.text}</p>
        <div className="flex items-center justify-end mt-1 -mb-1"><Votes value={vote} onVote={onVote} /></div>
      </>
    )}
  </Card>
);

const DraftCard = ({ draft, onGenerate, onUse, vote, onVote, onOpenArticle }) => (
  <Card
    icon="edit_square"
    title="Suggested reply"
    actions={draft.status === 'ready' && draft.sources.length > 0 && (
      <span className="inline-flex items-center rounded-md border border-ai-border bg-ai-soft px-1.5 text-[11px] font-medium text-ai leading-[18px]">
        {draft.sources.length} source{draft.sources.length > 1 ? 's' : ''}
      </span>
    )}
  >
    {draft.status === 'idle' && (
      <div className="flex items-center gap-3">
        <p className="flex-1 text-[12.5px] text-on-surface-variant">Draft a reply grounded in your knowledge base and past tickets.</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onGenerate} title="Shortcut: G then D">Generate</button>
      </div>
    )}
    {draft.status === 'loading' && <SkeletonLines lines={5} />}
    {draft.status === 'error' && <Unavailable onRetry={onGenerate} />}
    {draft.status === 'ready' && (
      <>
        <div className="border-l-2 border-ai pl-3 max-h-[260px] overflow-y-auto">
          <FormattedMessage content={draft.text} className="text-[13px] text-on-surface" />
        </div>
        <AiSourceList
          sources={draft.sources}
          label={null}
          onOpenArticle={onOpenArticle}
          emptyLabel="No matching articles or past tickets — based on the conversation only."
        />
        <div className="flex items-center gap-1.5 mt-3">
          <button type="button" className="btn btn-primary btn-sm" onClick={onUse}>Use reply</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onGenerate}>
            <span className="material-symbols-outlined !text-[15px]">refresh</span>Regenerate
          </button>
          <span className="ml-auto"><Votes value={vote} onVote={onVote} /></span>
        </div>
      </>
    )}
  </Card>
);

const SimilarCard = ({ similar, linkedIds, onLink, onOpenTicket }) => (
  <Card icon="stacks" title="Similar tickets">
    {similar.status === 'loading' && <SkeletonLines lines={3} />}
    {similar.status !== 'loading' && similar.items.length === 0 && (
      <p className="text-[12.5px] text-on-surface-variant">No similar tickets found.</p>
    )}
    {similar.items.map((t, i) => {
      const meta = STATUS_META[t.status] || STATUS_META.OPEN;
      const linked = linkedIds.has(t.id);
      return (
        <div key={t.id} className={`flex items-center gap-2.5 py-2 ${i ? 'border-t border-outline-variant' : ''}`}>
          <span className="font-mono text-[11.5px] text-on-surface-variant w-8 shrink-0 tabular-nums">{Math.round(t.score * 100)}%</span>
          <button type="button" onClick={() => onOpenTicket(t)} className="flex-1 min-w-0 text-left cursor-pointer group">
            <span className="block text-[13px] font-medium text-on-surface truncate group-hover:underline">{t.title}</span>
            <span className="flex items-center gap-1.5 text-[11.5px] text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
              {meta.label}{t.assignedToName ? ` · ${t.assignedToName}` : ''} · {getShortTicketNumber(t)}
            </span>
          </button>
          {linked
            ? <span className="text-[11.5px] text-on-surface-variant flex items-center gap-0.5"><span className="material-symbols-outlined !text-[14px]">link</span>Linked</span>
            : <button type="button" className="btn btn-secondary btn-sm !px-2" onClick={() => onLink(t.id)} title="Link as duplicate">
                <span className="material-symbols-outlined !text-[15px]">link</span>Link
              </button>}
        </div>
      );
    })}
  </Card>
);

const LinkedCard = ({ ticketId, linked, onLink, onUnlink, onBulkResolve, onOpenTicket }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  const search = async (q) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get('/api/tickets/search', { params: { q: q.trim(), page: 0, size: 8 } });
      const linkedIds = new Set(linked.map(l => l.id));
      setResults((res.data?.content || []).filter(t => t.id !== ticketId && !linkedIds.has(t.id)));
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const link = async (t) => {
    setLinking(true);
    await onLink(t.id);
    setLinking(false);
    setQuery(''); setResults([]);
  };

  return (
    <Card
      icon="link"
      title={`Linked tickets${linked.length ? ` (${linked.length})` : ''}`}
      actions={linked.length > 0 && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBulkResolve} title="Resolve this ticket and all linked tickets">Resolve all</button>
      )}
    >
      {linked.map(lt => (
        <div key={lt.id} className="flex items-center gap-2 py-1.5 border-b border-outline-variant last:border-b-0">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: (STATUS_META[lt.status] || STATUS_META.OPEN).dot }} />
          <button type="button" onClick={() => onOpenTicket(lt)} className="flex-1 min-w-0 text-left text-[13px] text-on-surface truncate hover:underline cursor-pointer">{lt.title}</button>
          <button type="button" onClick={() => onUnlink(lt.id)} className="icon-btn !w-6 !h-6" aria-label={`Unlink ${lt.title}`} title="Unlink">
            <span className="material-symbols-outlined !text-[15px]">link_off</span>
          </button>
        </div>
      ))}
      <div className="relative mt-2">
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 !text-[16px] text-on-surface-variant">add_link</span>
        <input
          className="field !py-1.5 !pl-8 !text-[12.5px]"
          placeholder="Link another ticket…"
          value={query}
          onChange={e => search(e.target.value)}
          aria-label="Search tickets to link"
        />
        {(searching || linking) && <Loader2 size={14} className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />}
        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 p-1 max-h-48 overflow-y-auto rounded-lg border border-outline-variant bg-popover shadow-[var(--shadow-lg)] z-20">
            {results.map(t => (
              <button key={t.id} type="button" onClick={() => link(t)} className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-surface-container-high cursor-pointer">
                <span className="block text-[13px] text-on-surface truncate">{t.title}</span>
                <span className="block text-[11.5px] text-on-surface-variant">{STATUS_META[t.status]?.label} · {getShortTicketNumber(t)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

/**
 * Right panel of the agent workspace.
 */
const CopilotPanel = ({
  ticket, sla, insights, summary, draft, similar, linked, votes,
  onRefreshInsights, onApplyPriority, onSummarize, onGenerateDraft, onUseDraft, onVote,
  onLink, onUnlink, onBulkResolve, onOpenTicket, onOpenArticle, onCollapse,
}) => (
  <div className="flex flex-col h-full min-h-0 bg-surface-container">
    <div className="flex items-center gap-2 px-4 h-[52px] border-b border-outline-variant bg-surface-container-low shrink-0">
      <span className="material-symbols-outlined icon-fill !text-[18px] text-ai">auto_awesome</span>
      <h2 className="flex-1 text-[14px] font-semibold text-on-surface">Copilot</h2>
      {onCollapse && (
        <button type="button" onClick={onCollapse} className="icon-btn hidden lg:inline-flex" aria-label="Collapse Copilot" title="Collapse">
          <span className="material-symbols-outlined !text-[18px]">right_panel_close</span>
        </button>
      )}
    </div>
    <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
      {!ticket ? (
        <EmptyState icon="auto_awesome" title="Copilot" description="Open a ticket to see insights, a summary and a suggested reply." />
      ) : (
        <>
          <InsightsCard ticket={ticket} sla={sla} insights={insights} onRefresh={onRefreshInsights} onApplyPriority={onApplyPriority} vote={votes.INSIGHTS} onVote={h => onVote('INSIGHTS', h)} />
          <SummaryCard summary={summary} onSummarize={onSummarize} vote={votes.SUMMARY} onVote={h => onVote('SUMMARY', h)} />
          <DraftCard draft={draft} onGenerate={onGenerateDraft} onUse={onUseDraft} vote={votes.DRAFT} onVote={h => onVote('DRAFT', h)} onOpenArticle={onOpenArticle} />
          <SimilarCard similar={similar} linkedIds={new Set(linked.map(l => l.id))} onLink={onLink} onOpenTicket={onOpenTicket} />
          <LinkedCard ticketId={ticket.id} linked={linked} onLink={onLink} onUnlink={onUnlink} onBulkResolve={onBulkResolve} onOpenTicket={onOpenTicket} />
          <p className="flex items-center justify-center gap-1 text-[11.5px] text-on-surface-variant/80 pt-1"><Kbd>G</Kbd><Kbd>D</Kbd> generate a reply</p>
        </>
      )}
    </div>
  </div>
);

export default CopilotPanel;
