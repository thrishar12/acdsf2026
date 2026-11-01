import { useEffect, useRef, useState, useCallback } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001';

export interface IncidentEvent {
  incident_id: string;
  attack_type?: string;
  target?: string;
  source?: string;
  status?: string;
  severity?: string;
  risk_score?: number;
  confidence_score?: number;
  mitre_tactic?: string;
  mitre_technique_id?: string;
  mitre_technique_name?: string;
  attack_started_at?: string;
  attack_detected_at?: string;
  attack_ended_at?: string;
  blue_team_response?: string;
  notification_statuses?: Record<string, string>;
  detection?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UseSSEResult {
  lastEvent: IncidentEvent | null;
  events: IncidentEvent[];
  connected: boolean;
  clearEvents: () => void;
}

export function useSSE(): UseSSEResult {
  const [lastEvent, setLastEvent] = useState<IncidentEvent | null>(null);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(`${BACKEND}/api/events`);
    esRef.current = es;

    es.addEventListener('open', () => {
      setConnected(true);
    });

    // Handle named events from backend
    const handleEvent = (e: MessageEvent) => {
      try {
        const data: IncidentEvent = JSON.parse(e.data);
        setLastEvent(data);
        setEvents(prev => [data, ...prev].slice(0, 100));
      } catch {
        // ignore malformed events
      }
    };

    es.addEventListener('attack_detected', handleEvent);
    es.addEventListener('incident_update', handleEvent);

    es.addEventListener('error', () => {
      setConnected(false);
      es.close();
      // Reconnect after 3 seconds
      reconnectTimer.current = setTimeout(connect, 3000);
    });
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  return { lastEvent, events, connected, clearEvents };
}
