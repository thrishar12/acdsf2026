import React from 'react';
import { PulseBeacon } from './CyberIcons';
import { useTheme } from '../../utils/theme';

interface CyberBadgeProps {
  label: string;
  tone?: 'cyan' | 'magenta' | 'acid' | 'violet' | 'warn';
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  prefix?: string;
}

export function CyberBadge({
  label,
  tone = 'cyan',
  dot = true,
  size = 'md',
  className = '',
  prefix,
}: CyberBadgeProps) {
  const { isLight } = useTheme();

  const darkToneMap = {
    cyan: 'border-cyan-400/35 bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_rgba(0,245,255,0.15)]',
    magenta: 'border-pink-500/35 bg-pink-950/40 text-pink-300 shadow-[0_0_12px_rgba(255,0,127,0.15)]',
    acid: 'border-emerald-400/35 bg-emerald-950/40 text-emerald-300 shadow-[0_0_12px_rgba(0,255,157,0.15)]',
    violet: 'border-purple-500/35 bg-purple-950/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]',
    warn: 'border-amber-400/35 bg-amber-950/40 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.15)]',
  };

  const lightToneMap = {
    cyan: 'border-[#BAE6FD] bg-[#E0F2FE] text-[#0369A1] shadow-none',
    magenta: 'border-[#FECACA] bg-[#FEE2E2] text-[#DC2626] shadow-none',
    acid: 'border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D] shadow-none',
    violet: 'border-[#DDD6FE] bg-[#EDE9FE] text-[#6D28D9] shadow-none',
    warn: 'border-[#FDE68A] bg-[#FEF3C7] text-[#B45309] shadow-none',
  };

  const toneMap = isLight ? lightToneMap : darkToneMap;
  const beaconTone = tone === 'violet' ? 'cyan' : tone;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-mono tracking-widest backdrop-blur-md ${
        size === 'sm' ? 'px-2.5 py-0.5 text-[9px]' : 'px-3.5 py-1 text-[10px]'
      } uppercase ${toneMap[tone]} ${className}`}
    >
      {dot && <PulseBeacon color={beaconTone as 'cyan' | 'magenta' | 'acid' | 'warn'} size={size === 'sm' ? 'sm' : 'md'} />}
      {prefix && <span className="opacity-60">{prefix} //</span>}
      <span className="font-semibold">{label}</span>
    </span>
  );
}
