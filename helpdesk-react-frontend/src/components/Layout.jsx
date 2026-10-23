import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { api, useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import CustomSelect from './CustomSelect';
import ProfileModal from './ProfileModal';
import AppLogo from './AppLogo';
import CommandPalette from './CommandPalette';
import ShortcutsDialog from './ShortcutsDialog';
import ArticleModal from './ArticleModal';
import { Avatar, Kbd } from './ui/Primitives';
import useHotkeys from '../hooks/useHotkeys';

const getTimeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const AGENT_AVAILABILITY_OPTIONS = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'AWAY', label: 'Away' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'ON_BREAK', label: 'On break' },
  { value: 'IN_MEETING', label: 'In a meeting' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'IDLE', label: 'Idle' },
  { value: 'OFFLINE', label: 'Offline' },
];

const availabilityMeta = {
  ONLINE: { label: 'Online', color: 'var(--success)' },
  AWAY: { label: 'Away', color: 'var(--warning)' },
  BUSY: { label: 'Busy', color: 'var(--danger)' },
  ON_BREAK: { label: 'On break', color: 'var(--warning)' },
  IN_MEETING: { label: 'In a meeting', color: 'var(--danger)' },
  TRAINING: { label: 'Training', color: 'var(--status-open)' },
  IDLE: { label: 'Idle', color: 'var(--text-disabled)' },
  OFFLINE: { label: 'Offline', color: 'var(--text-disabled)' },
};

const getAvailabilityMeta = (status) => availabilityMeta[status] || availabilityMeta.OFFLINE;

const CONSOLE_TITLES = { customer: 'Customer portal', agent: 'Agent workspace', admin: 'Admin console' };
const DEFAULT_TAB = { customer: 'kb', agent: 'queue', admin: 'dashboard' };

const menuItems = {
  customer: [
    { id: 'kb', label: 'Help center', icon: 'menu_book' },
    { id: 'history', label: 'My tickets', icon: 'confirmation_number' },
  ],
  agent: [
    { id: 'queue', label: 'Inbox', icon: 'inbox' },
    { id: 'kb-drafts', label: 'KB drafts', icon: 'edit_note' },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: 'space_dashboard' },
    { id: 'agents', label: 'Agent management', icon: 'support_agent' },
    { id: 'users', label: 'Users & agents', icon: 'group' },
    { id: 'articles', label: 'KB approvals', icon: 'fact_check' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'sla', label: 'SLA rules', icon: 'schedule' },
    { id: 'agent-performance', label: 'Agent performance', icon: 'trending_up' },
    { id: 'user-performance', label: 'User activity', icon: 'people_alt' },
    { id: 'audit-log', label: 'Audit log', icon: 'manage_search' },
    { id: 'breach-log', label: 'Breach log', icon: 'gpp_bad' },
    { id: 'transfer-log', label: 'Transfer log', icon: 'swap_horiz' },
  ],
};

const toastIcon = (type) => {
  if (type === 'success') return <span className="material-symbols-outlined icon-fill !text-[18px] text-success shrink-0">check_circle</span>;
  if (type === 'error')   return <span className="material-symbols-outlined icon-fill !text-[18px] text-danger shrink-0">error</span>;
  return                         <span className="material-symbols-outlined icon-fill !text-[18px] text-on-surface-variant shrink-0">info</span>;
};

const Layout = ({ children, activeConsole, setActiveConsole, activeTab, setActiveTab }) => {
  const { user, logout, isBackendConnected, checkConnection } = useAuth();
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, toasts, removeToast, addToast } = useNotifications();

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [agentAvailability, setAgentAvailability] = useState('ONLINE');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [openArticle, setOpenArticle] = useState(null);
  const notifRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (user?.role !== 'AGENT' || activeConsole !== 'agent') return;
    let alive = true;
    api.get('/api/users/me')
      .then(res => {
        if (alive && res.data?.availabilityStatus) {
          setAgentAvailability(res.data.availabilityStatus);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [user?.role, activeConsole]);

  // Pages can ask the shell to show the shortcuts list
  useEffect(() => {
    const show = () => setShortcutsOpen(true);
    window.addEventListener('aegis:show-shortcuts', show);
    return () => window.removeEventListener('aegis:show-shortcuts', show);
  }, []);

  const handleAvailabilityChange = async (status) => {
    if (savingAvailability) return;
    setSavingAvailability(true);
    try {
      const res = await api.patch('/api/users/me/availability', { status });
      setAgentAvailability(res.data?.availabilityStatus || status);
      const meta = getAvailabilityMeta(status);
      addToast(`You are now ${meta.label.toLowerCase()}.`, 'Availability updated', 'success');
    } catch {
      addToast('Could not update your availability.', 'Error', 'error');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleReconnect = async () => {
    setCheckingConnection(true);
    await checkConnection();
    setCheckingConnection(false);
  };

  const switchConsole = useCallback((c, tab) => {
    setActiveConsole(c);
    setActiveTab(tab || DEFAULT_TAB[c]);
  }, [setActiveConsole, setActiveTab]);

  // Opening a ticket from the command menu: remember it, switch to the right page,
  // and tell an already-mounted page to select it
  const openTicket = useCallback((ticket) => {
    if (activeConsole === 'customer') {
      localStorage.setItem('helpdesk_selected_customer_ticket_id', ticket.id);
      setActiveTab('history');
    } else {
      localStorage.setItem('helpdesk_selected_agent_ticket_id', ticket.id);
      if (activeConsole !== 'agent') setActiveConsole('agent');
      setActiveTab('queue');
    }
    setTimeout(() => window.dispatchEvent(new CustomEvent('aegis:open-ticket', { detail: ticket })), 0);
  }, [activeConsole, setActiveConsole, setActiveTab]);

  const activeMenuItems = menuItems[activeConsole] || [];

  const paletteItems = useMemo(() => {
    const items = activeMenuItems.map(item => ({
      group: 'Go to', icon: item.icon, label: item.label, run: () => setActiveTab(item.id),
    }));
    if (activeConsole === 'customer') {
      items.unshift({ group: 'Actions', icon: 'add', label: 'New ticket', run: () => setActiveTab('create-ticket') });
    }
    if (user?.role === 'ADMIN') {
      Object.keys(CONSOLE_TITLES).filter(c => c !== activeConsole).forEach(c => {
        items.push({ group: 'Go to', icon: 'swap_horiz', label: `Switch to ${CONSOLE_TITLES[c].toLowerCase()}`, run: () => switchConsole(c) });
      });
    }
    items.push(
      { group: 'Actions', icon: 'contrast', label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', run: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) },
      { group: 'Actions', icon: 'keyboard', label: 'Keyboard shortcuts', hint: '?', run: () => setShortcutsOpen(true) },
      { group: 'Actions', icon: 'person', label: 'Edit profile', run: () => setShowProfileModal(true) },
      { group: 'Actions', icon: 'logout', label: 'Log out', run: logout },
    );
    return items;
  }, [activeMenuItems, activeConsole, user?.role, theme, setActiveTab, switchConsole, logout]);

  useHotkeys({
    'mod+k': () => setPaletteOpen(o => !o),
    '?': () => setShortcutsOpen(true),
  });

  return (
    <div className="bg-background text-on-surface antialiased overflow-hidden flex h-screen w-screen">

      {/* ─── TOAST STACK ─────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-32px)] pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto anim-slide-in-right flex items-start gap-3 px-3.5 py-3 rounded-[10px] border border-outline-variant bg-popover shadow-[var(--shadow-lg)]"
          >
            {toastIcon(t.type)}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-on-surface">{t.title}</p>
              {t.message && <p className="text-[12.5px] mt-0.5 text-on-surface-variant leading-relaxed">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="icon-btn !w-6 !h-6 shrink-0"
              aria-label="Dismiss"
            >
              <span className="material-symbols-outlined !text-[15px]">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* ─── SIDEBAR ─────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col bg-surface-container-low border-r border-outline-variant w-sidebar-width h-full fixed left-0 top-0 z-50 px-3 py-4">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <AppLogo size={28} variant="badge" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-on-surface leading-tight">Aegis Helpdesk</p>
            <p className="text-[11.5px] text-on-surface-variant leading-tight">{CONSOLE_TITLES[activeConsole]}</p>
          </div>
        </div>

        {activeConsole === 'customer' && (
          <button
            onClick={() => setActiveTab('create-ticket')}
            className="btn btn-primary w-full mb-5"
          >
            <span className="material-symbols-outlined !text-[18px]">add</span>
            New ticket
          </button>
        )}

        <nav className="space-y-0.5 flex-1 overflow-y-auto -mx-1 px-1" aria-label="Main">
          {activeMenuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-left text-[13.5px] font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-surface-container-high text-on-surface'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined !text-[19px] ${isActive ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-3 mt-3 border-t border-outline-variant space-y-2">
          {user?.role === 'ADMIN' && (
            <div className="flex p-0.5 rounded-lg bg-surface-container-high border border-outline-variant" role="tablist" aria-label="Console">
              {['customer', 'agent', 'admin'].map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={activeConsole === c}
                  onClick={() => switchConsole(c)}
                  className={`flex-1 py-1 rounded-md text-[12px] font-medium capitalize transition-colors cursor-pointer ${
                    activeConsole === c
                      ? 'bg-surface-container-low text-on-surface shadow-[var(--shadow-xs)]'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowProfileModal(true)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer text-left"
          >
            <Avatar name={user?.name} size={30} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-on-surface truncate leading-tight">{user?.name}</p>
              <p className="text-[11.5px] text-on-surface-variant truncate leading-tight capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors text-left cursor-pointer"
          >
            <span className="material-symbols-outlined !text-[18px]">logout</span>
            Log out
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ────────────────────────────── */}
      <main className="flex-1 flex flex-col md:ml-sidebar-width min-h-screen relative overflow-hidden bg-background">

        {!isBackendConnected && (
          <div className="bg-danger-soft border-b border-danger-border text-danger-text px-4 py-2 flex items-center justify-between text-[13px] gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined !text-[17px]">cloud_off</span>
              <span>Can't reach the server. Changes won't be saved until the connection is back.</span>
            </div>
            <button
              onClick={handleReconnect}
              disabled={checkingConnection}
              className="btn btn-danger btn-sm"
            >
              <span className={`material-symbols-outlined !text-[15px] ${checkingConnection ? 'animate-spin' : ''}`}>refresh</span>
              {checkingConnection ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}

        <header className="flex items-center gap-3 w-full px-4 md:px-6 h-14 shrink-0 bg-surface-container-low border-b border-outline-variant">
          <div className="flex items-center gap-2 md:hidden">
            <AppLogo size={22} />
            <span className="text-[14px] font-semibold text-on-surface">Aegis</span>
          </div>

          <h1 className="hidden md:block text-[15px] font-semibold text-on-surface truncate">
            {activeMenuItems.find(i => i.id === activeTab)?.label || (activeTab === 'create-ticket' ? 'New ticket' : CONSOLE_TITLES[activeConsole])}
          </h1>

          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto md:ml-6 flex items-center gap-2 w-auto md:w-[300px] lg:w-[360px] px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-[13px] text-on-surface-variant hover:border-outline transition-colors cursor-pointer"
            aria-label="Open command menu"
          >
            <span className="material-symbols-outlined !text-[18px]">search</span>
            <span className="hidden md:inline flex-1 text-left">Search or jump to…</span>
            <span className="hidden md:flex gap-0.5"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
          </button>

          <div className="flex items-center gap-1 md:ml-auto">
            {user?.role === 'AGENT' && activeConsole === 'agent' && (
              <CustomSelect
                options={AGENT_AVAILABILITY_OPTIONS}
                value={agentAvailability}
                onChange={handleAvailabilityChange}
                disabled={savingAvailability}
                className="!w-auto mr-1"
                optionsClassName="!min-w-[160px]"
                renderTrigger={(selectedOption) => {
                  const meta = getAvailabilityMeta(selectedOption.value);
                  return (
                    <button
                      type="button"
                      disabled={savingAvailability}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-[12.5px] font-medium text-on-surface border border-outline-variant hover:bg-surface-container-high transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                      <span className="material-symbols-outlined !text-[16px] text-on-surface-variant">expand_more</span>
                    </button>
                  );
                }}
                renderOption={(opt) => {
                  const meta = getAvailabilityMeta(opt.value);
                  return (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                      <span>{opt.label}</span>
                    </div>
                  );
                }}
              />
            )}

            {!isBackendConnected && (
              <span className="hidden sm:flex items-center gap-1.5 px-2 text-[12px] text-danger-text">
                <span className="w-1.5 h-1.5 rounded-full bg-danger" /> Offline
              </span>
            )}

            <button
              onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
              className="icon-btn"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            >
              <span className="material-symbols-outlined !text-[19px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="icon-btn relative"
                aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
              >
                <span className="material-symbols-outlined !text-[19px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-[var(--bg-sidebar)]" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-24px)] rounded-xl overflow-hidden border border-outline-variant bg-popover shadow-[var(--shadow-xl)] z-50 anim-slide-down-fade">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
                    <span className="text-[13.5px] font-semibold text-on-surface">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllNotificationsRead} className="text-[12.5px] font-medium cursor-pointer text-primary hover:underline">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-[13px] text-on-surface-variant">You're all caught up.</div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className="w-full flex gap-3 px-4 py-3 text-left cursor-pointer transition-colors hover:bg-surface-container-high"
                        >
                          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] leading-relaxed ${!n.read ? 'text-on-surface' : 'text-on-surface-variant'}`}>{n.message}</p>
                            <span className="text-[11.5px] text-on-surface-variant">{getTimeAgo(n.createdAt)}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setShowProfileModal(true)} className="ml-1 rounded-full cursor-pointer" aria-label="Profile">
              <Avatar name={user?.name} size={30} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </main>

      <ProfileModal open={showProfileModal} onClose={() => setShowProfileModal(false)} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        staticItems={paletteItems}
        canSearchAllTickets={activeConsole !== 'customer'}
        onOpenTicket={openTicket}
        onOpenArticle={setOpenArticle}
      />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} console={activeConsole} />
      {openArticle && <ArticleModal article={openArticle} onClose={() => setOpenArticle(null)} />}
    </div>
  );
};

export default Layout;
