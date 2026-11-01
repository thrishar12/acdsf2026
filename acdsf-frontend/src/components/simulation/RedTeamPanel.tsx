import React from 'react';
import { Skull, Target, Zap, Crosshair, Award, Flame, ChevronRight, Activity } from 'lucide-react';
import { HoloCard } from '../ui/HoloCard';
import { CyberBadge } from '../ui/CyberBadge';
import { ActiveAttackVisual } from '../../hooks/useSimulation';
import { useTheme } from '../../utils/theme';

interface RedTeamPanelProps {
  redState: {
    stage: number;
    stageName: string;
    cumulativeReward: number;
    epsilon: number;
    compromisedCount: number;
    techniquesUsed: string[];
    recentTargets: string[];
  };
  activeAttack: ActiveAttackVisual | null;
  scenario: string;
}

const KILL_CHAIN_STEPS = [
  { stage: 1, name: 'Reconnaissance', mitre: 'TA0043', desc: 'Active scanning & target host enumeration' },
  { stage: 2, name: 'Initial Access', mitre: 'TA0001', desc: 'Spearphishing or public service exploits' },
  { stage: 3, name: 'Execution', mitre: 'TA0002', desc: 'Command interpreters & persistence hooks' },
  { stage: 4, name: 'Privilege Escalation', mitre: 'TA0004', desc: 'Exploiting elevation controls & tokens' },
  { stage: 5, name: 'Lateral Movement', mitre: 'TA0008', desc: 'Pivoting across subnets to high-value nodes' },
  { stage: 6, name: 'Exfiltration / Impact', mitre: 'TA0010', desc: 'Data theft, service denial, or encryption' },
];

export const RedTeamPanel: React.FC<RedTeamPanelProps> = ({
  redState,
  activeAttack,
  scenario,
}) => {
  const { isLight } = useTheme();

  const headingText = isLight ? 'text-[#0F172A]' : 'text-white';
  const accentRed = isLight ? 'text-[#DC2626]' : 'text-pink-400';
  const modeText = isLight ? 'text-[#475569]' : 'text-slate-400';
  const labelText = isLight ? 'text-[#475569]' : 'text-slate-500';
  const metricBg = isLight ? 'bg-white border-[#E2E8F0]' : 'bg-black/40 border-pink-500/10';
  const headerBorder = isLight ? 'border-[#FECACA]' : 'border-pink-500/20';
  const activePanelBg = isLight ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-pink-950/20 border-pink-500/30';
  const mitreTagBg = isLight ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]' : 'bg-pink-500/20 text-pink-300 border-pink-500/40';
  const soarBorder = isLight ? 'border-[#E2E8F0]' : 'border-white/10';
  const targetChipBg = isLight ? 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]' : 'border-pink-500/40 bg-pink-950/30 text-pink-300';

  return (
    <div className="flex flex-col gap-4">
      {/* Header Card */}
      <HoloCard glowColor="magenta" className="p-4 border-pink-500/30">
        <div className={`flex items-center justify-between border-b ${headerBorder} pb-3`}>
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${isLight ? 'bg-[#FEE2E2] border-[#FECACA] text-[#DC2626]' : 'bg-pink-950/60 border-pink-500/40 text-pink-400 shadow-[0_0_15px_rgba(255,0,127,0.4)]'}`}>
              <Skull size={18} />
            </div>
            <div>
              <h3 className={`font-display text-sm font-bold tracking-wider ${headingText}`}>
                RED TEAM AI // ADVERSARY
              </h3>
              <p className={`font-mono text-[10px] ${accentRed}`}>
                DQN AGENT • 6-STAGE MITRE KILLCHAIN
              </p>
            </div>
          </div>
          <CyberBadge label="OFFENSIVE" tone="magenta" />
        </div>

        {/* Quick Agent Metrics */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono text-xs">
          <div className={`rounded-lg ${metricBg} p-2 border`}>
            <span className={`text-[10px] ${labelText} block uppercase`}>Reward</span>
            <span className={`text-base font-bold ${redState.cumulativeReward >= 0 ? accentRed : (isLight ? 'text-[#DC2626]' : 'text-red-500')}`}>
              {redState.cumulativeReward > 0 ? `+${redState.cumulativeReward.toFixed(1)}` : redState.cumulativeReward.toFixed(1)}
            </span>
          </div>
          <div className={`rounded-lg ${metricBg} p-2 border`}>
            <span className={`text-[10px] ${labelText} block uppercase`}>Compromised</span>
            <span className={`text-base font-bold ${accentRed}`}>
              {redState.compromisedCount} <span className={`text-[10px] ${labelText}`}>/ 43</span>
            </span>
          </div>
          <div className={`rounded-lg ${metricBg} p-2 border`}>
            <span className={`text-[10px] ${labelText} block uppercase`}>Epsilon (ε)</span>
            <span className={`text-base font-bold ${isLight ? 'text-[#D97706]' : 'text-amber-300'}`}>
              {redState.epsilon.toFixed(2)}
            </span>
          </div>
        </div>
      </HoloCard>

      {/* Active Attack Technique Card */}
      <HoloCard glowColor="magenta" className="p-4 border-pink-500/20">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className={`flex items-center gap-1.5 ${accentRed} font-bold`}>
            <Zap size={14} className="animate-pulse" /> CURRENT TECHNIQUE
          </span>
          <span className={`text-[10px] ${modeText} uppercase`}>{scenario} CAMPAIGN</span>
        </div>

        {activeAttack ? (
          <div className={`space-y-2 rounded-xl ${activePanelBg} border p-3`}>
            <div className="flex items-center justify-between">
              <span className={`font-mono text-xs font-bold ${headingText}`}>
                {activeAttack.technique}
              </span>
              <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] border ${mitreTagBg}`}>
                {activeAttack.mitreId}
              </span>
            </div>
            <div className={`flex items-center justify-between text-[11px] font-mono ${modeText}`}>
              <span>Vector: {activeAttack.mitreTactic}</span>
              <span className={`flex items-center gap-1 ${isLight ? 'text-[#0284C7]' : 'text-cyan-300'} font-bold`}>
                Target: {activeAttack.target}
              </span>
            </div>
            <div className={`flex items-center justify-between text-[10px] font-mono border-t ${headerBorder} pt-1.5`}>
              <span className={labelText}>Outcome:</span>
              <span className={`font-bold ${activeAttack.success ? accentRed : modeText}`}>
                {activeAttack.success ? '✓ EXPLOIT SUCCESSFUL' : '✗ DEFLECTED / BLOCKED'}
              </span>
            </div>
          </div>
        ) : (
          <div className={`py-4 text-center font-mono text-xs ${labelText} italic`}>
            Adversary awaiting next round execution...
          </div>
        )}
      </HoloCard>

      {/* 6-Stage MITRE ATT&CK Kill Chain Progress */}
      <HoloCard glowColor="multi" className="p-4">
        <div className={`flex items-center justify-between border-b ${soarBorder} pb-2 mb-3`}>
          <span className={`font-mono text-xs font-bold ${headingText} flex items-center gap-1.5`}>
            <Target size={14} className={accentRed} /> MITRE KILL CHAIN ADVANCEMENT
          </span>
          <span className={`font-mono text-[10px] ${accentRed} font-bold`}>
            STAGE {redState.stage} / 6
          </span>
        </div>

        <div className="space-y-2">
          {KILL_CHAIN_STEPS.map((step) => {
            const isCompleted = step.stage < redState.stage;
            const isCurrent = step.stage === redState.stage;
            const isPending = step.stage > redState.stage;

            const stepBg = isCurrent
              ? (isLight ? 'border-[#DC2626] bg-[#FEF2F2]' : 'border-pink-500 bg-pink-950/40 shadow-[0_0_15px_rgba(255,0,127,0.3)]')
              : isCompleted
              ? (isLight ? 'border-[#FECACA] bg-[#FFF7F7]' : 'border-pink-500/40 bg-black/40 text-slate-300')
              : (isLight ? 'border-[#E2E8F0] bg-[#F8FAFC]' : 'border-white/5 bg-black/20 text-slate-600');

            const stepNumBg = isCurrent
              ? 'bg-[#DC2626] text-white font-extrabold animate-pulse'
              : isCompleted
              ? (isLight ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-pink-900/80 text-pink-300')
              : (isLight ? 'bg-[#F1F5F9] text-[#94A3B8]' : 'bg-slate-800 text-slate-500');

            const nameText = isCurrent ? headingText : (isLight ? 'text-[#475569]' : '');

            return (
              <div key={step.stage} className={`rounded-xl border p-2.5 transition-all ${stepBg}`}>
                <div className="flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${stepNumBg}`}>
                      {step.stage}
                    </span>
                    <span className={`font-bold ${nameText}`}>{step.name}</span>
                  </div>
                  <span className={`text-[10px] ${labelText} font-mono`}>{step.mitre}</span>
                </div>
                {isCurrent && (
                  <p className={`mt-1 text-[10px] ${accentRed} font-mono pl-7`}>{step.desc}</p>
                )}
              </div>
            );
          })}
        </div>
      </HoloCard>

      {/* Target Focus & Techniques Inventory */}
      <HoloCard glowColor="magenta" className="p-4 border-pink-500/20">
        <h4 className={`font-mono text-xs font-bold ${isLight ? 'text-[#475569]' : 'text-slate-300'} uppercase mb-2`}>
          Recent High-Value Targets
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {redState.recentTargets.length > 0 ? (
            redState.recentTargets.map((tgt) => (
              <span
                key={tgt}
                className={`rounded-md border ${targetChipBg} px-2 py-1 font-mono text-[10px]`}
              >
                {tgt}
              </span>
            ))
          ) : (
            <span className={`text-[11px] font-mono ${labelText}`}>None yet (Stage 1 Recon)</span>
          )}
        </div>
      </HoloCard>
    </div>
  );
};
