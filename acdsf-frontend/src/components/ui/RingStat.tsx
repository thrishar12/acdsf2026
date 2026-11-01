import { useTheme } from '../../utils/theme';

export function RingStat({ value, label, color = '#22d3ee' }: { value: number; label: string; color?: string }) {
  const { isLight } = useTheme();
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, value) / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke={isLight ? '#E2E8F0' : '#16324d'} strokeWidth="6" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 38 38)"
          style={{ filter: isLight ? 'none' : `drop-shadow(0 0 6px ${color})` }}
        />
        <text x="38" y="42" textAnchor="middle" fill={isLight ? '#0F172A' : '#e8f1ff'} fontSize="13" fontFamily="Orbitron" fontWeight="bold">
          {value}
        </text>
      </svg>
      <span className={`font-mono text-[10px] uppercase tracking-widest ${isLight ? 'text-[#475569]' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}
