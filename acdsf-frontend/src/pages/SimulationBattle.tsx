import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radio,
  Swords,
  Layers,
  Sparkles,
  History,
  Terminal,
  Activity,
  RotateCcw,
} from 'lucide-react';
import { useSimulation } from '../hooks/useSimulation';
import { TopologyBattlefield } from '../components/simulation/TopologyBattlefield';
import { RedTeamPanel } from '../components/simulation/RedTeamPanel';
import { BlueTeamPanel } from '../components/simulation/BlueTeamPanel';
import { SimControlBar } from '../components/simulation/SimControlBar';
import { SimKpiCards } from '../components/simulation/SimKpiCards';
import { BattleLog } from '../components/simulation/BattleLog';
import { RoundTimeline } from '../components/simulation/RoundTimeline';
import { ExplainabilityTab } from '../components/simulation/ExplainabilityTab';
import { NodeDrawer } from '../components/simulation/NodeDrawer';
import { ResultsModal } from '../components/simulation/ResultsModal';
import { CyberBadge } from '../components/ui/CyberBadge';
import { useTheme } from '../utils/theme';

export function SimulationBattle() {
  const { isLight } = useTheme();
  const [searchParams] = useSearchParams();
  const {
    state,
    selectedNodeId,
    setSelectedNodeId,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    resetSimulation,
  } = useSimulation();

  const [activeTab, setActiveTab] = useState<'arena' | 'explainability' | 'history'>('arena');
  const [showResultsModal, setShowResultsModal] = useState(true);

  // Auto-start if requested via link/button
  useEffect(() => {
    if (searchParams.get('autoStart') === 'true' && state.status === 'idle') {
      startSimulation({
        scenario: 'APT',
        rounds: 10,
        speed: 1.0,
      });
    }
  }, [searchParams, state.status, startSimulation]);

  const totalNodesCount = 43;

  return (
    <div className="space-y-5 pb-10">
      {/* Top Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} className={isLight ? 'text-[#DC2626]' : 'text-pink-400 animate-pulse'} />
            <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${isLight ? 'text-[#DC2626] font-bold' : 'text-pink-400'}`}>
              AUTONOMOUS CYBER WARFARE ARENA // DQN RED VS BLUE
            </p>
          </div>
          <h2 className={`mt-1 font-display text-3xl font-extrabold tracking-wide ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>
            Live AI Simulation Arena
          </h2>
          <p className={`mt-1 text-xs font-mono ${isLight ? 'text-[#475569]' : 'text-slate-400'}`}>
            Adversary DQN Killchain synthesis vs Sovereign Blue Team (SDN Controller + SOAR + GNN/LSTM Detection)
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <CyberBadge
            label={state.status.toUpperCase()}
            tone={state.status === 'running' ? 'magenta' : state.status === 'completed' ? 'acid' : 'cyan'}
          />
          {state.connected && (
            <span className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border ${
              isLight
                ? 'text-[#15803D] bg-[#DCFCE7] border-[#BBF7D0]'
                : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-[#16A34A]' : 'bg-emerald-400 animate-ping'}`} />
              LIVE SSE STREAM
            </span>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <SimControlBar
        status={state.status}
        currentRound={state.currentRound}
        totalRounds={state.totalRounds}
        speed={state.speed}
        scenario={state.scenario}
        elapsedSeconds={state.elapsedSeconds}
        onStart={startSimulation}
        onPause={pauseSimulation}
        onResume={resumeSimulation}
        onStop={stopSimulation}
        onReset={resetSimulation}
      />

      {/* KPI Cards Strip */}
      <SimKpiCards
        redScore={state.redScore}
        blueScore={state.blueScore}
        totalRounds={state.totalRounds}
        compromisedCount={state.redState.compromisedCount}
        totalNodes={totalNodesCount}
        detectionRate={state.blueState.detectionRate}
        mttd={state.blueState.mttd}
        mttr={state.blueState.mttr}
        isolatedCount={state.blueState.isolatedNodes.length}
      />

      {/* View Mode Tabs */}
      <div className={`flex items-center gap-2 border-b pb-2 ${isLight ? 'border-[#FECDD3]' : 'border-white/10'}`}>
        <button
          onClick={() => setActiveTab('arena')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-bold transition ${
            activeTab === 'arena'
              ? isLight
                ? 'bg-gradient-to-r from-[#E11D48] to-[#F43F5E] text-white border border-[#E11D48] shadow-sm font-bold'
                : 'bg-gradient-to-r from-pink-600/30 to-cyan-600/30 text-white border border-cyan-500/50 shadow-[0_0_15px_rgba(0,245,255,0.2)]'
              : isLight
              ? 'text-[#78350F] bg-[#FEF3C7] border border-[#FDE68A] hover:bg-[#FDE68A] hover:text-[#0F172A]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Swords size={14} className={isLight && activeTab === 'arena' ? 'text-white' : 'text-pink-400'} />
          <span>BATTLEFIELD ARENA</span>
        </button>

        <button
          onClick={() => setActiveTab('explainability')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-bold transition ${
            activeTab === 'explainability'
              ? isLight
                ? 'bg-gradient-to-r from-[#D97706] to-[#F59E0B] text-white border border-[#D97706] shadow-sm font-bold'
                : 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-white border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : isLight
              ? 'text-[#78350F] bg-[#FEF3C7] border border-[#FDE68A] hover:bg-[#FDE68A] hover:text-[#0F172A]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles size={14} className={isLight && activeTab === 'explainability' ? 'text-white' : 'text-purple-400'} />
          <span>EXPLAINABILITY & MITRE (XAI)</span>
        </button>
      </div>

      {/* Tab 1: Primary Arena View */}
      {activeTab === 'arena' && (
        <div className="space-y-5">
          {/* 3-Column Grand Arena Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-4 items-start">
            {/* Left: Red Team HUD */}
            <div className="order-2 lg:order-1">
              <RedTeamPanel
                redState={state.redState}
                activeAttack={state.activeAttack}
                scenario={state.scenario}
              />
            </div>

            {/* Center: 43-Node Battlefield Canvas + Round Timeline */}
            <div className="order-1 lg:order-2 space-y-4">
              <TopologyBattlefield
                nodeStates={state.nodeStates}
                activeAttack={state.activeAttack}
                activeDefense={state.activeDefense}
                onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
                selectedNodeId={selectedNodeId}
                scenario={state.scenario}
              />

              <RoundTimeline
                currentRound={state.currentRound}
                totalRounds={state.totalRounds}
                roundResults={state.roundResults}
              />
            </div>

            {/* Right: Blue Team HUD */}
            <div className="order-3">
              <BlueTeamPanel
                blueState={state.blueState}
                activeDefense={state.activeDefense}
                scenario={state.scenario}
              />
            </div>
          </div>

          {/* Bottom Live Terminal Feed */}
          <BattleLog logs={state.logs} />
        </div>
      )}

      {/* Tab 2: Explainability (XAI & MITRE matrix) */}
      {activeTab === 'explainability' && (
        <ExplainabilityTab
          scenario={state.scenario}
          anomalyScore={state.blueState.anomalyScore ?? 0.72}
          techniquesUsed={state.redState.techniquesUsed}
        />
      )}

      {/* Node Details Drawer */}
      {selectedNodeId && (
        <NodeDrawer
          nodeId={selectedNodeId}
          status={state.nodeStates[selectedNodeId] || 'healthy'}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      {/* Completion Victory Summary Modal */}
      {state.status === 'completed' && state.completedSummary && showResultsModal && (
        <ResultsModal
          summary={state.completedSummary}
          onClose={() => setShowResultsModal(false)}
          onRematch={() => {
            setShowResultsModal(false);
            resetSimulation();
          }}
        />
      )}
    </div>
  );
}
