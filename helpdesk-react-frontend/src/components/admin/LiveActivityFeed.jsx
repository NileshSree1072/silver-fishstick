import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { activityApi } from '../../api/activityApi';
import useSocket from '../../hooks/useSocket';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';

const EVENT_CONFIGS = {
  TICKET_CREATED:     { icon: 'confirmation_number', color: 'var(--brand)', bg: 'color-mix(in srgb, var(--brand) 10%, transparent)' },
  TICKET_ASSIGNED:    { icon: 'person_add', color: 'var(--ai)', bg: 'color-mix(in srgb, var(--ai) 10%, transparent)' },
  TICKET_RESOLVED:    { icon: 'task_alt', color: 'var(--success-text)', bg: 'color-mix(in srgb, var(--success) 10%, transparent)' },
  AI_RESOLVED:        { icon: 'auto_awesome', color: 'var(--success-text)', bg: 'color-mix(in srgb, var(--success) 10%, transparent)' },
  AI_SUGGESTED:       { icon: 'lightbulb', color: 'var(--ai)', bg: 'color-mix(in srgb, var(--ai) 10%, transparent)' },
  AI_FAILED:          { icon: 'report', color: 'var(--warning-text)', bg: 'color-mix(in srgb, var(--warning) 10%, transparent)' },
  SLA_WARNING:        { icon: 'schedule', color: 'var(--warning-text)', bg: 'color-mix(in srgb, var(--warning) 10%, transparent)' },
  SLA_BREACH:         { icon: 'error', color: 'var(--danger-text)', bg: 'color-mix(in srgb, var(--danger) 10%, transparent)' },
  AGENT_REPLIED:      { icon: 'chat', color: 'var(--brand)', bg: 'color-mix(in srgb, var(--brand) 10%, transparent)' },
  EMBEDDING_COMPUTED: { icon: 'data_object', color: 'var(--text-muted)', bg: 'color-mix(in srgb, var(--text-muted) 10%, transparent)' },
  SYSTEM_ERROR:       { icon: 'cancel', color: 'var(--danger-text)', bg: 'color-mix(in srgb, var(--danger) 10%, transparent)' }
};

const LiveActivityFeed = ({ className = '' }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { connected, subscribeToTopic } = useSocket();

  // Fetch initial 100 events
  useEffect(() => {
    const loadInitialEvents = async () => {
      try {
        const res = await activityApi.getRecent();
        setEvents(res.data || []);
      } catch (err) {
        toast.error('Failed to load recent activity history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialEvents();
  }, []);

  // Subscribe to live activity feed topic
  useEffect(() => {
    let subscription = null;
    
    // Attempt subscription once socket is connected
    if (connected) {
      subscription = subscribeToTopic('/topic/admin/activity', (newEvent) => {
        setEvents((prev) => {
          const updated = [newEvent, ...prev];
          if (updated.length > 100) {
            updated.pop();
          }
          return updated;
        });
      });
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [connected, subscribeToTopic]);

  const handleClear = () => {
    setEvents([]);
  };

  const getEventTimeAgo = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return 'just now';
    }
  };

  return (
    <div className={`card flex flex-col overflow-hidden w-full shadow-lg ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success/10 border border-success/25">
            <span className="w-1.5 h-1.5 rounded-full bg-success live-pulse"></span>
            <span className="text-[9px] font-black uppercase tracking-wider text-success-text">LIVE</span>
          </div>
          <h3 className="text-sm font-bold tracking-tight text-heading font-heading">
            System Activity
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-input text-muted">
            {events.length} events
          </span>
        </div>
        
        {events.length > 0 && (
          <button 
            onClick={handleClear}
            className="flex items-center gap-1.5 text-[10px] font-bold text-danger-text hover:text-danger-text dark:hover:text-danger-text transition-colors cursor-pointer bg-danger/10 border border-danger/20 px-2.5 py-1.5 rounded-lg"
          >
            <Trash2 size={11} />
            Clear
          </button>
        )}
      </div>

      {/* Events Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted">
            <span className="material-symbols-outlined text-[28px] animate-spin text-primary">progress_activity</span>
            <p className="text-[11px] uppercase tracking-wider font-semibold opacity-75">Loading feed...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted">
            <span className="material-symbols-outlined text-[36px] opacity-25">hub</span>
            <p className="text-xs font-medium text-muted">Waiting for system events…</p>
          </div>
        ) : (
          events.map((event, idx) => {
            const config = EVENT_CONFIGS[event.type] || { icon: '📢', color: 'var(--text-muted)', bg: 'color-mix(in srgb, var(--text-muted) 10%, transparent)' };
            const isError = event.level === 'ERROR';
            const isWarn = event.level === 'WARN';
            
            let rowStyle = {
              transition: 'all 0.2s ease-in-out'
            };
            if (isError) {
              rowStyle.borderLeft = '3px solid var(--priority-urgent)';
              rowStyle.backgroundColor = 'var(--priority-urgent-bg)';
            } else if (isWarn) {
              rowStyle.borderLeft = '3px solid var(--priority-high)';
              rowStyle.backgroundColor = 'var(--priority-high-bg)';
            }

            return (
              <div 
                key={event.timestamp + idx} 
                className="flex items-start justify-between gap-4 p-3.5 anim-slide-down-fade hover:bg-[var(--bg-card-hover)]"
                style={rowStyle}
              >
                {/* Left: Icon Badge & Text */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 border border-subtle"
                    style={{ backgroundColor: config.bg, color: config.color }}
                  >
                    <span className="material-symbols-outlined !text-[16px]">{config.icon}</span>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-normal truncate text-heading">
                      {event.message}
                      {event.ticketTitle && (
                        <span className="font-bold ml-1.5 opacity-90" style={{ color: 'var(--primary)' }}>
                          "{event.ticketTitle}"
                        </span>
                      )}
                    </p>
                    {event.detail && (
                      <p className="text-[10px] mt-1 truncate text-muted">
                        {event.detail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Timestamp */}
                <span className="text-[10px] text-right shrink-0 whitespace-nowrap self-center text-muted">
                  {getEventTimeAgo(event.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LiveActivityFeed;
