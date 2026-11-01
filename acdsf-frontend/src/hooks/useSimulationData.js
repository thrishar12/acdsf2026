import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://127.0.0.1:3001';

export function useSimulationData() {
  const [twins, setTwins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isOnline, setIsOnline] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/twins`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setTwins(data);
      setLastUpdate(new Date());
      setLoading(false);
      setIsOnline(true);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
      setIsOnline(false);
      setLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        setIsOnline(true);
        setError(null);
        return true;
      }
      setIsOnline(false);
      return false;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Check health periodically
  useEffect(() => {
    fetchHealth();
    const healthInterval = setInterval(fetchHealth, 10000);
    return () => clearInterval(healthInterval);
  }, [fetchHealth]);

  const getNodeById = (nodeId) => twins.find(n => n.node_id === nodeId);

  const getStats = () => {
    const total = twins.length;
    const compromised = twins.filter(n => n.is_compromised).length;
    const avgCpu = total > 0 
      ? (twins.reduce((sum, n) => sum + (n.cpu_load || 0), 0) / total)
      : 0;
    const totalAlerts = twins.reduce((sum, n) => sum + (n.alert_count || 0), 0);
    const secure = total - compromised;
    
    return { total, compromised, avgCpu, totalAlerts, secure };
  };

  const getNodesBySector = () => {
    const sectors = {};
    twins.forEach(n => {
      const sector = n.sector || 'Unknown';
      if (!sectors[sector]) sectors[sector] = [];
      sectors[sector].push(n);
    });
    return sectors;
  };

  return {
    twins,
    loading,
    error,
    lastUpdate,
    isOnline,
    fetchData,
    getStats,
    getNodeById,
    getNodesBySector,
    API_BASE,
  };
}