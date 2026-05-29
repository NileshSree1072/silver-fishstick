import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useAuth, api } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]); // Dynamic toast alerts list
  const stompClientRef = useRef(null);
  const ticketSubscriptionsRef = useRef({}); // Tracks active callbacks for tickets

  // Add a self-destructing toast alert
  const addToast = (message, title = 'New Alert', type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch initial notifications list and count
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const listRes = await api.get('/api/notifications');
      setNotifications(listRes.data || []);
      
      const countRes = await api.get('/api/notifications/unread-count');
      setUnreadCount(countRes.data?.count || 0);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      addToast('All notifications marked as read', 'Success', 'success');
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  };

  // Establish WebSockets client connection on user login
  useEffect(() => {
    if (!user) {
      // Disconnect client if user logs out
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    // Setup SockJS + STOMP connection
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        console.log('Connected to WebSocket server:', frame);
        
        // Subscribe to user notifications topic
        client.subscribe(`/topic/notifications/${user.userId}`, (message) => {
          try {
            const notification = JSON.parse(message.body);
            // Prepend new notification to state
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            addToast(notification.message, 'New Notification', 'info');
          } catch (e) {
            console.error("Error parsing notification message payload", e);
          }
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error occurred:', frame.headers['message']);
        console.error('STOMP details:', frame.body);
      },
      onWebSocketClose: () => {
        console.log('WebSocket connection closed.');
      }
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client) {
        client.deactivate();
        stompClientRef.current = null;
      }
    };
  }, [user]);

  // Subscribe to live updates for a specific ticket (e.g. Chat console stream)
  const subscribeToTicket = (ticketId, callback) => {
    let subscription = null;
    let intervalId = null;

    if (!stompClientRef.current || !stompClientRef.current.connected) {
      // Defer subscription if connection is pending
      intervalId = setInterval(() => {
        if (stompClientRef.current && stompClientRef.current.connected) {
          subscription = stompClientRef.current.subscribe(`/topic/ticket/${ticketId}`, (message) => {
            try {
              const data = JSON.parse(message.body);
              callback(data);
            } catch (e) {
              console.error("Error parsing live ticket reply", e);
            }
          });
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 500);
    } else {
      subscription = stompClientRef.current.subscribe(`/topic/ticket/${ticketId}`, (message) => {
        try {
          const data = JSON.parse(message.body);
          callback(data);
        } catch (e) {
          console.error("Error parsing live ticket reply", e);
        }
      });
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        addToast,
        removeToast,
        subscribeToTicket,
        markNotificationRead,
        markAllNotificationsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
