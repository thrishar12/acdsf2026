import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Swords, Skull, Shield, ArrowRight, Play, Zap } from 'lucide-react';
import { HoloCard } from '../ui/HoloCard';
import { useSimulation } from '../../hooks/useSimulation';

export const MiniSimView: React.FC = () => {
  const navigate = useNavigate();
  const { state, startSimulation } = useSimulation();

  const isRunning = state.status === 'running';
  const isCompleted = state.status === 'completed';

  const handleLaunch = async () => {
    if (!isRunning) {
      try {
        await startSimulation({
          scenario: state.scenario || 'APT',
          rounds: 10,
          speed: 1.0,
        });
      } catch (err) {
        console.error('Failed to trigger simulation:', err);
      }
    }
    navigate('/app/simulation');
  };

  return (
    <HoloCard glowColor="multi" className="p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Radio size={15} className={`animate-pulse ${isRunning ? 'text-pink-400' : 'text-cyan-400'}`} />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            AI CYBER WARFARE ARENA // LIVE BATTLE VIEW
          </span>
          <span
            className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
              isRunning
                ? 'bg-pink-950 text-pink-300 border border-pink-500/40 animate-pulse'
                : 'bg-black/60 text-slate-400 border border-white/10'
            }`}
          >
            {state.status.toUpperCase()}
          </span>
        </div>

        <button
          onClick={() => navigate('/app/simulation')}
          className="flex items-center gap-1.5 font-mono text-xs font-bold text-cyan-300 hover:text-white transition group"
        >
          <span>FULL BATTLE ARENA</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* Mini Arena Body */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs items-center">
        {/* Red Team Status */}
        <div className="rounded-xl bg-pink-950/20 border border-pink-500/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-pink-400 font-bold">
              <Skull size={14} /> RED TEAM AI
            </span>
            <span className="text-xl font-black text-pink-400">{state.redScore}</span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {state.activeAttack ? `${state.activeAttack.technique} → ${state.activeAttack.target}` : 'Stage: Reconnaissance'}
          </p>
        </div>

        {/* Center Round Counter & Scenario */}
        <div className="text-center rounded-xl bg-black/40 border border-white/10 p-3">
          <span className="text-[10px] text-slate-500 uppercase block">Campaign</span>
          <span className="text-white font-bold">{state.scenario} SCENARIO</span>
          <div className="mt-1 flex items-center justify-center gap-2 text-cyan-300 font-bold">
            <span>ROUND {state.currentRound} / {state.totalRounds}</span>
          </div>
        </div>

        {/* Blue Team Status */}
        <div className="rounded-xl bg-cyan-950/20 border border-cyan-500/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Shield size={14} /> BLUE TEAM AI
            </span>
            <span className="text-xl font-black text-cyan-400">{state.blueScore}</span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {state.activeDefense ? `${state.activeDefense.action} on ${state.activeDefense.target}` : 'SDN Autonomous Guard'}
          </p>
        </div>
      </div>

      {/* Action Footer Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleLaunch}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500 px-5 py-2.5 font-mono text-xs font-black uppercase text-white shadow-[0_0_20px_rgba(255,0,127,0.5)] transition hover:brightness-110"
        >
          <Play size={14} fill="currentColor" />
          <span>{isRunning ? 'VIEW RUNNING BATTLE' : 'LAUNCH REAL SIMULATION NOW'}</span>
        </button>
      </div>
    </HoloCard>
  );
};
