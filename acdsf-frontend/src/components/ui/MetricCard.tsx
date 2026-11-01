import type { LucideIcon } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { HoloCard } from './HoloCard';
import { useTheme } from '../../utils/theme';

export function MetricCard({
  label,
  value,
  suffix,
  detail,
  icon: Icon,
  tone = 'cyan',
}: {
  label: string;
  value: number | string;
  suffix?: string;
  detail?: string;
  icon: LucideIcon;
  tone?: 'cyan' | 'red' | 'ok' | 'warn' | 'violet';
}) {
  const { isLight } = useTheme();

  const darkTones = {
    cyan: {
      cardGlow: 'cyan' as const,
      iconBg: 'from-cyan-500/25 to-blue-600/20 text-[#00f5ff] border-cyan-400/40 shadow-[0_0_15px_rgba(0,245,255,0.3)]',
      glowOrb: 'from-cyan-500/20 to-transparent',
      textVal: 'text-white group-hover:text-cyan-200',
    },
    red: {
      cardGlow: 'magenta' as const,
      iconBg: 'from-pink-500/25 to-rose-600/20 text-[#ff007f] border-pink-500/40 shadow-[0_0_15px_rgba(255,0,127,0.3)]',
      glowOrb: 'from-pink-500/20 to-transparent',
      textVal: 'text-white group-hover:text-pink-200',
    },
    ok: {
      cardGlow: 'acid' as const,
      iconBg: 'from-emerald-500/25 to-teal-600/20 text-[#00ff9d] border-emerald-400/40 shadow-[0_0_15px_rgba(0,255,157,0.3)]',
      glowOrb: 'from-emerald-500/20 to-transparent',
      textVal: 'text-white group-hover:text-emerald-200',
    },
    warn: {
      cardGlow: 'multi' as const,
      iconBg: 'from-amber-500/25 to-orange-600/20 text-amber-300 border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.3)]',
      glowOrb: 'from-amber-500/20 to-transparent',
      textVal: 'text-white group-hover:text-amber-200',
    },
    violet: {
      cardGlow: 'violet' as const,
      iconBg: 'from-purple-500/25 to-violet-600/20 text-[#a855f7] border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
      glowOrb: 'from-purple-500/20 to-transparent',
      textVal: 'text-white group-hover:text-purple-200',
    },
  };

  const lightTones = {
    cyan: {
      cardGlow: 'cyan' as const,
      iconBg: 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD] shadow-sm',
      glowOrb: 'hidden',
      textVal: 'text-[#0F172A]',
    },
    red: {
      cardGlow: 'magenta' as const,
      iconBg: 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA] shadow-sm',
      glowOrb: 'hidden',
      textVal: 'text-[#0F172A]',
    },
    ok: {
      cardGlow: 'acid' as const,
      iconBg: 'bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0] shadow-sm',
      glowOrb: 'hidden',
      textVal: 'text-[#0F172A]',
    },
    warn: {
      cardGlow: 'multi' as const,
      iconBg: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A] shadow-sm',
      glowOrb: 'hidden',
      textVal: 'text-[#0F172A]',
    },
    violet: {
      cardGlow: 'violet' as const,
      iconBg: 'bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE] shadow-sm',
      glowOrb: 'hidden',
      textVal: 'text-[#0F172A]',
    },
  };

  const tones = isLight ? lightTones : darkTones;
  const currentTone = tones[tone] || tones.cyan;

  return (
    <HoloCard glowColor={currentTone.cardGlow} className="group p-4 transition-all">
      {!isLight && (
        <div className={`pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${currentTone.glowOrb} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
      )}
      
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${currentTone.iconBg} transition-transform duration-300 group-hover:scale-105`}>
          <Icon size={18} />
        </div>
        <span className={`font-mono text-[9px] tracking-widest uppercase ${isLight ? 'text-slate-500 font-semibold' : 'text-slate-500'}`}>TELEMETRY</span>
      </div>

      <p className={`mt-3 font-mono text-[10px] uppercase tracking-[0.2em] ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>{label}</p>
      
      <div className={`mt-1 font-display text-2xl font-bold tracking-wide ${currentTone.textVal} transition-colors`}>
        {typeof value === 'number' ? (
          <AnimatedCounter value={value} suffix={suffix} decimals={suffix === '%' ? 1 : 0} />
        ) : (
          value
        )}
      </div>

      {detail && (
        <div className={`mt-2 flex items-center justify-between border-t pt-2 text-[11px] ${
          isLight ? 'border-[#E2E8F0] text-slate-600' : 'border-white/5 text-slate-400'
        }`}>
          <span>{detail}</span>
          <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-[#0284C7]' : 'bg-cyan-400/60 animate-pulse'}`} />
        </div>
      )}
    </HoloCard>
  );
}
