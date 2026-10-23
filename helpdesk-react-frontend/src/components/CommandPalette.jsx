import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../context/AuthContext';
import { Kbd } from './ui/Primitives';
import { getShortTicketNumber } from '../utils/ticketMeta';

/**
 * Ctrl+K command menu: jump to pages, tickets and articles, or run actions.
 * `staticItems` are { group, icon, label, hint?, run } entries supplied by the layout.
 */
const CommandPalette = ({ open, onClose, staticItems, canSearchAllTickets, onOpenTicket, onOpenArticle }) => {
  const [query, setQuery] = useState('');
  const [tickets, setTickets] = useState([]);
  const [articles, setArticles] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery(''); setTickets([]); setArticles([]); setActive(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  // Debounced server search for tickets and knowledge articles
  useEffect(() => {
    if (!open) return undefined;
    const q = query.trim();
    if (q.length < 2) { setTickets([]); setArticles([]); return undefined; }
    let alive = true;
    const timer = setTimeout(async () => {
      const ticketReq = canSearchAllTickets
        ? api.get('/api/tickets/search', { params: { q, page: 0, size: 6 } })
        : api.get('/api/tickets/my', { params: { q, page: 0, size: 6 } });
      const [t, a] = await Promise.allSettled([ticketReq, api.get('/api/knowledge/search', { params: { q } })]);
      if (!alive) return;
      setTickets(t.status === 'fulfilled' ? (t.value.data?.content || []) : []);
      setArticles(a.status === 'fulfilled' ? (a.value.data || []).slice(0, 5) : []);
    }, 200);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, open, canSearchAllTickets]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = staticItems.filter(i => !q || i.label.toLowerCase().includes(q));
    return [
      ...tickets.map(t => ({ group: 'Tickets', icon: 'confirmation_number', label: t.title, hint: getShortTicketNumber(t), mono: true, run: () => onOpenTicket(t) })),
      ...articles.map(a => ({ group: 'Knowledge base', icon: 'description', label: a.title, run: () => onOpenArticle(a) })),
      ...matches,
    ];
  }, [query, tickets, articles, staticItems, onOpenTicket, onOpenArticle]);

  useEffect(() => { setActive(0); }, [items.length]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const run = (item) => { onClose(); item?.run(); };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(items[active]); }
  };

  let lastGroup = null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-4 bg-black/30 anim-fade-in" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        className="w-full max-w-[560px] rounded-xl border border-outline-variant bg-popover shadow-[var(--shadow-xl)] overflow-hidden anim-scale-up"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-outline-variant">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant !text-[19px]">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tickets, articles, pages and actions…"
            className="w-full bg-transparent pl-11 pr-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant/70 outline-none"
            aria-label="Search"
          />
        </div>

        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-1.5">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-on-surface-variant">No results for “{query}”</p>
          ) : items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <React.Fragment key={`${item.group}-${item.label}-${i}`}>
                {header && <div className="px-4 pt-2.5 pb-1 text-[11px] font-medium text-on-surface-variant/80">{header}</div>}
                <button
                  type="button"
                  data-active={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(item)}
                  className={`mx-1.5 w-[calc(100%-12px)] flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] cursor-pointer ${
                    i === active ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined !text-[17px] text-on-surface-variant">{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint && (item.mono
                    ? <span className="font-mono text-[11px] text-on-surface-variant/80">{item.hint}</span>
                    : <Kbd>{item.hint}</Kbd>)}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex gap-4 px-4 py-2 border-t border-outline-variant bg-surface-container text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>Enter</Kbd> open</span>
          <span className="flex items-center gap-1"><Kbd>Esc</Kbd> close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
