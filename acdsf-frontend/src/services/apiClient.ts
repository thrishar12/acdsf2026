import { mockAlerts, mockCases, mockGraph, mockIocs, mockKpis, mockSectors, mockTwins, mockXai } from '../data/mockData';
import type { Alert, TwinNode } from '../types';
import { getStoredToken } from '../utils/token';

const defaultBackend = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001';

const urls = {
  backend: defaultBackend,
  dashboard: import.meta.env.VITE_METRICS_URL || defaultBackend,
  sdn: import.meta.env.VITE_SDN_URL || defaultBackend,
  kg: import.meta.env.VITE_KG_URL || defaultBackend,
  ttp: import.meta.env.VITE_TTP_URL || defaultBackend,
  soar: import.meta.env.VITE_SOAR_URL || defaultBackend,
  threatIntel: import.meta.env.VITE_THREAT_INTEL_URL || defaultBackend,
};

type Service = keyof typeof urls;
export const status: Record<string, boolean> = {};

async function request<T>(service: Service, path: string, options: RequestInit = {}, fallback: T): Promise<{ data: T; live: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  try {
    const response = await fetch(`${urls[service]}${path}`, { 
      ...options, 
      headers,
      signal: controller.signal 
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    status[service] = true;
    return { data: (await response.json()) as T, live: true };
  } catch {
    status[service] = false;
    return { data: fallback, live: false };
  } finally {
    clearTimeout(timeout);
  }
}

// Direct fetch (no fallback, no timeout override)
async function directFetch(path: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers = new Headers({ 'Content-Type': 'application/json', ...(options.headers || {}) });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${defaultBackend}${path}`, { ...options, headers });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

export const apiClient = {
  getTwins: () => request<TwinNode[]>('backend', '/twins', {}, mockTwins),
  getAlerts: () => request<Alert[]>('backend', '/alerts', {}, mockAlerts),
  getKpis: () => request('dashboard', '/api/kpis', {}, mockKpis),
  getSectors: () => request('dashboard', '/api/sectors', {}, mockSectors),
  getXai: () => request('dashboard', '/api/xai', {}, mockXai),
  explainAlert: (alert: Alert) =>
    request('dashboard', '/explain/alert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(alert) }, mockXai),
  getCases: () => request('soar', '/cases', {}, mockCases),
  getIocs: () => request('threatIntel', '/iocs?limit=8', {}, mockIocs),
  getAttackPaths: (sector: string) => request('kg', `/kg/attack-paths/${encodeURIComponent(sector)}`, {}, mockGraph.filter((g) => g.target.toLowerCase().includes(sector.slice(0, 3).toLowerCase()))),
  getServiceStatuses: async () => {
    const services = await Promise.all(
      Object.entries({ backend: '/health', sdn: '/health', kg: '/health', ttp: '/health', soar: '/health', threatIntel: '/health' }).map(async ([service, path]) => [
        service,
        (await request(service as Service, path, {}, null)).live,
      ]),
    );
    return Object.fromEntries(services) as Record<string, boolean>;
  },
  blockHost: (nodeId: string) =>
    request('backend', '/sdn/block-host', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ node_id: nodeId }) }, { status: 'mock blocked', node_id: nodeId }),
  restoreHost: (nodeId: string) =>
    request('backend', '/sdn/restore-host', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ node_id: nodeId }) }, { status: 'mock restored', node_id: nodeId }),
  triggerPlaybook: (target: string) =>
    request('soar', '/playbook/ddos-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target }) }, { status: 'mock executed', case_id: 'demo-1043' }),

  // --- Attack Lifecycle ---
  startAttack: (attackType: string, targetNode: string, userEmail?: string) =>
    directFetch('/api/attack/start', {
      method: 'POST',
      body: JSON.stringify({
        attack_type: attackType,
        target_node: targetNode,
        user_email: userEmail || localStorage.getItem('acdsf_alert_email') || undefined,
      }),
    }),

  stopAttack: () =>
    directFetch('/api/attack/stop', { method: 'POST', body: JSON.stringify({}) }),

  getActiveAttack: () =>
    directFetch('/api/attack/active', { method: 'GET' }),

  containAttack: (incidentId: string, action: string) =>
    directFetch(`/api/attack/${encodeURIComponent(incidentId)}/contain`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  // --- Incident History ---
  getIncidents: (statusFilter?: string) =>
    directFetch(`/api/incidents${statusFilter ? `?status=${statusFilter}` : ''}`, { method: 'GET' }),

  getLastReport: () =>
    directFetch('/api/incidents/last-report', { method: 'GET' }),

  getIncident: (incidentId: string) =>
    directFetch(`/api/incidents/${encodeURIComponent(incidentId)}`, { method: 'GET' }),

  // --- AI Evaluation ---
  getAiEvaluation: () =>
    directFetch('/api/ai/evaluation', { method: 'GET' }),

  // --- Unified Notifications & Diagnostics ---
  getNotificationStatus: () =>
    directFetch('/api/notifications/status', { method: 'GET' }),

  registerFcmToken: (token: string) =>
    directFetch('/api/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  testPush: () =>
    directFetch('/api/notifications/test-push', { method: 'POST', body: JSON.stringify({}) }),

  testEmail: (recipient?: string) =>
    directFetch('/api/notifications/test-email', {
      method: 'POST',
      body: JSON.stringify({ recipient: recipient || undefined }),
    }),

  testSms: (phone?: string) =>
    directFetch('/api/notifications/test-sms', {
      method: 'POST',
      body: JSON.stringify({ phone: phone || undefined }),
    }),

  testAllNotifications: () =>
    directFetch('/api/notifications/test-all', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  getNotificationLogs: (limit = 50) =>
    directFetch(`/api/notifications/logs?limit=${limit}`, { method: 'GET' }),

  getSmtpConfig: () =>
    directFetch('/api/notifications/smtp-config', { method: 'GET' }),

  updateSmtpConfig: (smtp_email: string, smtp_password: string) =>
    directFetch('/api/notifications/smtp-config', {
      method: 'POST',
      body: JSON.stringify({ smtp_email, smtp_password }),
    }),

  status,
};

