import { getStoredToken } from '../utils/token';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001';

export interface SimulationConfig {
  scenario: string;
  rounds: number;
  speed: number;
  target_sector?: string;
  red_difficulty?: string;
  blue_mode?: string;
  manual_step?: boolean;
  user_email?: string;
}

export interface SdnFlowRule {
  flow_id: string;
  switch_id: string;
  target_node: string;
  priority: number;
  match: string;
  action: string;
  packet_count: number;
  byte_count: number;
  installed_at: string;
}

export interface SimulationStatus {
  simulation_id: string | null;
  status: 'idle' | 'running' | 'paused' | 'completed';
  current_round: number;
  total_rounds: number;
  scenario: string;
  speed: number;
  elapsed_seconds: number;
  current_phase?: number;
  current_phase_title?: string;
  manual_step_mode?: boolean;
  sdn_flows?: SdnFlowRule[];
  red_state?: {
    stage: number;
    stage_name?: string;
    cumulative_reward: number;
    epsilon: number;
    compromised_count: number;
    techniques_used: string[];
    recent_targets: string[];
  };
  blue_state?: {
    mode: string;
    cumulative_reward: number;
    isolated_nodes: string[];
    patched_nodes: string[];
    detection_rate: number;
    mttd: number;
    mttr: number;
    active_playbook?: string;
  };
  node_states: Record<string, string>;
  round_results: Array<{
    round: number;
    winner: 'RED' | 'BLUE' | 'DRAW';
    red_reward: number;
    blue_reward: number;
    red_technique: string;
    blue_action: string;
    target: string;
    detected: boolean;
    red_success: boolean;
    cve?: string;
  }>;
}

export interface ScenarioMeta {
  scenarios: Array<{
    key: string;
    name: string;
    description: string;
    target_sectors: string[];
    stages_count: number;
    playbook_steps: string[];
  }>;
  kill_chain_stages: Array<{
    stage: number;
    name: string;
    mitre_tactic: string;
    description: string;
  }>;
  blue_actions: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  playbooks: Array<{
    scenario: string;
    steps: string[];
  }>;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  });
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BACKEND_URL}/api/simulation${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const simulationApi = {
  start: (config: SimulationConfig) =>
    request<{ simulation_id: string; status: string }>('/start', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  pause: () =>
    request<{ status: string }>('/pause', {
      method: 'POST',
    }),

  resume: () =>
    request<{ status: string }>('/resume', {
      method: 'POST',
    }),

  stop: () =>
    request<{ status: string }>('/stop', {
      method: 'POST',
    }),

  reset: () =>
    request<{ status: string; message: string }>('/reset', {
      method: 'POST',
    }),

  getStatus: () => request<SimulationStatus>('/status'),

  intervene: (action: string, target_node: string, notes?: string) =>
    request<{ success: boolean; node_id: string; action: string; message: string }>('/intervene', {
      method: 'POST',
      body: JSON.stringify({ action, target_node, notes }),
    }),

  step: () =>
    request<{ status: string; current_round: number; phase: number }>('/step', {
      method: 'POST',
    }),

  getSdnFlows: () =>
    request<{ flows: SdnFlowRule[]; count: number }>('/sdn-flows'),

  exportReport: () =>
    request<any>('/export'),

  getEvents: (simId: string) =>
    request<{ simulation_id: string; events: any[]; count: number }>(`/${simId}/events`),

  getHistory: () =>
    request<{ simulations: any[]; total: number }>('/history'),

  getScenarios: () => request<ScenarioMeta>('/scenarios'),

  getTopology: () =>
    request<{ nodes: any[]; edges: any[]; node_states: Record<string, string> }>('/topology'),
};
