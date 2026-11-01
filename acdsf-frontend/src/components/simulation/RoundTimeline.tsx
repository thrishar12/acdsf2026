import React from 'react';
import { Skull, Shield, HelpCircle, CheckCircle2 } from 'lucide-react';
import { HoloCard } from '../ui/HoloCard';
import { useTheme } from '../../utils/theme';

interface RoundResult {
  round: number;
  winner: 'RED' | 'BLUE' | 'DRAW';
  red_reward: number;
  blue_reward: number;
  red_technique: string;
  blue_action: string;
  target: string;
  detected: boolean;
  red_success: boolean;
}

interface RoundTimelineProps {
  currentRound: number;
  totalRounds: number;
  roundResults: RoundResult[];
}

export const RoundTimeline: React.FC<RoundTimelineProps> = ({
  currentRound,
  totalRounds,
  roundResults,
}) => {
  const { isLight } = useTheme();

  return (
    <HoloCard glowColor="multi" className="p-4">
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2 mb-3 ${
        isLight ? 'border-[#E2E8F0]' : 'border-white/10'
      }`}>
        <span className={`font-mono text-xs font-bold uppercase tracking-wider ${
          isLight ? 'text-[#0F172A]' : 'text-white'
        }`}>
          ROUND PROGRESSION & VICTORY TIMELINE
        </span>
        <div className={`flex items-center gap-3 font-mono text-[10px] ${
          isLight ? 'text-slate-600 font-medium' : 'text-slate-400'
        }`}>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-600" /> RED VICTORY
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-600" /> BLUE VICTORY
          </span>
          <span className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${isLight ? 'bg-slate-300' : 'bg-slate-700'}`} /> PENDING
          </span>
        </div>
      </div>

      {/* Horizontal Strip of Rounds */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Array.from({ length: totalRounds }).map((_, idx) => {
          const roundNum = idx + 1;
          const result = roundResults.find((r) => r.round === roundNum);
          const isCurrent = currentRound === roundNum;
          const isPending = roundNum > currentRound;

          const isRedWin = result?.winner === 'RED';
          const isBlueWin = result?.winner === 'BLUE';

          return (
            <div
              key={roundNum}
              className={`flex flex-col items-center justify-center rounded-xl p-2 font-mono transition border ${
                isCurrent
                  ? isLight
                    ? 'border-[#0284C7] bg-[#E0F2FE] shadow-sm'
                    : 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(0,245,255,0.4)] animate-pulse'
                  : isRedWin
                  ? isLight
                    ? 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]'
                    : 'border-pink-500/50 bg-pink-950/30 text-pink-300'
                  : isBlueWin
                  ? isLight
                    ? 'border-[#BAE6FD] bg-[#F0F9FF] text-[#0284C7]'
                    : 'border-cyan-500/50 bg-cyan-950/30 text-cyan-300'
                  : isPending
                  ? isLight
                    ? 'border-[#E2E8F0] bg-[#F8FAFC] text-slate-400'
                    : 'border-white/5 bg-black/30 text-slate-600'
                  : isLight
                  ? 'border-[#CBD5E1] bg-white text-slate-600'
                  : 'border-white/10 bg-black/40 text-slate-400'
              }`}
            >
              <span className={`text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>R{roundNum}</span>
              <div className="my-1">
                {isRedWin ? (
                  <Skull size={15} className={isLight ? 'text-[#DC2626]' : 'text-pink-400'} />
                ) : isBlueWin ? (
                  <Shield size={15} className={isLight ? 'text-[#0284C7]' : 'text-cyan-400'} />
                ) : isCurrent ? (
                  <span className={`h-2 w-2 rounded-full ${isLight ? 'bg-[#0284C7]' : 'bg-cyan-400 animate-ping'}`} />
                ) : (
                  <span className={`text-xs ${isLight ? 'text-slate-300' : 'text-slate-600'}`}>•</span>
                )}
              </div>
              <span className="text-[9px] font-bold uppercase truncate max-w-full">
                {isRedWin ? 'RED' : isBlueWin ? 'BLUE' : isCurrent ? 'ACTIVE' : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </HoloCard>
  );
};
