import type { Alert, CaseItem, Ioc, Kpis, KnowledgeLink, SectorDef, TwinNode, XaiResult } from '../types';

export const SECTORS: SectorDef[] = [
  { id: 'gov', name: 'Government Networks', short: 'Government', emoji: '🏛️', angle: -90 },
  { id: 'energy', name: 'Energy Grid / SCADA', short: 'Energy', emoji: '⚡', angle: -30 },
  { id: 'finance', name: 'Financial Systems', short: 'Finance', emoji: '🏦', angle: 30 },
  { id: 'telecom', name: 'Telecommunications', short: 'Telecom', emoji: '📡', angle: 90 },
  { id: 'water', name: 'Water Treatment / ICS', short: 'Water', emoji: '💧', angle: 150 },
  { id: 'transport', name: 'Transport Management', short: 'Transport', emoji: '🚆', angle: 210 },
];

export const mockAlerts: Alert[] = [
  { id: 'AL-90421', time: '14:23:45', ip: '10.1.0.99', type: 'Spear Phishing', status: 'Investigating', severity: 'critical', sector: 'Government', confidence: 96.8, action: 'Isolate mailbox + block C2' },
  { id: 'AL-90418', time: '14:22:10', ip: '10.2.0.50', type: 'OT Port Scan', status: 'active', severity: 'high', sector: 'Energy', confidence: 88.2, action: 'Rate-limit Modbus peers' },
  { id: 'AL-90411', time: '14:20:33', ip: '10.3.0.20', type: 'Ransomware Beacon', status: 'Contained', severity: 'critical', sector: 'Finance', confidence: 94.1, action: 'BLOCK HOST' },
  { id: 'AL-90402', time: '14:18:55', ip: '10.5.0.15', type: 'Modbus Scan', status: 'Blocked', severity: 'medium', sector: 'Water', confidence: 79.4, action: 'Drop ICS probe traffic' },
  { id: 'AL-90391', time: '14:17:20', ip: '10.6.0.30', type: 'DNS Tunneling', status: 'Blocked', severity: 'medium', sector: 'Telecom', confidence: 91.0, action: 'Sinkhole domain' },
  { id: 'AL-90384', time: '14:15:45', ip: '10.4.0.77', type: 'SQL Injection', status: 'Investigating', severity: 'high', sector: 'Transport', confidence: 86.5, action: 'WAF rule + ticket' },
  { id: 'AL-90370', time: '14:09:12', ip: '10.1.4.12', type: 'Lateral Movement', status: 'resolved', severity: 'high', sector: 'Government', confidence: 92.3, action: 'Reset credentials' },
  { id: 'AL-90361', time: '13:58:02', ip: '10.2.8.41', type: 'PLC Command Anomaly', status: 'resolved', severity: 'critical', sector: 'Energy', confidence: 97.4, action: 'Hold SCADA write ops' },
];

export const mockSectors: Record<string, number> = {
  Government: 92,
  Energy: 71,
  Finance: 48,
  Telecom: 95,
  Water: 88,
  Transport: 91,
};

export const mockKpis: Kpis = {
  detection_rate: 93.3,
  mttd: 2.1,
  mttr: 6.4,
  containment_success: 96,
  risk_score: 24,
  active_threats: 4,
};

export const mockXai: XaiResult = {
  decision: 'BLOCK HOST',
  confidence: 96.8,
  explanation:
    'The Blue Team agent classified this host as an active intrusion pivot. Traffic entropy, failed authentications, and graph proximity to a known C2 indicator exceed the containment threshold.',
  recommendation: 'Isolate host at SDN edge, revoke session tokens, and hunt for sibling beacons in the same subnet.',
  features: [
    { name: 'Abnormal traffic behaviour', value: 0.41, direction: 'increased' },
    { name: 'Multiple failed login attempts', value: 0.28, direction: 'increased' },
    { name: 'High-risk IP activity', value: 0.22, direction: 'increased' },
    { name: 'Suspicious lateral movement', value: 0.18, direction: 'increased' },
    { name: 'Business-hours baseline', value: -0.09, direction: 'decreased' },
  ],
};

export const mockCases: CaseItem[] = [
  { id: 1043, title: 'Ransomware pivot / FIN-CORE-02', status: 'contained', created_at: '14:20:33' },
  { id: 1042, title: 'DDoS response / ENER-SRV1', status: 'active', created_at: '14:11:08' },
  { id: 1041, title: 'Phishing containment / GOV-PC-14', status: 'closed', created_at: '13:48:02' },
];

const sectorCycle = ['Government', 'Energy', 'Finance', 'Telecom', 'Water', 'Transport'];
const types = ['router', 'server', 'ics', 'workstation', 'firewall', 'scada'];

export const mockTwins: TwinNode[] = Array.from({ length: 36 }, (_, index) => {
  const sector = sectorCycle[index % 6];
  const compromised = index === 8 || index === 14 || index === 21;
  return {
    node_id: `${sector.slice(0, 4).toUpperCase()}-${String(index + 1).padStart(2, '0')}`,
    sector,
    node_type: types[index % types.length],
    cpu_load: (index * 11 + 17) % 93,
    memory_usage: (index * 13 + 28) % 88,
    ip: `10.${(index % 6) + 1}.${Math.floor(index / 6)}.${20 + index}`,
    open_ports: index % 3 === 0 ? [22, 443, 8080] : index % 3 === 1 ? [161, 502] : [443, 53],
    is_compromised: compromised ? 1 : 0,
    alert_count: compromised ? 3 + (index % 4) : index % 7 === 0 ? 1 : 0,
    last_updated: new Date(Date.now() - index * 41000).toISOString(),
  };
});

export const mockIocs: Ioc[] = [
  { value: '198.51.100.42', ioc_type: 'IP', threat_type: 'C2 beacon', fetched_at: '14:21' },
  { value: 'nightfall[.]io-cdn.net', ioc_type: 'Domain', threat_type: 'Phishing kit', fetched_at: '14:08' },
  { value: '5e8c1a9b2d44…', ioc_type: 'Hash', threat_type: 'Loader', fetched_at: '13:55' },
  { value: '185.244.25.19', ioc_type: 'IP', threat_type: 'Scanner', fetched_at: '13:41' },
];

export const mockGraph: KnowledgeLink[] = [
  { actor: 'APT-29', technique: 'Spearphishing Link', tactic: 'Initial Access', vulnerability: 'CVE-2024-21413', target: 'GOVE-14' },
  { actor: 'APT-29', technique: 'OS Credential Dumping', tactic: 'Credential Access', vulnerability: 'Weak Kerberos', target: 'GOVE-02' },
  { actor: 'VOLT TYPHOON', technique: 'Valid Accounts', tactic: 'Persistence', vulnerability: 'Exposed VPN', target: 'ENER-SRV1' },
  { actor: 'VOLT TYPHOON', technique: 'Command-Line Interface', tactic: 'Execution', vulnerability: 'Unmonitored jump box', target: 'ENER-PLC3' },
  { actor: 'FIN7', technique: 'SQL Injection', tactic: 'Initial Access', vulnerability: 'CVE-2023-3519', target: 'FIN-CORE-02' },
  { actor: 'Sandworm', technique: 'Modbus Function Abuse', tactic: 'Impact', vulnerability: 'No allow-list', target: 'WATR-ICS1' },
];

export const battlefieldEvents = [
  { t: '14:23:51', label: 'Threat Detected', side: 'red' as const, detail: 'Red Team AI injected C2 probe into Energy DMZ' },
  { t: '14:23:54', label: 'Suspicious Activity', side: 'red' as const, detail: 'Lateral movement attempt GOVE-14 → GOVE-02' },
  { t: '14:24:01', label: 'AI Response Activated', side: 'blue' as const, detail: 'Blue Team policy engine raised containment playbook' },
  { t: '14:24:08', label: 'Host Isolated', side: 'blue' as const, detail: 'SDN gateway severed FIN-CORE-02 east-west links' },
  { t: '14:24:12', label: 'Attack Blocked', side: 'blue' as const, detail: 'Firewall drop on 198.51.100.42:443' },
  { t: '14:24:19', label: 'Threat Neutralized', side: 'blue' as const, detail: 'Campaign path collapsed. Risk score −6' },
];

export const DEMO_USERS: Record<string, { password: string; name: string; role: 'admin' | 'analyst' | 'red-team' | 'blue-team' }> = {};
