import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { Alert, CaseItem, Ioc, Kpis, TwinNode, XaiResult } from '../types';

export function useDefenceData() {
  const [data, setData] = useState({
    alerts: [] as Alert[],
    sectors: {} as Record<string, number>,
    kpis: {} as Partial<Kpis>,
    twins: [] as TwinNode[],
    cases: [] as CaseItem[],
    services: {} as Record<string, boolean>,
    xai: {} as Partial<XaiResult>,
    iocs: [] as Ioc[],
    loading: true,
  });

  const load = async () => {
    const [alerts, sectors, kpis, twins, cases, services, xai, iocs] = await Promise.all([
      apiClient.getAlerts(),
      apiClient.getSectors(),
      apiClient.getKpis(),
      apiClient.getTwins(),
      apiClient.getCases(),
      apiClient.getServiceStatuses(),
      apiClient.getXai(),
      apiClient.getIocs(),
    ]);

    // --- DEBUG: remove after confirming banner works ---
    const twinsArr = Array.isArray(twins.data) && twins.data.length ? twins.data : [];
    const alertsArr = Array.isArray(alerts.data) ? alerts.data : [];
    const compromisedNodes = twinsArr.filter((n: any) => n.is_compromised === 1 || n.is_compromised === true);
    if (compromisedNodes.length > 0) {
      console.warn('[ACDSF] 🚨 COMPROMISED NODES DETECTED:', compromisedNodes.map((n: any) => n.node_id));
    }
    console.log('[ACDSF] Fetched twins:', twinsArr.length, 'live:', twins.live, '| alerts:', alertsArr.length, 'live:', alerts.live, '| compromised:', compromisedNodes.length);
    // --- END DEBUG ---

    setData({
      alerts: alertsArr,
      sectors: sectors.data || {},
      kpis: kpis.data || {},
      twins: twinsArr,
      cases: Array.isArray(cases.data) ? cases.data : [],
      services,
      xai: xai.data || {},
      iocs: Array.isArray(iocs.data) ? iocs.data : [],
      loading: false,
    });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 1000);
    return () => clearInterval(interval);
  }, []);

  return { ...data, reload: load };
}
