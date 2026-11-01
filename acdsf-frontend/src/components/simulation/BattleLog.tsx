import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Shield, Flame, Activity, Filter, Copy, ArrowDownCircle } from 'lucide-react';
import { BattleLogEntry } from '../../hooks/useSimulation';
import { useTheme } from '../../utils/theme';

interface BattleLogProps {
  logs: BattleLogEntry[];
}

export const BattleLog: React.FC<BattleLogProps> = ({ logs }) => {
  const { isLight } = useTheme();
  const [filter, setFilter] = useState<'ALL' | 'RED' | 'BLUE' | 'ENV' | 'SYSTEM'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((l) => {
    if (filter !== 'ALL' && l.actor !== filter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        l.message.toLowerCase().includes(q) ||
        (l.target && l.target.toLowerCase().includes(q)) ||
        (l.mitreId && l.mitreId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0; // Newest at top
    }
  }, [logs, autoScroll]);

  const copyLogText = () => {
    const text = filteredLogs
      .map(
        (l) =>
          `[${l.timestamp}] [R${l.round} S${l.step}] [${l.actor}] ${l.message} ${
            l.mitreId ? `(${l.mitreId})` : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={`flex flex-col rounded-2xl border p-4 transition-all duration-300 ${
      isLight ? 'border-[#E2E8F0] bg-white shadow-sm' : 'border-white/10 bg-[#050914] shadow-xl'
    }`}>
      {/* Terminal Title Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${
        isLight ? 'border-[#E2E8F0]' : 'border-white/10'
      }`}>
        <div className="flex items-center gap-2">
          <Terminal size={15} className={isLight ? 'text-[#0284C7]' : 'text-cyan-400'} />
          <span className={`font-mono text-xs font-bold uppercase tracking-wider ${
            isLight ? 'text-[#0F172A]' : 'text-white'
          }`}>
            LIVE WARFARE LOG STREAM
          </span>
          <span className={`rounded px-2 py-0.5 font-mono text-[10px] border ${
            isLight ? 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]' : 'bg-black/60 text-slate-400 border-white/10'
          }`}>
            {filteredLogs.length} EVENTS
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {(['ALL', 'RED', 'BLUE', 'ENV', 'SYSTEM'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold transition ${
                filter === f
                  ? f === 'RED'
                    ? isLight
                      ? 'bg-[#DC2626] text-white shadow-sm'
                      : 'bg-pink-600 text-white shadow-[0_0_8px_rgba(255,0,127,0.4)]'
                    : f === 'BLUE'
                    ? isLight
                      ? 'bg-[#0284C7] text-white shadow-sm'
                      : 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(0,245,255,0.4)]'
                    : isLight
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'bg-white/20 text-white'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={copyLogText}
            className={`ml-2 p-1.5 rounded transition ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Copy logs to clipboard"
          >
            <Copy size={13} />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="my-2">
        <input
          type="text"
          placeholder="Filter by target, MITRE technique (e.g. T1595), or keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full rounded-xl border px-3 py-1.5 font-mono text-xs focus:outline-none ${
            isLight
              ? 'border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-slate-400 focus:border-[#0284C7]'
              : 'border-white/10 bg-black/50 text-white placeholder-slate-600 focus:border-cyan-500/50'
          }`}
        />
      </div>

      {/* Log Feed Body */}
      <div
        ref={logContainerRef}
        className={`h-80 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-1 scrollbar-thin ${
          isLight ? 'scrollbar-thumb-slate-300' : 'scrollbar-thumb-slate-800'
        }`}
      >
        {filteredLogs.length > 0 ? (
          filteredLogs.map((entry) => {
            const isRed = entry.actor === 'RED';
            const isBlue = entry.actor === 'BLUE';
            const isEnv = entry.actor === 'ENV';
            const isSys = entry.actor === 'SYSTEM';

            return (
              <div
                key={entry.id}
                className={`flex items-start gap-2 rounded-lg p-2 transition border ${
                  isLight
                    ? isRed
                      ? 'border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2]'
                      : isBlue
                      ? 'border-[#BAE6FD] bg-[#F0F9FF] hover:bg-[#E0F2FE]'
                      : isSys
                      ? 'border-[#E9D5FF] bg-[#FAF5FF] hover:bg-[#F3E8FF]'
                      : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9]'
                    : isRed
                    ? 'border-pink-500/20 bg-pink-950/20 hover:bg-pink-950/30'
                    : isBlue
                    ? 'border-cyan-500/20 bg-cyan-950/20 hover:bg-cyan-950/30'
                    : isSys
                    ? 'border-purple-500/20 bg-purple-950/20 hover:bg-purple-950/30'
                    : 'border-white/5 bg-black/30 hover:bg-black/40'
                }`}
              >
                {/* Timestamp */}
                <span className={`shrink-0 text-[10px] pt-0.5 ${isLight ? 'text-slate-500 font-medium' : 'text-slate-500'}`}>
                  {entry.timestamp}
                </span>

                {/* Actor Pill */}
                <span
                  className={`shrink-0 rounded px-1.5 py-0.2 text-[9px] font-bold ${
                    isLight
                      ? isRed
                        ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                        : isBlue
                        ? 'bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]'
                        : isSys
                        ? 'bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE]'
                        : 'bg-slate-200 text-slate-700'
                      : isRed
                      ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
                      : isBlue
                      ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                      : isSys
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {entry.actor}
                </span>

                {/* Round/Step tag */}
                {entry.round > 0 && (
                  <span className={`shrink-0 text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                    [R{entry.round}.S{entry.step}]
                  </span>
                )}

                {/* Message & Tags */}
                <div className="flex-1">
                  <span className={`leading-relaxed ${
                    isLight
                      ? isRed
                        ? 'text-[#991B1B] font-medium'
                        : isBlue
                        ? 'text-[#075985] font-medium'
                        : 'text-[#0F172A]'
                      : isRed
                      ? 'text-pink-100'
                      : isBlue
                      ? 'text-cyan-100'
                      : 'text-slate-300'
                  }`}>
                    {entry.message}
                  </span>

                  {entry.mitreId && (
                    <span className={`ml-2 inline-block rounded px-1.5 py-0.2 text-[10px] font-bold border ${
                      isLight
                        ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                        : 'bg-black/60 text-pink-300 border border-pink-500/30'
                    }`}>
                      {entry.mitreId}
                    </span>
                  )}
                  {entry.target && (
                    <span className={`ml-1 inline-block rounded px-1.5 py-0.2 text-[10px] font-bold border ${
                      isLight
                        ? 'bg-[#F0F9FF] text-[#0284C7] border-[#BAE6FD]'
                        : 'bg-black/60 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      → {entry.target}
                    </span>
                  )}
                  {entry.explanation && (
                    <p className={`mt-1 text-[10px] italic ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {entry.explanation}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className={`flex h-full items-center justify-center font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>
            No events logged yet. Start battle to stream real-time events.
          </div>
        )}
      </div>
    </div>
  );
};
