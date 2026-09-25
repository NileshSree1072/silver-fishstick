import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useAuth } from '../context/AuthContext';

export function useSocket() {
  const { user } = useAuth();
  const client = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (client.current) {
        client.current.deactivate();
        client.current = null;
      }
      setConnected(false);
      return;
    }

    const stompClient = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        console.log('Connected to WebSocket server:', frame);
        setConnected(true);
      },
      onDisconnect: () => {
        console.log('Disconnected from WebSocket server.');
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
      }
    });

    stompClient.activate();
    client.current = stompClient;

    return () => {
      if (stompClient) {
        stompClient.deactivate();
        client.current = null;
      }
      setConnected(false);
    };
  }, [user]);

  const subscribeToTopic = (topic, callback) => {
    if (!client.current || !client.current.connected) {
      return null;
    }
    return client.current.subscribe(topic, (msg) => {
      try {
        callback(JSON.parse(msg.body));
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    });
  };

  return {
    client,
    connected,
    subscribeToTopic
  };
}

export default useSocket;
