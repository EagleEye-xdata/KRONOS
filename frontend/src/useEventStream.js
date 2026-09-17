import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing the Server-Sent Events (SSE) telemetry connection.
 * Supports auto-reconnect with exponential backoff, connection state tracking,
 * and event dispatching to registered listeners.
 */
export function useEventStream(onEventReceived) {
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState(Date.now());
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const onEventRef = useRef(onEventReceived);
  onEventRef.current = onEventReceived;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus(prev => (prev === 'connected' ? 'reconnecting' : 'connecting'));

    // Connect to /api/stream (proxied by Vite to http://localhost:4000/api/stream)
    const es = new EventSource('/api/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus('connected');
      setReconnectAttempt(0);
      setLastHeartbeatTime(Date.now());
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setLastHeartbeatTime(Date.now());
        if (onEventRef.current) {
          onEventRef.current(payload);
        }
      } catch (err) {
        console.error('Failed to parse SSE event data:', err, event.data);
      }
    };

    es.onerror = () => {
      setStatus('reconnecting');
      es.close();

      setReconnectAttempt(prev => {
        const nextAttempt = prev + 1;
        // Exponential backoff: 1s, 2s, 3s, max 5s
        const delay = Math.min(1000 * Math.pow(1.5, prev), 5000);
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
        return nextAttempt;
      });
    };
  }, []);

  const manualReconnect = useCallback(() => {
    clearTimeout(reconnectTimeoutRef.current);
    setReconnectAttempt(0);
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return {
    status,
    reconnectAttempt,
    lastHeartbeatTime,
    manualReconnect,
  };
}
