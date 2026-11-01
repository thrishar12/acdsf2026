/**
 * ACDSF — Global Notification Context
 * Manages: SSE stream from /api/notifications/stream, unread count,
 * notification list, mark-read, browser permission, toast dispatch, audio alarm.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from '../components/ui/Toast';
import { playAlertSound, isAudioEnabled } from '../utils/audioAlarm';
import {
  sendDesktopNotification,
  getDesktopNotificationState,
  requestDesktopNotificationPermission,
} from '../utils/notifications';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001';

export interface SocNotification {
  id: number;
  type: string;
  severity: string;
  title: string;
  message: string;
  attack_id?: string;
  mitre_technique_id?: string;
  source_node?: string;
  target_node?: string;
  is_read: 0 | 1;
  created_at: string;
}

interface NotificationContextValue {
  notifications: SocNotification[];
  unreadCount: number;
  streamConnected: boolean;
  fetchNotifications: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  requestBrowserPermission: () => Promise<boolean>;
  desktopPermission: string;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  streamConnected: false,
  fetchNotifications: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  deleteNotification: async () => {},
  requestBrowserPermission: async () => false,
  desktopPermission: 'default',
});

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('acdsf_token') || localStorage.getItem('acdsf_access_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function severityToToastType(severity: string, type: string): string {
  if (type === 'ATTACK_CAUGHT') return 'success';
  if (type === 'ATTACK_MISSED') return 'critical';
  if (type === 'ATTACK_LAUNCHED') return 'medium';
  if (type === 'ATTACK_DETECTED') return 'high';
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'high';
  if (severity === 'success') return 'success';
  if (severity === 'medium') return 'medium';
  return severity;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<SocNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [streamConnected, setStreamConnected] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState(getDesktopNotificationState());
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeenId = useRef<number>(0);
  const shownIds = useRef<Set<number>>(new Set());

  // ---------------------------------------------------------------------------
  // REST helpers
  // ---------------------------------------------------------------------------
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/notifications?limit=50`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const notifs: SocNotification[] = data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(data.unread_total ?? notifs.filter(n => !n.is_read).length);
      if (notifs.length > 0) lastSeenId.current = Math.max(...notifs.map(n => n.id));
    } catch {
      // silent
    }
  }, []);

  const markRead = useCallback(async (id: number) => {
    try {
      await fetch(`${BACKEND}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await fetch(`${BACKEND}/api/notifications/read-all`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch { /* silent */ }
  }, []);

  const deleteNotification = useCallback(async (id: number) => {
    try {
      await fetch(`${BACKEND}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { /* silent */ }
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    const ok = await requestDesktopNotificationPermission();
    setDesktopPermission(getDesktopNotificationState());
    return ok;
  }, []);

  // ---------------------------------------------------------------------------
  // Handle a new incoming notification from SSE
  // ---------------------------------------------------------------------------
  const handleNewNotification = useCallback((notif: SocNotification) => {
    // De-duplicate
    if (shownIds.current.has(notif.id)) return;
    shownIds.current.add(notif.id);

    // Update local state
    setNotifications(prev => [notif, ...prev].slice(0, 100));
    if (!notif.is_read) setUnreadCount(prev => prev + 1);
    if (notif.id > lastSeenId.current) lastSeenId.current = notif.id;

    // Dispatch toast
    toast.attack(notif.type, notif.title, notif.message);

    // Audio alarm for high/critical/success (attack caught)
    const sev = notif.severity?.toLowerCase();
    const shouldSound = sev === 'critical' || sev === 'high' || sev === 'success';
    if (shouldSound && isAudioEnabled()) {
      playAlertSound(sev === 'success' ? 'success' : sev);
    }

    // Browser desktop notification when tab is in background
    if (!document.hasFocus() && getDesktopNotificationState() === 'granted') {
      sendDesktopNotification(`🛡️ ${notif.title}`, {
        body: notif.message,
        tag: `notif-${notif.id}`,
        requireInteraction: sev === 'critical',
      });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // SSE real-time stream
  // ---------------------------------------------------------------------------
  const connectStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }
    const url = `${BACKEND}/api/notifications/stream?last_seen_id=${lastSeenId.current}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('connected', () => {
      setStreamConnected(true);
      console.debug('[ACDSF] Notification stream connected');
    });

    es.addEventListener('notification', (e: MessageEvent) => {
      try {
        const notif: SocNotification = JSON.parse(e.data);
        handleNewNotification(notif);
      } catch { /* ignore malformed */ }
    });

    es.addEventListener('error', () => {
      setStreamConnected(false);
      es.close();
      reconnectTimer.current = setTimeout(connectStream, 4000);
    });
  }, [handleNewNotification]);

  // Mount: fetch existing, connect stream, poll unread count every 30s
  useEffect(() => {
    fetchNotifications();
    connectStream();

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND}/api/notifications/unread-count`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const { unread_count } = await res.json();
          setUnreadCount(unread_count ?? 0);
        }
      } catch { /* silent */ }
    }, 30_000);

    return () => {
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      clearInterval(pollInterval);
    };
  }, [fetchNotifications, connectStream]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        streamConnected,
        fetchNotifications,
        markRead,
        markAllRead,
        deleteNotification,
        requestBrowserPermission,
        desktopPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
