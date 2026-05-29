import React, { useState, useEffect, useRef } from 'react';
import { api, useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import CustomSelect from './CustomSelect';
import ProfileModal from './ProfileModal';

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

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
  { value: 'ON_BREAK', label: 'On Break' },
  { value: 'IN_MEETING', label: 'In Meeting' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'IDLE', label: 'Idle' },
  { value: 'OFFLINE', label: 'Offline' },
];

const availabilityMeta = {
  ONLINE: { label: 'Online', color: '#22c55e' },
  AWAY: { label: 'Away', color: '#f59e0b' },
  BUSY: { label: 'Busy', color: '#ef4444' },
  ON_BREAK: { label: 'On Break', color: '#38bdf8' },
  IN_MEETING: { label: 'In Meeting', color: '#a78bfa' },
  TRAINING: { label: 'Training', color: '#818cf8' },
  IDLE: { label: 'Idle', color: '#94a3b8' },
  OFFLINE: { label: 'Offline', color: '#6b7280' },
};

const getAvailabilityMeta = (status) => availabilityMeta[status] || availabilityMeta.OFFLINE;

const Layout = ({ children, activeConsole, setActiveConsole, activeTab, setActiveTab }) => {
  const { user, logout, isBackendConnected, checkConnection } = useAuth();
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, toasts, removeToast, addToast } = useNotifications();

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [agentAvailability, setAgentAvailability] = useState('ONLINE');
  const [savingAvailability, setSavingAvailability] = useState(false);
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

  const handleAvailabilityChange = async (status) => {
    if (savingAvailability) return;
    setSavingAvailability(true);
    try {
      const res = await api.patch('/api/users/me/availability', { status });
      setAgentAvailability(res.data?.availabilityStatus || status);
      const meta = getAvailabilityMeta(status);
      addToast(`You are now ${meta.label}.`, 'Availability Updated', 'success');
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

  const menuItems = {
    customer: [
      { id: 'kb', label: 'Browse Knowledge', icon: 'search' },
      { id: 'history', label: 'My Tickets', icon: 'confirmation_number' },
    ],
    agent: [
      { id: 'queue', label: 'Ticket Queue', icon: 'receipt_long' },
      { id: 'kb-drafts', label: 'KB Drafts', icon: 'rate_review' },
    ],
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'agents', label: 'Agent Management', icon: 'support_agent' },
      { id: 'users', label: 'Users & Agents', icon: 'group' },
      { id: 'articles', label: 'KB Approvals', icon: 'fact_check' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
      { id: 'sla', label: 'SLA Rules', icon: 'schedule' },
      { id: 'agent-performance', label: 'Agent Performance', icon: 'trending_up' },
      { id: 'user-performance', label: 'User Activity', icon: 'people_alt' },
      { id: 'audit-log', label: 'Audit Log', icon: 'manage_search' },
      { id: 'breach-log', label: 'Breach Log', icon: 'gpp_bad' },
      { id: 'transfer-log', label: 'Transfer Log', icon: 'swap_horiz' },
    ],
  };

  const activeMenuItems = menuItems[activeConsole] || [];

  const roleColors = {
    ADMIN:  { bg: 'rgba(195,192,255,0.15)', text: '#c3c0ff', border: 'rgba(195,192,255,0.3)' },
    AGENT:  { bg: 'rgba(76,215,246,0.12)', text: '#4cd7f6', border: 'rgba(76,215,246,0.25)' },
    USER:   { bg: 'rgba(195,192,255,0.12)', text: '#c3c0ff', border: 'rgba(195,192,255,0.25)' },
  };
  const rc = roleColors[user?.role] || roleColors.USER;

  const toastIcon = (type) => {
    if (type === 'success') return <span className="material-symbols-outlined text-[#c3c0ff] shrink-0 icon-fill">check_circle</span>;
    if (type === 'error')   return <span className="material-symbols-outlined text-[#ffb4ab] shrink-0 icon-fill">warning</span>;
    return                         <span className="material-symbols-outlined text-[#4cd7f6] shrink-0 icon-fill">info</span>;
  };

  return (
    <div className="bg-background text-on-surface font-body-md text-body-md antialiased overflow-hidden flex h-screen w-screen">

      {/* ─── TOAST STACK ─────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[340px] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto anim-slide-in-right flex items-start gap-3 p-4 rounded-xl shadow-lg glass-panel"
            style={{
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {toastIcon(t.type)}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-on-surface">{t.title}</p>
              {t.message && <p className="text-[11px] mt-0.5 text-on-surface-variant leading-relaxed">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-0.5 rounded-md transition-colors cursor-pointer shrink-0 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Offline overlay removed - warning displayed inline in header */}

      {/* ─── SIDEBAR ─────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col bg-surface-container-low border-r border-outline-variant w-sidebar-width h-full fixed left-0 top-0 z-50 p-md justify-between transition-all duration-300">
        <div>
          {/* Brand */}
          <div className="mb-xl px-sm pt-sm flex items-center gap-sm">
            <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container text-[18px] icon-fill">auto_awesome</span>
            </div>
            <div>
              <h1 className="font-title-md text-title-md font-bold text-primary leading-none">helpdeskAI</h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Enterprise Support</p>
            </div>
          </div>

          {/* Quick Action button */}
          {activeConsole === 'customer' && (
            <button 
              onClick={() => {
                setActiveConsole('customer');
                setActiveTab('create-ticket');
              }}
              className="w-full bg-primary-container hover:bg-inverse-primary text-on-primary-container font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 mb-xl transition-colors duration-200 shadow-[0_2px_10px_rgba(79,70,229,0.2)] cursor-pointer hover:scale-[0.98] active:scale-[0.95]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Ticket
            </button>
          )}

          {/* Nav Links */}
          <nav className="space-y-1">
            {activeMenuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors font-medium cursor-pointer ${
                    isActive 
                      ? 'bg-surface-variant text-on-surface' 
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-primary' : 'text-on-surface-variant'} ${isActive && item.icon === 'search' ? 'icon-fill' : ''}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto space-y-2 pt-4 border-t border-outline-variant">
          
          {/* Console Switcher (Admin only) */}
          {user?.role === 'ADMIN' && (
            <div className="p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/30 mb-3">
              <p className="text-[9px] font-bold uppercase tracking-widest px-1 mb-1.5 text-on-surface-variant">
                Switch Console
              </p>
              <div className="grid gap-1 grid-cols-3">
                {['customer', 'agent', 'admin'].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setActiveConsole(c);
                      if (c === 'customer') setActiveTab('kb');
                      if (c === 'agent')    setActiveTab('queue');
                      if (c === 'admin')    setActiveTab('dashboard');
                    }}
                    className={`py-1 rounded text-[9px] font-bold capitalize transition-all cursor-pointer ${
                      activeConsole === c 
                        ? 'bg-primary text-surface-container-lowest shadow-sm' 
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>

          {/* Current User Card */}
          <div 
            onClick={() => setShowProfileModal(true)}
            className="mt-2 flex items-center gap-3 px-3 py-2 bg-surface-container-lowest/30 rounded-xl border border-outline-variant/20 hover:bg-surface-container-high/40 hover:border-outline cursor-pointer transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text }}>
              {getInitials(user?.name)}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="font-label-sm text-label-sm font-medium text-on-surface truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-on-surface-variant truncate uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ────────────────────────────── */}
      <main className="flex-1 flex flex-col md:ml-sidebar-width min-h-screen relative overflow-hidden bg-background">
        
        {/* Connection status banner inside the UI, instead of a full screen blocking overlay */}
        {!isBackendConnected && (
          <div className="bg-error/10 border-b border-error/20 text-error px-4 py-2 flex items-center justify-between text-xs gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] animate-pulse">cloud_off</span>
              <span>Unable to reach the backend service at <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-surface-container text-primary">localhost:8080</code>. Offline mode active.</span>
            </div>
            <button 
              onClick={handleReconnect} 
              disabled={checkingConnection} 
              className="bg-error/20 hover:bg-error/30 text-error px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[12px] ${checkingConnection ? 'animate-spin' : ''}`}>refresh</span>
              {checkingConnection ? 'Retrying...' : 'Retry Connection'}
            </button>
          </div>
        )}
        
        {/* TopNavBar */}
        <header className="flex justify-between items-center w-full px-lg h-16 sticky top-0 z-40 bg-surface-dim/80 backdrop-blur-md border-b border-outline-variant">
          {/* Mobile menu trigger / Brand */}
          <div className="flex items-center gap-3">
            <button className="md:hidden text-on-surface-variant p-2 rounded-lg hover:bg-surface-container-high">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="font-title-md text-title-md font-bold text-primary md:hidden">helpdeskAI</span>
            
            {/* Desktop Brand indicators */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm font-semibold text-on-surface uppercase tracking-wider">
                {activeConsole === 'customer' ? 'Customer portal' : activeConsole === 'agent' ? 'Agent workspace' : 'Admin console'}
              </span>
              <span className="text-outline-variant/60">•</span>
              <span className="text-xs text-on-surface-variant">
                {activeMenuItems.find(i => i.id === activeTab)?.label}
              </span>
            </div>
          </div>

          {/* Right quick actions */}
          <div className="flex items-center gap-3">
            {user?.role === 'AGENT' && activeConsole === 'agent' && (
              <CustomSelect
                options={AGENT_AVAILABILITY_OPTIONS}
                value={agentAvailability}
                onChange={handleAvailabilityChange}
                disabled={savingAvailability}
                className="!w-auto"
                optionsClassName="!min-w-[150px]"
                renderTrigger={(selectedOption) => {
                  const meta = getAvailabilityMeta(selectedOption.value);
                  return (
                    <button
                      type="button"
                      disabled={savingAvailability}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[10px] font-semibold bg-surface-container border border-outline-variant hover:bg-surface-container-high transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                      <span style={{ color: meta.color }}>{meta.label}</span>
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">expand_more</span>
                    </button>
                  );
                }}
                renderOption={(opt, isSelected) => {
                  const meta = getAvailabilityMeta(opt.value);
                  return (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                      <span style={{ color: isSelected ? 'var(--primary)' : 'var(--text-heading)' }}>{opt.label}</span>
                    </div>
                  );
                }}
              />
            )}

            {/* Backend status chip */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-surface-container border border-outline-variant">
              <span className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? 'live-pulse' : ''}`}
                style={{ background: isBackendConnected ? 'var(--accent-blue)' : '#ffb4ab' }} />
              <span style={{ color: isBackendConnected ? 'var(--accent-blue)' : '#ffb4ab' }}>
                {isBackendConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Theme Toggle */}
            <button 
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="text-on-surface-variant p-2 rounded-full hover:bg-surface-container hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-on-surface-variant p-2 rounded-full hover:bg-surface-container hover:text-primary transition-colors relative cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden glass-panel z-50"
                  style={{ boxShadow: 'var(--shadow-xl)' }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30 bg-surface-container-low">
                    <span className="text-xs font-semibold text-on-surface">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllNotificationsRead}
                        className="text-[10px] font-semibold cursor-pointer text-primary hover:text-primary-fixed-dim">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-outline-variant/20 bg-surface-container">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-xs text-on-surface-variant">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            !n.read ? 'bg-primary/5' : 'transparent'
                          } hover:bg-surface-container-high`}
                        >
                          <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${!n.read ? 'text-primary' : 'text-on-surface-variant'}`}>
                            {!n.read ? 'notifications_active' : 'notifications'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs leading-relaxed text-on-surface">{n.message}</p>
                            <span className="text-[10px] text-on-surface-variant">
                              {getTimeAgo(n.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown Indicator */}
            <div 
              onClick={() => setShowProfileModal(true)}
              className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant flex items-center justify-center font-bold text-xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shadow-sm"
              style={{ background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text }}
            >
              {getInitials(user?.name)}
            </div>
          </div>
        </header>

        {/* Page Content Panel */}
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </main>

      <ProfileModal open={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
};

export default Layout;
