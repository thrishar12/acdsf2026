import { mockGraph } from '../../data/mockData';
import { useTheme } from '../../utils/theme';

export function KnowledgeGraph() {
  const { isLight } = useTheme();
  const actors = [...new Set(mockGraph.map((g) => g.actor))];
  const techs = [...new Set(mockGraph.map((g) => g.technique))];
  const assets = [...new Set(mockGraph.map((g) => g.target))];

  return (
    <div className={`relative min-h-[360px] overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
      isLight ? 'border-[#E2E8F0] bg-white shadow-sm' : 'border-cyan-500/25 bg-[#050c18] shadow-2xl'
    }`}>
      <div
        className={`pointer-events-none absolute inset-0 ${isLight ? 'opacity-15' : 'opacity-25'}`}
        style={{
          backgroundImage: isLight
            ? 'radial-gradient(circle at 50% 50%, rgba(2,132,199,0.1), transparent 60%), linear-gradient(#CBD5E1 1px, transparent 1px), linear-gradient(90deg, #CBD5E1 1px, transparent 1px)'
            : 'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.15), transparent 60%), linear-gradient(rgba(0,245,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.05) 1px, transparent 1px)',
          backgroundSize: 'auto, 32px 32px, 32px 32px',
        }}
      />

      <svg viewBox="0 0 760 360" className="h-full w-full">
        <defs>
          <linearGradient id="linkRedCyan" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={isLight ? '#DC2626' : '#ff007f'} stopOpacity={isLight ? '0.7' : '0.8'} />
            <stop offset="100%" stopColor={isLight ? '#0284C7' : '#00f5ff'} stopOpacity={isLight ? '0.7' : '0.8'} />
          </linearGradient>
          <linearGradient id="linkCyanGreen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={isLight ? '#0284C7' : '#00f5ff'} stopOpacity={isLight ? '0.7' : '0.8'} />
            <stop offset="100%" stopColor={isLight ? '#16A34A' : '#00ff9d'} stopOpacity={isLight ? '0.7' : '0.8'} />
          </linearGradient>
        </defs>

        {/* Dynamic Curved Flow Paths */}
        {mockGraph.map((g, i) => {
          const ax = 120;
          const ay = 60 + actors.indexOf(g.actor) * 95;
          const tx = 380;
          const ty = 45 + techs.indexOf(g.technique) * 52;
          const vx = 650;
          const vy = 55 + assets.indexOf(g.target) * 58;
          return (
            <g key={i}>
              <path
                d={`M${ax + 60},${ay} C ${ax + 170},${ay} ${tx - 110},${ty} ${tx - 80},${ty}`}
                fill="none"
                stroke="url(#linkRedCyan)"
                strokeWidth="1.5"
                strokeDasharray="4 6"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="2s" repeatCount="indefinite" />
              </path>
              <path
                d={`M${tx + 80},${ty} C ${tx + 180},${ty} ${vx - 110},${vy} ${vx - 60},${vy}`}
                fill="none"
                stroke="url(#linkCyanGreen)"
                strokeWidth="1.5"
                strokeDasharray="4 6"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="2.4s" repeatCount="indefinite" />
              </path>
            </g>
          );
        })}

        {/* Threat Actor Nodes */}
        {actors.map((a, i) => (
          <g key={a} transform={`translate(20 ${38 + i * 95})`}>
            <rect
              width="155"
              height="44"
              rx="12"
              fill={isLight ? '#FEF2F2' : 'rgba(63, 18, 25, 0.9)'}
              stroke={isLight ? '#DC2626' : '#ff007f'}
              strokeWidth="1.5"
            />
            <text x="77" y="27" textAnchor="middle" fill={isLight ? '#991B1B' : '#ffb4d2'} fontSize="12" fontFamily="monospace" fontWeight="bold">
              {a}
            </text>
          </g>
        ))}

        {/* Technique Nodes */}
        {techs.map((t, i) => (
          <g key={t} transform={`translate(290 ${24 + i * 52})`}>
            <rect
              width="180"
              height="38"
              rx="10"
              fill={isLight ? '#F0F9FF' : 'rgba(8, 24, 48, 0.9)'}
              stroke={isLight ? '#0284C7' : '#00f5ff'}
              strokeWidth="1.2"
            />
            <text x="90" y="24" textAnchor="middle" fill={isLight ? '#0369A1' : '#a5f3fc'} fontSize="10" fontFamily="monospace" fontWeight="bold">
              {t}
            </text>
          </g>
        ))}

        {/* Target Asset Nodes */}
        {assets.map((a, i) => (
          <g key={a} transform={`translate(585 ${34 + i * 58})`}>
            <rect
              width="155"
              height="40"
              rx="10"
              fill={isLight ? '#F0FDF4' : 'rgba(6, 36, 24, 0.9)'}
              stroke={isLight ? '#16A34A' : '#00ff9d'}
              strokeWidth="1.5"
            />
            <text x="77" y="25" textAnchor="middle" fill={isLight ? '#15803D' : '#a7f3d0'} fontSize="11" fontFamily="monospace" fontWeight="bold">
              {a}
            </text>
          </g>
        ))}
      </svg>

      <div className="absolute bottom-3 left-6 flex gap-6 font-mono text-[10px] uppercase tracking-widest">
        <span className={`flex items-center gap-1.5 ${isLight ? 'text-[#DC2626] font-bold' : 'text-pink-400'}`}>
          <span className={`h-2 w-2 rounded-full ${isLight ? 'bg-[#DC2626]' : 'bg-pink-500'}`} /> THREAT ACTOR (APT)
        </span>
        <span className={`flex items-center gap-1.5 ${isLight ? 'text-[#0284C7] font-bold' : 'text-cyan-300'}`}>
          <span className={`h-2 w-2 rounded-full ${isLight ? 'bg-[#0284C7]' : 'bg-cyan-400'}`} /> ATTACK TECHNIQUE (TTP)
        </span>
        <span className={`flex items-center gap-1.5 ${isLight ? 'text-[#16A34A] font-bold' : 'text-[#00ff9d]'}`}>
          <span className={`h-2 w-2 rounded-full ${isLight ? 'bg-[#16A34A]' : 'bg-emerald-400'}`} /> TARGET INFRASTRUCTURE ASSET
        </span>
      </div>
    </div>
  );
}
