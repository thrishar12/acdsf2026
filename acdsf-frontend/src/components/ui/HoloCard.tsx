import React from 'react';
import { useTheme } from '../../utils/theme';

interface HoloCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'magenta' | 'acid' | 'violet' | 'multi';
  onClick?: () => void;
  enableTilt?: boolean;
}

export function HoloCard({
  children,
  className = '',
  glowColor = 'multi',
  onClick,
}: HoloCardProps) {
  const { isLight } = useTheme();

  const glowStyles = {
    multi:   'border-cyan-400/30 hover:border-cyan-400/60 shadow-[0_0_20px_rgba(0,245,255,0.08)] hover:shadow-[0_0_35px_rgba(0,245,255,0.18)]',
    cyan:    'border-cyan-400/40 hover:border-cyan-300/80 shadow-[0_0_20px_rgba(0,245,255,0.12)] hover:shadow-[0_0_40px_rgba(0,245,255,0.25)]',
    magenta: 'border-pink-500/40 hover:border-pink-400/80 shadow-[0_0_20px_rgba(255,0,127,0.12)] hover:shadow-[0_0_40px_rgba(255,0,127,0.25)]',
    acid:    'border-emerald-400/40 hover:border-emerald-300/80 shadow-[0_0_20px_rgba(0,255,157,0.12)] hover:shadow-[0_0_40px_rgba(0,255,157,0.25)]',
    violet:  'border-purple-500/40 hover:border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.12)] hover:shadow-[0_0_40px_rgba(168,85,247,0.25)]',
  };

  const lightGlowStyles = {
    multi:   'border-[#E2E8F0] shadow-sm hover:border-[#0284C7]/50 hover:shadow-md',
    cyan:    'border-[#E2E8F0] shadow-sm hover:border-[#0284C7]/50 hover:shadow-md',
    magenta: 'border-[#E2E8F0] shadow-sm hover:border-[#DC2626]/50 hover:shadow-md',
    acid:    'border-[#E2E8F0] shadow-sm hover:border-[#16A34A]/50 hover:shadow-md',
    violet:  'border-[#E2E8F0] shadow-sm hover:border-[#7C3AED]/50 hover:shadow-md',
  };

  return (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl border
        transition-all duration-300 ease-out
        ${isLight ? `bg-white ${lightGlowStyles[glowColor]}` : `bg-gradient-to-br from-[#0b1528]/85 via-[#060e1d]/90 to-[#030814]/95 backdrop-blur-xl ${glowStyles[glowColor]}`}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Holographic corner tech markers (Dark only) */}
      {!isLight && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-cyan-400/50 transition-colors duration-300 group-hover:border-cyan-400/90" />
          <div className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-cyan-400/50 transition-colors duration-300 group-hover:border-cyan-400/90" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-cyan-400/50 transition-colors duration-300 group-hover:border-cyan-400/90" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-cyan-400/50 transition-colors duration-300 group-hover:border-cyan-400/90" />

          {/* Subtle inner glow on hover */}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,255,0.06) 0%, transparent 70%)' }}
          />
        </>
      )}

      {/* Card content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

