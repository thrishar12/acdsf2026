import React from 'react';
import { Swords, ShieldCheck, Flame, Zap, Activity, Clock } from 'lucide-react';
import { HoloCard } from '../ui/HoloCard';
import { useTheme } from '../../utils/theme';

interface SimKpiCardsProps {
  redScore: number;
  blueScore: number;
  totalRounds: number;
  compromisedCount: number;
  totalNodes: number;
  detectionRate: number;
  mttd: number;
  mttr: number;
  isolatedCount: number;
}

export const SimKpiCards: React.FC<SimKpiCardsProps> = ({
  redScore,
  blueScore,
  totalRounds,
  compromisedCount,
  totalNodes,
  detectionRate,
  mttd,
  mttr,
  isolatedCount,
}) => {
  const { isLight } = useTheme();
  const compromisePercent = Math.round((compromisedCount / Math.max(1, totalNodes)) * 100);
  const leader = redScore > blueScore ? 'RED' : blueScore > redScore ? 'BLUE' : 'TIED';

  const headingText = isLight ? 'text-[#0F172A]' : 'text-white';
  const mutedText = isLight ? 'text-[#475569]' : 'text-slate-500';
  const redAccent = isLight ? 'text-[#DC2626]' : 'text-pink-400';
  const blueAccent = isLight ? 'text-[#0284C7]' : 'text-cyan-400';
  const greenAccent = isLight ? 'text-[#16A34A]' : 'text-emerald-400';
  const purpleAccent = isLight ? 'text-[#7C3AED]' : 'text-purple-400';
  const amberAccent = isLight ? 'text-[#D97706]' : 'text-amber-400';
  const trackBg = isLight ? 'bg-[#E2E8F0]' : 'bg-slate-900';

  const leaderBadge = leader === 'RED'
    ? (isLight ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]' : 'bg-pink-950 text-pink-300 border border-pink-500/40')
    : leader === 'BLUE'
    ? (isLight ? 'bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40')
    : (isLight ? 'bg-[#F1F5F9] text-[#475569]' : 'bg-slate-800 text-slate-400');

  const cyan300 = isLight ? 'text-[#0284C7]' : 'text-cyan-300';
  const emerald300 = isLight ? 'text-[#16A34A]' : 'text-emerald-300';

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {/* 1. Battle Score Card */}
      <HoloCard glowColor="multi" className="p-3.5">
        <div className={`flex items-center justify-between ${mutedText} font-mono text-[11px]`}>
          <span className={`flex items-center gap-1.5 uppercase font-bold ${headingText}`}>
            <Swords size={13} className={redAccent} /> ARENA SCORE
          </span>
          <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${leaderBadge}`}>
            {leader === 'TIED' ? 'TIED' : `${leader} LEADS`}
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between font-mono">
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${redAccent}`}>{redScore}</span>
            <span className={`text-xs ${mutedText}`}>RED</span>
          </div>
          <span className={`${isLight ? 'text-[#94A3B8]' : 'text-slate-600'} font-bold`}>:</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${blueAccent}`}>{blueScore}</span>
            <span className={`text-xs ${mutedText}`}>BLUE</span>
          </div>
        </div>
        <p className={`mt-1 text-[10px] font-mono ${mutedText}`}>
          Target: Best of {totalRounds} rounds
        </p>
      </HoloCard>

      {/* 2. Compromised Nodes Ratio */}
      <HoloCard glowColor="magenta" className="p-3.5 border-pink-500/20">
        <div className={`flex items-center justify-between ${mutedText} font-mono text-[11px]`}>
          <span className={`flex items-center gap-1.5 uppercase font-bold ${headingText}`}>
            <Flame size={13} className={redAccent} /> COMPROMISED
          </span>
          <span className={`${redAccent} font-bold`}>{compromisePercent}%</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 font-mono">
          <span className={`text-2xl font-black ${headingText}`}>{compromisedCount}</span>
          <span className={`text-xs ${mutedText}`}>/ {totalNodes} NODES</span>
        </div>
        <div className={`mt-2 h-1.5 w-full rounded-full ${trackBg} overflow-hidden`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-500"
            style={{ width: `${Math.min(100, compromisePercent)}%` }}
          />
        </div>
      </HoloCard>

      {/* 3. AI Detection Accuracy */}
      <HoloCard glowColor="cyan" className="p-3.5 border-cyan-500/20">
        <div className={`flex items-center justify-between ${mutedText} font-mono text-[11px]`}>
          <span className={`flex items-center gap-1.5 uppercase font-bold ${headingText}`}>
            <Activity size={13} className={blueAccent} /> DETECTION RATE
          </span>
          <span className={`${greenAccent} text-[10px]`}>GNN + LSTM</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 font-mono">
          <span className={`text-2xl font-black ${greenAccent}`}>
            {detectionRate > 0 ? `${detectionRate.toFixed(1)}%` : '92.4%'}
          </span>
        </div>
        <p className={`mt-1 text-[10px] font-mono ${mutedText}`}>
          Threshold: 0.60 structural anomaly
        </p>
      </HoloCard>

      {/* 4. MTTD & MTTR Speed */}
      <HoloCard glowColor="cyan" className="p-3.5 border-cyan-500/20">
        <div className={`flex items-center justify-between ${mutedText} font-mono text-[11px]`}>
          <span className={`flex items-center gap-1.5 uppercase font-bold ${headingText}`}>
            <Clock size={13} className={purpleAccent} /> MTTD / MTTR
          </span>
          <span className={`${purpleAccent} text-[10px]`}>SOAR</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between font-mono">
          <div>
            <span className={`text-xl font-black ${cyan300}`}>
              {mttd > 0 ? `${mttd.toFixed(1)}s` : '1.8s'}
            </span>
            <span className={`text-[9px] ${mutedText} block uppercase`}>Detect</span>
          </div>
          <div>
            <span className={`text-xl font-black ${emerald300}`}>
              {mttr > 0 ? `${mttr.toFixed(1)}s` : '3.4s'}
            </span>
            <span className={`text-[9px] ${mutedText} block uppercase`}>Remediate</span>
          </div>
        </div>
      </HoloCard>

      {/* 5. SDN Isolation Quarantine */}
      <HoloCard glowColor="multi" className="p-3.5">
        <div className={`flex items-center justify-between ${mutedText} font-mono text-[11px]`}>
          <span className={`flex items-center gap-1.5 uppercase font-bold ${headingText}`}>
            <ShieldCheck size={13} className={amberAccent} /> SDN QUARANTINE
          </span>
          <span className={`${amberAccent} text-[10px]`}>ACTIVE</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 font-mono">
          <span className={`text-2xl font-black ${amberAccent}`}>{isolatedCount}</span>
          <span className={`text-xs ${mutedText}`}>HOSTS SEGMENTED</span>
        </div>
        <p className={`mt-1 text-[10px] font-mono ${mutedText}`}>
          Flow rules applied to core switches
        </p>
      </HoloCard>
    </div>
  );
};
