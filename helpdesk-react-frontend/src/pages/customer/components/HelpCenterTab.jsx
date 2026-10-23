import React from 'react';
import { EmptyState } from '../../../components/ui/Primitives';
import { formatDate } from '../../../utils/ticketMeta';

const TOPICS = [
  { name: 'General', desc: 'Getting started, account updates and platform setup.', icon: 'rocket_launch' },
  { name: 'Technical Support', desc: 'API connectivity, webhooks and integrations.', icon: 'settings_applications' },
  { name: 'Billing & Plans', desc: 'Invoices, subscriptions and payment methods.', icon: 'credit_card' },
  { name: 'Security & Privacy', desc: 'SSO, two-factor authentication and compliance.', icon: 'shield_lock' },
];

const ArticleSkeleton = () => (
  <div className="card p-4 space-y-2.5">
    <div className="skeleton h-2.5 w-1/4" />
    <div className="skeleton h-3.5 w-3/4" />
    <div className="skeleton h-2.5 w-full" />
    <div className="skeleton h-2.5 w-5/6" />
  </div>
);

/**
 * Customer help center: search the knowledge base or browse by topic.
 */
const HelpCenterTab = ({ query, onQueryChange, onSearch, articles, loading, searched, onOpenArticle, onNewTicket }) => (
  <div className="h-full overflow-y-auto">
    <div className="mx-auto max-w-[960px] px-4 md:px-6 py-8 md:py-10">
      <section className="text-center mb-8">
        <h2 className="text-[26px] md:text-[30px] font-semibold tracking-tight text-on-surface">How can we help?</h2>
        <p className="text-[14.5px] text-on-surface-variant mt-2">Search our guides, or browse a topic below.</p>
        <form
          className="relative max-w-[600px] mx-auto mt-6"
          onSubmit={(e) => { e.preventDefault(); onSearch(query); }}
          role="search"
        >
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            className="field !py-3 !pl-11 !pr-24 !text-[14.5px] !rounded-[10px]"
            placeholder="Search for answers, e.g. reset my password"
            type="search"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            aria-label="Search the help center"
          />
          <button type="submit" className="btn btn-primary btn-sm absolute right-2 top-1/2 -translate-y-1/2">Search</button>
        </form>
      </section>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <ArticleSkeleton key={i} />)}
        </div>
      ) : articles.length > 0 ? (
        <>
          <div className="flex items-center mb-3">
            <h3 className="flex-1 text-[13.5px] font-semibold text-on-surface">{searched ? `Results for “${searched}”` : 'Popular articles'}</h3>
            {searched && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onQueryChange(''); onSearch(''); }}>Clear search</button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map(art => (
              <button
                key={art.id}
                type="button"
                onClick={() => onOpenArticle(art)}
                className="card p-4 text-left hover:border-outline hover:shadow-[var(--shadow-sm)] cursor-pointer flex flex-col"
              >
                <div className="flex items-center gap-2 text-[12px] text-on-surface-variant mb-2">
                  <span>{art.categoryName || 'General'}</span>
                  <span className="ml-auto">{formatDate(art.createdAt)}</span>
                </div>
                <h4 className="text-[14px] font-semibold text-on-surface line-clamp-2 mb-1.5">{art.title}</h4>
                <p className="text-[13px] text-on-surface-variant line-clamp-3 flex-1">{art.content}</p>
                <span className="mt-3 text-[13px] font-medium text-primary flex items-center gap-1">
                  Read article <span className="material-symbols-outlined !text-[16px]">arrow_forward</span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {searched && (
            <div className="card mb-6">
              <EmptyState
                icon="search_off"
                title={`No articles match “${searched}”`}
                description="Try different words, or ask our support team directly."
                action={<button type="button" className="btn btn-primary btn-sm" onClick={onNewTicket}>Create a ticket</button>}
              />
            </div>
          )}
          <h3 className="text-[13.5px] font-semibold text-on-surface mb-3">Browse topics</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {TOPICS.map(topic => (
              <button
                key={topic.name}
                type="button"
                onClick={() => { onQueryChange(topic.name); onSearch(topic.name); }}
                className="card p-4 text-left flex items-start gap-3.5 hover:border-outline hover:shadow-[var(--shadow-sm)] cursor-pointer"
              >
                <span className="w-10 h-10 rounded-[10px] grid place-items-center shrink-0 border border-outline-variant bg-surface-container text-on-surface-variant">
                  <span className="material-symbols-outlined !text-[20px]">{topic.icon}</span>
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-on-surface">{topic.name}</span>
                  <span className="block text-[13px] text-on-surface-variant mt-0.5">{topic.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-10 card px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-on-surface">Still need help?</p>
          <p className="text-[13px] text-on-surface-variant">Our AI assistant answers most questions within a minute, and an agent takes over if it can't.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onNewTicket}>
          <span className="material-symbols-outlined !text-[18px]">add</span>New ticket
        </button>
      </div>
    </div>
  </div>
);

export default HelpCenterTab;
