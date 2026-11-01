import React from 'react';
import { Trophy, Skull, Shield, CheckCircle2, Download, X, RotateCcw } from 'lucide-react';
import { HoloCard } from '../ui/HoloCard';
import { useTheme } from '../../utils/theme';

interface ResultsModalProps {
  summary: any;
  onClose: () => void;
  onRematch: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({ summary, onClose, onRematch }) => {
  const { isLight } = useTheme();
  if (!summary) return null;

  const winner = summary.winner || 'DRAW';
  const isRedWinner = winner === 'RED';
  const isBlueWinner = winner === 'BLUE';

  const downloadReport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(summary, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `simulation-report-${summary.simulation_id || 'run'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${
      isLight ? 'bg-black/30' : 'bg-black/80'
    }`}>
      <div className={`relative w-full max-w-lg overflow-hidden rounded-3xl border p-6 shadow-2xl transition-all duration-300 ${
        isLight
          ? 'border-[#E2E8F0] bg-white text-[#0F172A]'
          : 'border-white/20 bg-[#070d1a] text-white'
      }`}>
        {/* Glow Header Background */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-20"
          style={{
            background: isRedWinner
              ? 'radial-gradient(ellipse at top, #DC2626, transparent 70%)'
              : 'radial-gradient(ellipse at top, #0284C7, transparent 70%)',
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute right-4 top-4 rounded-xl p-1.5 transition ${
            isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <X size={18} />
        </button>

        {/* Victory Icon & Title */}
        <div className="relative z-10 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${
              isRedWinner
                ? isLight
                  ? 'border-[#FECACA] bg-[#FEE2E2] text-[#DC2626] shadow-sm'
                  : 'border-pink-500/50 bg-pink-950/60 text-pink-400 shadow-[0_0_25px_rgba(255,0,127,0.5)]'
                : isLight
                ? 'border-[#BAE6FD] bg-[#E0F2FE] text-[#0284C7] shadow-sm'
                : 'border-cyan-500/50 bg-cyan-950/60 text-cyan-400 shadow-[0_0_25px_rgba(0,245,255,0.5)]'
            }`}
          >
            {isRedWinner ? <Skull size={32} /> : <Shield size={32} />}
          </div>

          <h2 className={`mt-4 font-display text-2xl font-black uppercase tracking-wider ${
            isLight ? 'text-[#0F172A]' : 'text-white'
          }`}>
            {isRedWinner ? 'RED TEAM ADVANCEMENT VICTORY' : isBlueWinner ? 'BLUE TEAM DEFENSIVE CONTAINMENT' : 'STALEMATE / DRAW'}
          </h2>
          <p className={`mt-1 font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {summary.message || 'Simulation round objectives completed.'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 font-mono text-xs">
          <div className={`rounded-xl p-3 border text-center ${
            isLight ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-black/50 border-pink-500/20'
          }`}>
            <span className={`text-[10px] block uppercase ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-500'}`}>Red Team Score</span>
            <span className={`text-xl font-black ${isLight ? 'text-[#DC2626]' : 'text-pink-400'}`}>{summary.red_wins ?? 0} Wins</span>
          </div>
          <div className={`rounded-xl p-3 border text-center ${
            isLight ? 'bg-[#F0F9FF] border-[#BAE6FD]' : 'bg-black/50 border-cyan-500/20'
          }`}>
            <span className={`text-[10px] block uppercase ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-500'}`}>Blue Team Score</span>
            <span className={`text-xl font-black ${isLight ? 'text-[#0284C7]' : 'text-cyan-400'}`}>{summary.blue_wins ?? 0} Wins</span>
          </div>
          <div className={`rounded-xl p-3 border text-center ${
            isLight ? 'bg-[#F8FAFC] border-[#E2E8F0]' : 'bg-black/50 border-white/10'
          }`}>
            <span className={`text-[10px] block uppercase ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Rounds Completed</span>
            <span className={`text-base font-bold ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>{summary.total_rounds ?? 0}</span>
          </div>
          <div className={`rounded-xl p-3 border text-center ${
            isLight ? 'bg-[#F8FAFC] border-[#E2E8F0]' : 'bg-black/50 border-white/10'
          }`}>
            <span className={`text-[10px] block uppercase ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Simulation Run</span>
            <span className={`text-[10px] font-bold truncate block ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              {summary.simulation_id || 'ID-LIVE'}
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4 font-mono text-xs ${
          isLight ? 'border-[#E2E8F0]' : 'border-white/10'
        }`}>
          <button
            onClick={downloadReport}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-bold transition ${
              isLight
                ? 'border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] hover:bg-slate-100'
                : 'border-white/20 bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
          >
            <Download size={14} /> EXPORT JSON
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`rounded-xl px-4 py-2 transition ${
                isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white'
              }`}
            >
              CLOSE
            </button>
            <button
              onClick={onRematch}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-bold uppercase text-white shadow-sm transition hover:brightness-105 ${
                isLight ? 'bg-[#0284C7]' : 'bg-gradient-to-r from-pink-600 to-cyan-600 shadow-lg'
              }`}
            >
              <RotateCcw size={14} /> REMATCH
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
