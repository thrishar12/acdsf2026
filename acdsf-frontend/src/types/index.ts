export type RoleId = 'admin' | 'analyst' | 'red-team' | 'blue-team';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type SectorStatus = 'secure' | 'suspicious' | 'attack';
export type AlertStatus = 'active' | 'investigating' | 'contained' | 'resolved' | 'Blocked' | 'Investigating' | 'Contained';

export interface User {
  email: string;
  name: string;
  role: RoleId;
}

export interface TwinNode {
  node_id: string;
  sector: string;
  node_type?: string;
  cpu_load: number;
  memory_usage?: number;
  ip?: string;
  open_ports?: number[];
  is_compromised: number | boolean;
  alert_count: number;
  last_updated?: string;
}

export interface Alert {
  id: string | number;
  time: string;
  ip: string;
  type: string;
  status: string;
  severity: Severity;
  sector: string;
  node_id?: string;
  confidence?: number;
  action?: string;
}

export interface Kpis {
  detection_rate: number;
  mttd: number;
  mttr: number;
  containment_success: number;
  risk_score: number;
  active_threats: number;
}

export interface XaiFeature {
  name: string;
  value: number;
  direction?: string;
}

export interface XaiResult {
  decision: string;
  confidence: number;
  explanation: string;
  recommendation?: string;
  features: XaiFeature[];
}

export interface CaseItem {
  id: number | string;
  title: string;
  status: string;
  created_at: string;
}

export interface Ioc {
  value: string;
  ioc_type: string;
  threat_type?: string;
  fetched_at?: string;
}

export interface SectorDef {
  id: string;
  name: string;
  short: string;
  emoji: string;
  angle: number;
}

export interface KnowledgeLink {
  actor: string;
  technique: string;
  tactic?: string;
  vulnerability?: string;
  target: string;
}
