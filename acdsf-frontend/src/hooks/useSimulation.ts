import { useState, useEffect, useRef, useCallback } from 'react';
import { simulationApi, SimulationConfig, SimulationStatus } from '../services/simulationApi';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001';

export interface BattleLogEntry {
  id: string;
  round: number;
  step: number;
  stepPhase?: number;
  stepPhaseTitle?: string;
  actor: 'RED' | 'BLUE' | 'ENV' | 'SYSTEM';
  action: string;
  target?: string;
  source?: string;
  mitreId?: string;
  mitreTactic?: string;
  message: string;
  explanation?: string;
  success?: boolean;
  timestamp: string;
  severity?: 'danger' | 'warning' | 'info' | 'success';
  cveId?: string;
  targetPort?: number;
  targetService?: string;
  exploitPayload?: string;
  gnnScore?: number;
  lstmScore?: number;
  anomalyScore?: number;
  threshold?: number;
  sdnRule?: any;
  qValues?: Record<string, number>;
}

export interface ActiveAttackVisual {
  source: string;
  target: string;
  technique: string;
  mitreId: string;
  mitreTactic: string;
  success: boolean;
  timestamp: number;
  cveId?: string;
  targetPort?: number;
}

export interface ActiveDefenseVisual {
  action: string;
  target: string;
  success: boolean;
  timestamp: number;
  sdnRule?: any;
}

export interface SimulationState {
  simulationId: string | null;
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentRound: number;
  totalRounds: number;
  speed: number;
  scenario: string;
  elapsedSeconds: number;
  currentPhase: number;
  currentPhaseTitle: string;
  manualStepMode: boolean;
  sdnFlows: any[];
  currentCve?: string;
  currentPayload?: string;
  currentPort?: number;
  nodeStates: Record<string, string>;
  activeAttack: ActiveAttackVisual | null;
  activeDefense: ActiveDefenseVisual | null;
  redScore: number;
  blueScore: number;
  redState: {
    stage: number;
    stageName: string;
    cumulativeReward: number;
    epsilon: number;
    compromisedCount: number;
    techniquesUsed: string[];
    recentTargets: string[];
  };
  blueState: {
    mode: string;
    cumulativeReward: number;
    isolatedNodes: string[];
    patchedNodes: string[];
    detectionRate: number;
    mttd: number;
    mttr: number;
    activePlaybook?: string;
    anomalyScore?: number;
    gnnScore?: number;
    lstmScore?: number;
  };
  logs: BattleLogEntry[];
  roundResults: Array<{
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
  completedSummary: any | null;
  connected: boolean;
}

const initialSimulationState: SimulationState = {
  simulationId: null,
  status: 'idle',
  currentRound: 0,
  totalRounds: 10,
  speed: 1.0,
  scenario: 'APT',
  elapsedSeconds: 0,
  currentPhase: 0,
  currentPhaseTitle: 'System Standby',
  manualStepMode: false,
  sdnFlows: [],
  currentCve: undefined,
  currentPayload: undefined,
  currentPort: undefined,
  nodeStates: {},
  activeAttack: null,
  activeDefense: null,
  redScore: 0,
  blueScore: 0,
  redState: {
    stage: 1,
    stageName: 'Reconnaissance',
    cumulativeReward: 0,
    epsilon: 0.2,
    compromisedCount: 0,
    techniquesUsed: [],
    recentTargets: [],
  },
  blueState: {
    mode: 'autonomous',
    cumulativeReward: 0,
    isolatedNodes: [],
    patchedNodes: [],
    detectionRate: 0,
    mttd: 0,
    mttr: 0,
    activePlaybook: undefined,
  },
  logs: [],
  roundResults: [],
  completedSummary: null,
  connected: false,
};

export function useSimulation() {
  const [state, setState] = useState<SimulationState>(initialSimulationState);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initial status on mount
  const fetchStatus = useCallback(async () => {
    try {
      const data = await simulationApi.getStatus();
      if (data) {
        const redWins = (data.round_results || []).filter(r => r.winner === 'RED').length;
        const blueWins = (data.round_results || []).filter(r => r.winner === 'BLUE').length;

        setState(prev => ({
          ...prev,
          simulationId: data.simulation_id,
          status: data.status,
          currentRound: data.current_round,
          totalRounds: data.total_rounds,
          speed: data.speed,
          scenario: data.scenario,
          elapsedSeconds: data.elapsed_seconds,
          currentPhase: data.current_phase ?? prev.currentPhase,
          currentPhaseTitle: data.current_phase_title ?? prev.currentPhaseTitle,
          manualStepMode: data.manual_step_mode ?? prev.manualStepMode,
          sdnFlows: data.sdn_flows || prev.sdnFlows,
          nodeStates: data.node_states || {},
          redScore: redWins,
          blueScore: blueWins,
          roundResults: data.round_results || [],
          redState: {
            ...prev.redState,
            stage: data.red_state?.stage || prev.redState.stage,
            stageName: data.red_state?.stage_name || prev.redState.stageName,
            cumulativeReward: data.red_state?.cumulative_reward ?? prev.redState.cumulativeReward,
            epsilon: data.red_state?.epsilon ?? prev.redState.epsilon,
            compromisedCount: data.red_state?.compromised_count ?? prev.redState.compromisedCount,
            techniquesUsed: data.red_state?.techniques_used || prev.redState.techniquesUsed,
            recentTargets: data.red_state?.recent_targets || prev.redState.recentTargets,
          },
          blueState: {
            ...prev.blueState,
            mode: data.blue_state?.mode || prev.blueState.mode,
            cumulativeReward: data.blue_state?.cumulative_reward ?? prev.blueState.cumulativeReward,
            isolatedNodes: data.blue_state?.isolated_nodes || prev.blueState.isolatedNodes,
            patchedNodes: data.blue_state?.patched_nodes || prev.blueState.patchedNodes,
            detectionRate: data.blue_state?.detection_rate ?? prev.blueState.detectionRate,
            mttd: data.blue_state?.mttd ?? prev.blueState.mttd,
            mttr: data.blue_state?.mttr ?? prev.blueState.mttr,
            activePlaybook: data.blue_state?.active_playbook || prev.blueState.activePlaybook,
          },
        }));
      }
    } catch {
      // Backend may be starting or idle
    }
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    fetchStatus();

    function connectSSE() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = `${BACKEND_URL}/api/simulation/stream`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setState(prev => ({ ...prev, connected: true }));
      };

      es.onmessage = (event) => {
        if (!event.data) return;
        try {
          const data = JSON.parse(event.data);
          handleSimulationEvent(data);
        } catch {
          // Ignore parse errors (e.g. keepalive)
        }
      };

      es.onerror = () => {
        setState(prev => ({ ...prev, connected: false }));
        es.close();
        reconnectTimeoutRef.current = setTimeout(connectSSE, 3000);
      };
    }

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchStatus]);

  // Handle incoming simulation event packet
  const handleSimulationEvent = useCallback((event: any) => {
    if (!event) return;

    if (event.type === 'init' && event.status) {
      const s: SimulationStatus = event.status;
      const redWins = (s.round_results || []).filter(r => r.winner === 'RED').length;
      const blueWins = (s.round_results || []).filter(r => r.winner === 'BLUE').length;

      setState(prev => ({
        ...prev,
        simulationId: s.simulation_id,
        status: s.status,
        currentRound: s.current_round,
        totalRounds: s.total_rounds,
        speed: s.speed,
        scenario: s.scenario,
        elapsedSeconds: s.elapsed_seconds,
        currentPhase: s.current_phase ?? prev.currentPhase,
        currentPhaseTitle: s.current_phase_title ?? prev.currentPhaseTitle,
        manualStepMode: s.manual_step_mode ?? prev.manualStepMode,
        sdnFlows: s.sdn_flows || prev.sdnFlows,
        nodeStates: s.node_states || {},
        redScore: redWins,
        blueScore: blueWins,
        roundResults: s.round_results || [],
      }));
      return;
    }

    if (event.type === 'simulation_complete') {
      setState(prev => ({
        ...prev,
        status: 'completed',
        completedSummary: event,
        roundResults: event.round_results || prev.roundResults,
        redScore: event.red_wins ?? prev.redScore,
        blueScore: event.blue_wins ?? prev.blueScore,
        nodeStates: event.node_states || prev.nodeStates,
        logs: [
          {
            id: `comp-${Date.now()}`,
            round: prev.currentRound,
            step: 5,
            actor: 'SYSTEM',
            action: 'SIMULATION_COMPLETE',
            message: event.message || `Battle complete! ${event.winner} wins.`,
            timestamp: new Date().toLocaleTimeString(),
            severity: event.winner === 'RED' ? 'danger' : 'success',
          },
          ...prev.logs.slice(0, 199),
        ],
      }));
      return;
    }

    // Normal round / step event
    const {
      round, step, step_phase, step_phase_title, actor, action, message,
      target_node, source_node, mitre_technique_id, mitre_tactic,
      cve_id, target_port, target_service, exploit_payload,
      gnn_score, lstm_score, anomaly_score, threshold, sdn_rule, q_values, sdn_flows
    } = event;

    const newLog: BattleLogEntry = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      round: round || 0,
      step: step || 0,
      stepPhase: step_phase || step,
      stepPhaseTitle: step_phase_title,
      actor: (actor as 'RED' | 'BLUE' | 'ENV' | 'SYSTEM') || 'SYSTEM',
      action: action || 'ACTION',
      target: target_node,
      source: source_node,
      mitreId: mitre_technique_id,
      mitreTactic: mitre_tactic,
      message: message || '',
      explanation: event.explanation,
      success: event.success,
      timestamp: new Date().toLocaleTimeString(),
      cveId: cve_id,
      targetPort: target_port,
      targetService: target_service,
      exploitPayload: exploit_payload,
      gnnScore: gnn_score,
      lstmScore: lstm_score,
      anomalyScore: anomaly_score,
      threshold: threshold,
      sdnRule: sdn_rule,
      qValues: q_values,
      severity:
        actor === 'RED'
          ? 'danger'
          : actor === 'BLUE'
          ? 'info'
          : event.action === 'Round Summary'
          ? 'warning'
          : 'info',
    };

    setState(prev => {
      let updatedNodeStates = { ...prev.nodeStates };
      if (event.node_state_changes) {
        updatedNodeStates = { ...updatedNodeStates, ...event.node_state_changes };
      }

      let activeAttack = prev.activeAttack;
      let activeDefense = prev.activeDefense;

      if (actor === 'RED' && target_node) {
        activeAttack = {
          source: source_node || 'EXTERNAL',
          target: target_node,
          technique: action,
          mitreId: mitre_technique_id || 'T1595',
          mitreTactic: mitre_tactic || 'Reconnaissance',
          success: !!event.success,
          timestamp: Date.now(),
          cveId: cve_id,
          targetPort: target_port,
        };
      }

      if (actor === 'BLUE' && target_node) {
        activeDefense = {
          action: action,
          target: target_node,
          success: !!event.success,
          timestamp: Date.now(),
          sdnRule: sdn_rule,
        };
      }

      // Update red agent stats
      const updatedRedState = { ...prev.redState };
      if (event.reward_red !== undefined) {
        updatedRedState.cumulativeReward += Number(event.reward_red);
      }
      if (actor === 'RED' && mitre_technique_id && !updatedRedState.techniquesUsed.includes(mitre_technique_id)) {
        updatedRedState.techniquesUsed = [...updatedRedState.techniquesUsed, mitre_technique_id];
      }
      if (actor === 'RED' && target_node) {
        updatedRedState.recentTargets = [target_node, ...updatedRedState.recentTargets.filter(t => t !== target_node)].slice(0, 5);
      }
      if (action === 'STAGE_ADVANCE') {
        const nextStage = prev.redState.stage + 1;
        updatedRedState.stage = nextStage;
      }

      // Update blue agent stats
      const updatedBlueState = { ...prev.blueState };
      if (event.reward_blue !== undefined) {
        updatedBlueState.cumulativeReward += Number(event.reward_blue);
      }
      if (event.detection_confidence !== undefined) {
        updatedBlueState.anomalyScore = event.detection_confidence;
      }
      if (actor === 'BLUE' && action.includes('SOAR')) {
        updatedBlueState.activePlaybook = action;
      }

      // Count compromises
      const compCount = Object.values(updatedNodeStates).filter(
        st => st === 'compromised' || st === 'under_attack'
      ).length;
      updatedRedState.compromisedCount = compCount;

      // Update sdn flows
      let updatedFlows = prev.sdnFlows;
      if (sdn_flows) {
        updatedFlows = sdn_flows;
      } else if (sdn_rule) {
        updatedFlows = [sdn_rule, ...prev.sdnFlows.filter(f => f.flow_id !== sdn_rule.flow_id)].slice(0, 30);
      }

      // Handle round summary
      let newRoundResults = prev.roundResults;
      let redScore = prev.redScore;
      let blueScore = prev.blueScore;

      if (action === 'Round Summary') {
        if (message && message.includes('Winner: RED')) {
          redScore += 1;
        } else if (message && message.includes('Winner: BLUE')) {
          blueScore += 1;
        }
      }

      return {
        ...prev,
        status: prev.status === 'idle' ? 'running' : prev.status,
        currentRound: round || prev.currentRound,
        currentPhase: step_phase || step || prev.currentPhase,
        currentPhaseTitle: step_phase_title || prev.currentPhaseTitle,
        currentCve: cve_id || prev.currentCve,
        currentPayload: exploit_payload || prev.currentPayload,
        currentPort: target_port || prev.currentPort,
        sdnFlows: updatedFlows,
        nodeStates: updatedNodeStates,
        activeAttack,
        activeDefense,
        redScore,
        blueScore,
        redState: updatedRedState,
        blueState: updatedBlueState,
        logs: [newLog, ...prev.logs.slice(0, 199)],
        roundResults: newRoundResults,
      };
    });
  }, []);

  // Controls
  const startSimulation = async (config: SimulationConfig) => {
    try {
      setState(prev => ({
        ...prev,
        status: 'running',
        scenario: config.scenario,
        totalRounds: config.rounds,
        speed: config.speed,
        manualStepMode: !!config.manual_step,
        currentRound: 0,
        currentPhase: 0,
        currentPhaseTitle: 'Initiating Warfare Engine...',
        logs: [],
        roundResults: [],
        completedSummary: null,
        redScore: 0,
        blueScore: 0,
      }));
      const alertEmail = config.user_email || localStorage.getItem('acdsf_alert_email') || undefined;
      await simulationApi.start({ ...config, user_email: alertEmail });
      await fetchStatus();
    } catch (err: any) {
      console.error('Failed to start simulation:', err);
      throw err;
    }
  };

  const pauseSimulation = async () => {
    try {
      await simulationApi.pause();
      setState(prev => ({ ...prev, status: 'paused' }));
    } catch (err) {
      console.error('Failed to pause simulation:', err);
    }
  };

  const resumeSimulation = async () => {
    try {
      await simulationApi.resume();
      setState(prev => ({ ...prev, status: 'running' }));
    } catch (err) {
      console.error('Failed to resume simulation:', err);
    }
  };

  const stopSimulation = async () => {
    try {
      await simulationApi.stop();
      setState(prev => ({ ...prev, status: 'completed' }));
    } catch (err) {
      console.error('Failed to stop simulation:', err);
    }
  };

  const resetSimulation = async () => {
    try {
      await simulationApi.reset();
      setState(initialSimulationState);
      setSelectedNodeId(null);
      await fetchStatus();
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    }
  };

  // Manual Step Forward
  const stepForward = async () => {
    try {
      await simulationApi.step();
    } catch (err) {
      console.error('Failed to step simulation:', err);
    }
  };

  // Operator Intervention
  const intervene = async (action: string, nodeId: string, notes?: string) => {
    try {
      const res = await simulationApi.intervene(action, nodeId, notes);
      await fetchStatus();
      return res;
    } catch (err) {
      console.error('Intervention failed:', err);
      throw err;
    }
  };

  // Export forensic report
  const exportForensicReport = async () => {
    try {
      const report = await simulationApi.exportReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ANCDSF-Simulation-Forensic-Audit-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return report;
    } catch (err) {
      console.error('Failed to export report:', err);
    }
  };

  return {
    state,
    selectedNodeId,
    setSelectedNodeId,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    resetSimulation,
    stepForward,
    intervene,
    exportForensicReport,
    refetchStatus: fetchStatus,
  };
}
