import type { ReactNode } from 'react';

export function GlassCard({
  children,
  className = '',
  onClick,
  tone = 'default',
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  tone?: 'default' | 'cyan' | 'magenta' | 'acid' | 'violet';
}) {
  const Tag = onClick ? 'button' : 'div';

  const borderTone = {
    default: 'border-cyan-500/20 hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(0,245,255,0.12)]',
    cyan: 'border-cyan-400/35 hover:border-cyan-300 hover:shadow-[0_0_25px_rgba(0,245,255,0.2)]',
    magenta: 'border-rose-500/30 hover:border-rose-400 hover:shadow-[0_0_25px_rgba(255,0,127,0.2)]',
    acid: 'border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(0,255,157,0.2)]',
    violet: 'border-purple-500/30 hover:border-purple-400 hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]',
  };

  return (
    <Tag
      onClick={onClick}
      className={`holo-glass group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${borderTone[tone]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="holo-shimmer" />
      <div className="relative z-10">{children}</div>
    </Tag>
  );
}
