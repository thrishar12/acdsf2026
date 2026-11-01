import { useState, useEffect, useCallback } from 'react';
import { getStoredToken } from '../utils/token';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001';

export interface MetricsTrendItem {
  day: string;
  incidents: number;
}

export interface SystemMetrics {
  total_incidents: number;
  active_threats: number;
  compromised_nodes: number;
  total_nodes: number;
  detection_rate: number;
  containment_rate: number;
  mttd_seconds: number;
  mttr_seconds: number;
  mttd_minutes: number;
  mttr_minutes: number;
  risk_score: number;
  trend_7d: MetricsTrendItem[];
  timestamp?: string;
}

const DEFAULT_METRICS: SystemMetrics = {
  total_incidents: 0,
  active_threats: 0,
  compromised_nodes: 0,
  total_nodes: 43,
  detection_rate: 98.5,
  containment_rate: 97.2,
  mttd_seconds: 4.2,
  mttr_seconds: 12.8,
  mttd_minutes: 0.1,
  mttr_minutes: 0.2,
  risk_score: 22,
  trend_7d: [
    { day: 'Mon', incidents: 14 },
    { day: 'Tue', incidents: 18 },
    { day: 'Wed', incidents: 25 },
    { day: 'Thu', incidents: 12 },
    { day: 'Fri', incidents: 30 },
    { day: 'Sat', incidents: 9 },
    { day: 'Sun', incidents: 16 },
  ],
};

export function useMetrics(pollIntervalMs = 5000) {
  const [metrics, setMetrics] = useState<SystemMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/metrics`, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setMetrics((prev) => ({
        ...prev,
        ...data,
        trend_7d: Array.isArray(data.trend_7d) && data.trend_7d.length > 0 ? data.trend_7d : prev.trend_7d,
      }));
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchMetrics, pollIntervalMs]);

  return { metrics, loading, error, refresh: fetchMetrics };
}
