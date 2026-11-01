import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Zap,
  Gauge,
  Sliders,
  Shield,
  Layers,
  Radio,
  Clock,
  FastForward,
  Download,
  Footprints,
} from 'lucide-react';
import { SimulationConfig } from '../../services/simulationApi';

interface SimControlBarProps {
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentRound: number;
  totalRounds: number;
  speed: number;
  scenario: string;
  elapsedSeconds: number;
  currentPhase?: number;
  currentPhaseTitle?: string;
  manualStepMode?: boolean;
  onStart: (config: SimulationConfig) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
  onStepForward?: () => void;
  onExportReport?: () => void;
}

export const SimControlBar: React.FC<SimControlBarProps> = ({
  status,
  currentRound,
  totalRounds,
  speed,
  scenario,
  elapsedSeconds,
  currentPhase = 0,
  currentPhaseTitle = '',
  manualStepMode = false,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  onStepForward,
  onExportReport,
}) => {
  const { isLight } = useTheme();
  const [selectedScenario, setSelectedScenario] = useState<string>(scenario || 'APT');
  const [rounds, setRounds] = useState<number>(10);
  const [simSpeed, setSimSpeed] = useState<number>(speed || 1.0);
  const [targetSector, setTargetSector] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [blueMode, setBlueMode] = useState<string>('autonomous');
  const [isManualStep, setIsManualStep] = useState<boolean>(manualStepMode);

  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isIdle = status === 'idle';

  const handleStartClick = () => {
    onStart({
      scenario: selectedScenario,
      rounds: rounds,
      speed: simSpeed,
      target_sector: targetSector,
      red_difficulty: difficulty,
      blue_mode: blueMode,
      manual_step: isManualStep,
    });
  };

  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-200 ${
      isLight
        ? 'border-2 border-[#F472B6] bg-gradient-to-r from-[#FFF0F5] via-[#FFFBEB] to-[#FCE7F3] shadow-md'
        : 'border-cyan-500/30 bg-[#070e1b] shadow-xl'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Scenario & Controls Left Block */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Scenario Select */}
          <div className="flex flex-col">
            <label className={`text-[10px] font-mono uppercase mb-1 flex items-center gap-1 ${
              isLight ? 'text-[#881337] font-bold' : 'text-slate-400'
            }`}>
              <Zap size={11} className={isLight ? 'text-[#E11D48]' : 'text-pink-400'} /> Adversary Scenario
            </label>
            <select
              disabled={isRunning || isPaused}
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className={`rounded-xl border-2 px-3 py-1.5 font-mono text-xs font-bold outline-none disabled:opacity-50 transition-colors ${
                isLight
                  ? 'border-[#F472B6] bg-[#FFF5F8] text-[#0F172A] focus:border-[#E11D48]'
                  : 'border-pink-500/30 bg-black/60 text-pink-300 focus:border-pink-400'
              }`}
            >
              <option value="APT">APT (MITRE Killchain)</option>
              <option value="Ransomware">Double-Extortion Ransomware</option>
              <option value="DDoS">Volumetric & App DDoS</option>
              <option value="Insider">Privileged Insider Exfil</option>
            </select>
          </div>

          {/* Rounds Select */}
          <div className="flex flex-col">
            <label className={`text-[10px] font-mono uppercase mb-1 flex items-center gap-1 ${
              isLight ? 'text-[#92400E] font-bold' : 'text-slate-400'
            }`}>
              <Layers size={11} className={isLight ? 'text-[#D97706]' : 'text-cyan-400'} /> Rounds
            </label>
            <select
              disabled={isRunning || isPaused}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className={`rounded-xl border-2 px-3 py-1.5 font-mono text-xs font-bold outline-none disabled:opacity-50 transition-colors ${
                isLight
                  ? 'border-[#F472B6] bg-[#FFF5F8] text-[#0F172A] focus:border-[#D97706]'
                  : 'border-cyan-500/30 bg-black/60 text-cyan-300 focus:border-cyan-400'
              }`}
            >
              <option value={5}>5 Rounds (Quick)</option>
              <option value={10}>10 Rounds (Standard)</option>
              <option value={20}>20 Rounds (Deep)</option>
              <option value={50}>50 Rounds (Marathon)</option>
            </select>
          </div>

          {/* Target Sector */}
          <div className="flex flex-col">
            <label className={`text-[10px] font-mono uppercase mb-1 flex items-center gap-1 ${
              isLight ? 'text-[#881337] font-bold' : 'text-slate-400'
            }`}>
              <Radio size={11} className={isLight ? 'text-[#E11D48]' : 'text-amber-400'} /> Target Sector
            </label>
            <select
              disabled={isRunning || isPaused}
              value={targetSector}
              onChange={(e) => setTargetSector(e.target.value)}
              className={`rounded-xl border-2 px-3 py-1.5 font-mono text-xs outline-none disabled:opacity-50 transition-colors ${
                isLight
                  ? 'border-[#F472B6] bg-[#FFF5F8] text-[#0F172A] focus:border-[#E11D48]'
                  : 'border-amber-500/30 bg-black/60 text-amber-300 focus:border-amber-400'
              }`}
            >
              <option value="">Any Sector (Dynamic)</option>
              <option value="Finance">Finance</option>
              <option value="Energy">Energy / SCADA</option>
              <option value="Government">Government</option>
              <option value="Telecom">Telecom</option>
              <option value="Transportation">Transportation</option>
              <option value="Water">Water & Utilities</option>
            </select>
          </div>

          {/* Speed Multiplier */}
          <div className="flex flex-col">
            <label className={`text-[10px] font-mono uppercase mb-1 flex items-center gap-1 ${
              isLight ? 'text-[#92400E] font-bold' : 'text-slate-400'
            }`}>
              <Gauge size={11} className={isLight ? 'text-[#D97706]' : 'text-purple-400'} /> Speed
            </label>
            <div className={`flex items-center gap-1 p-1 rounded-xl border-2 ${
              isLight
                ? 'border-[#F472B6] bg-[#FCE7F3]'
                : 'border-purple-500/30 bg-black/60'
            }`}>
              {[0.5, 1.0, 2.0, 4.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold transition ${
                    simSpeed === spd
                      ? isLight
                        ? 'bg-[#E11D48] text-white shadow-sm'
                        : 'bg-purple-600 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                      : isLight
                      ? 'text-[#78350F] hover:text-[#0F172A] hover:bg-[#FEF3C7]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons Right Block */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Round & Timer Badge */}
          <div className={`flex items-center gap-3 rounded-xl px-3 py-1.5 border-2 font-mono text-xs ${
            isLight
              ? 'border-[#FDE68A] bg-[#FEF3C7]'
              : 'border-white/10 bg-black/50'
          }`}>
            <span className={`flex items-center gap-1.5 ${isLight ? 'text-[#B45309] font-bold' : 'text-cyan-300'}`}>
              <Clock size={13} className={isLight ? 'text-[#D97706]' : 'text-cyan-400'} /> {fmtTime(elapsedSeconds)}
            </span>
            <span className={isLight ? 'text-[#FED7AA]' : 'text-slate-600'}>|</span>
            <span className={`font-bold ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>
              ROUND {currentRound} / {totalRounds}
            </span>
          </div>

          {/* Action Trigger Buttons */}
          {isIdle || isCompleted ? (
            <button
              onClick={handleStartClick}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 font-mono text-xs font-black uppercase text-white transition ${
                isLight
                  ? 'bg-gradient-to-r from-[#E11D48] via-[#F43F5E] to-[#F59E0B] hover:brightness-105 active:scale-95 shadow-md'
                  : 'bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500 shadow-[0_0_25px_rgba(255,0,127,0.6)] hover:brightness-110 active:brightness-90 animate-pulse'
              }`}
            >
              <Play size={15} fill="currentColor" />
              LAUNCH REAL SIMULATION
            </button>
          ) : isRunning ? (
            <button
              onClick={onPause}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-bold uppercase text-white transition ${
                isLight
                  ? 'bg-[#D97706] hover:bg-[#B45309] active:scale-95 shadow-sm'
                  : 'bg-gradient-to-r from-amber-600 to-yellow-600 shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:brightness-110'
              }`}
            >
              <Pause size={14} /> PAUSE
            </button>
          ) : (
            <button
              onClick={onResume}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs font-bold uppercase text-white transition ${
                isLight
                  ? 'bg-[#16A34A] hover:bg-[#15803D] active:scale-95 shadow-sm'
                  : 'bg-gradient-to-r from-emerald-600 to-green-600 shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:brightness-110'
              }`}
            >
              <Play size={14} fill="currentColor" /> RESUME
            </button>
          )}

          {/* Stop / Abort Button */}
          {(isRunning || isPaused) && (
            <button
              onClick={onStop}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-xs font-bold uppercase transition ${
                isLight
                  ? 'border border-[#FDA4AF] bg-[#FFE4E6] text-[#BE123C] hover:bg-[#FECDD3] active:scale-95'
                  : 'border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50'
              }`}
              title="Abort Simulation"
            >
              <Square size={13} fill="currentColor" /> ABORT
            </button>
          )}

          {/* Reset Arena */}
          <button
            onClick={onReset}
            disabled={isRunning}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-xs font-bold uppercase transition disabled:opacity-40 disabled:cursor-not-allowed ${
              isLight
                ? 'border border-[#FED7AA] bg-[#FFFDFB] text-[#78350F] hover:bg-[#FEF3C7] active:scale-95'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Reset Simulation State"
          >
            <RotateCcw size={13} /> RESET
          </button>
        </div>
      </div>
    </div>
  );
};
