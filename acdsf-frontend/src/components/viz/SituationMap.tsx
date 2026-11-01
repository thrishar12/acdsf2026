import { AnimatePresence, motion } from 'framer-motion';
import {
  Shield,
  X,
  Zap,
  Lock,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { SECTORS } from '../../data/mockData';
import { PulseBeacon } from '../ui/CyberIcons';
import type { TwinNode } from '../../types';
import { useTheme } from '../../utils/theme';

function statusOf(score: number): 'secure' | 'suspicious' | 'attack' {
  if (score >= 85) return 'secure';
  if (score >= 60) return 'suspicious';
  return 'attack';
}

const colorMapDark = {
  secure: '#00ff9d',
  suspicious: '#fbbf24',
  attack: '#ff007f',
};

const colorMapLight = {
  secure: '#16A34A',
  suspicious: '#D97706',
  attack: '#DC2626',
};

export function SituationMap({
  scores,
  twins,
}: {
  scores: Record<string, number>;
  twins: TwinNode[];
}) {
  const { isLight } = useTheme();
  const colorMap = isLight ? colorMapLight : colorMapDark;
  const [open, setOpen] = useState<string | null>(null);
  const [containLog, setContainLog] = useState<string | null>(null);
  const selected = SECTORS.find((s) => s.short === open);

  const nodes = useMemo(
    () =>
      SECTORS.map((s, i) => {
        const score = scores[s.short] ?? (i === 1 ? 74 : i === 4 ? 48 : 92);
        const radius = 175;
        const rad = ((s.angle - 90) * Math.PI) / 180;
        return {
          ...s,
          score,
          status: statusOf(score),
          x: 240 + Math.cos(rad) * radius,
          y: 220 + Math.sin(rad) * radius,
          i,
        };
      }),
    [scores],
  );

  const handleIsolateSector = (sectorName: string) => {
    setContainLog(`Sector [${sectorName}] SDN isolated. 12 subnets firewalled.`);
    setTimeout(() => setContainLog(null), 4000);
  };

  return (
    <div className={`relative min-h-[480px] overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
      isLight
        ? 'border-[#E2E8F0] bg-white shadow-sm'
        : 'border-cyan-500/25 bg-gradient-to-b from-[#06101f] via-[#040914] to-[#02050c] shadow-[0_0_40px_rgba(0,0,0,0.7)]'
    }`}>
      {/* Cyber Background Mesh & Radar Grid */}
      <div
        className={`pointer-events-none absolute inset-0 ${isLight ? 'opacity-10' : 'opacity-40'}`}
        style={{
          backgroundImage: isLight
            ? 'radial-gradient(circle at 50% 50%, rgba(2,132,199,0.1), transparent 60%), linear-gradient(#E2E8F0 1px, transparent 1px), linear-gradient(90deg, #E2E8F0 1px, transparent 1px)'
            : 'radial-gradient(circle at 50% 50%, rgba(0,245,255,0.12), transparent 60%), linear-gradient(rgba(0,245,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.05) 1px, transparent 1px)',
          backgroundSize: 'auto, 32px 32px, 32px 32px',
        }}
      />

      {/* SVG Radar Visuals */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 480 440">
        <defs>
          <linearGradient id="laserBeam" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isLight ? '#0284C7' : '#00f5ff'} stopOpacity={isLight ? '0.4' : '0.8'} />
            <stop offset="100%" stopColor={isLight ? '#DC2626' : '#ff007f'} stopOpacity="0.1" />
          </linearGradient>
          <radialGradient id="centerCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isLight ? '#E0F2FE' : '#00f5ff'} stopOpacity={isLight ? '0.8' : '0.3'} />
            <stop offset="100%" stopColor={isLight ? '#FFFFFF' : '#0b1d33'} stopOpacity="0.9" />
          </radialGradient>
        </defs>

        {/* Concentric Radar Circles */}
        <circle cx="240" cy="220" r="210" fill="none" stroke={isLight ? '#CBD5E1' : '#00f5ff'} strokeOpacity={isLight ? '0.6' : '0.08'} strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="240" cy="220" r="175" fill="none" stroke={isLight ? '#CBD5E1' : '#00f5ff'} strokeOpacity={isLight ? '0.7' : '0.15'} strokeWidth="1.2" />
        <circle cx="240" cy="220" r="120" fill="none" stroke={isLight ? '#E2E8F0' : '#a855f7'} strokeOpacity={isLight ? '0.6' : '0.12'} strokeWidth="1" strokeDasharray="6 4" />
        <circle cx="240" cy="220" r="65" fill="none" stroke={isLight ? '#0284C7' : '#00f5ff'} strokeOpacity={isLight ? '0.4' : '0.25'} strokeWidth="1.5" />

        {/* Radar Crosshairs */}
        <line x1="240" y1="10" x2="240" y2="430" stroke={isLight ? '#E2E8F0' : '#00f5ff'} strokeOpacity={isLight ? '0.6' : '0.1'} strokeWidth="1" strokeDasharray="2 4" />
        <line x1="20" y1="220" x2="460" y2="220" stroke={isLight ? '#E2E8F0' : '#00f5ff'} strokeOpacity={isLight ? '0.6' : '0.1'} strokeWidth="1" strokeDasharray="2 4" />

        {/* Rotating Radar Sweep */}
        <path d="M240 220 L240 10 A 210 210 0 0 1 420 320 Z" fill="url(#laserBeam)" className="radar-sweep opacity-20" />

        {/* Dynamic Node Links & Flow Particles */}
        {nodes.map((n) => (
          <g key={n.id}>
            {/* Connection Line to Core */}
            <line
              x1="240"
              y1="220"
              x2={n.x}
              y2={n.y}
              stroke={colorMap[n.status]}
              strokeOpacity={isLight ? '0.7' : '0.4'}
              strokeWidth={n.status === 'attack' ? '2' : '1.2'}
              strokeDasharray={n.status === 'attack' ? '4 4' : '6 8'}
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-60" dur={n.status === 'attack' ? '1s' : '3s'} repeatCount="indefinite" />
            </line>

            {/* Traveling Data Flow Particle */}
            <circle r={n.status === 'attack' ? '4' : '2.5'} fill={colorMap[n.status]}>
              <animateMotion dur={`${2.5 + n.i * 0.3}s`} repeatCount="indefinite" path={`M240,220 L${n.x},${n.y}`} />
            </circle>

            {/* Simulated Hostile Attack Beam for attack nodes */}
            {n.status === 'attack' && (
              <line x1={n.x + 30} y1={n.y - 40} x2={n.x} y2={n.y} stroke={isLight ? '#DC2626' : '#ff007f'} strokeWidth="2.5" strokeDasharray="3 3">
                <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="0.8s" repeatCount="indefinite" />
              </line>
            )}
          </g>
        ))}

        {/* Center Defense Core */}
        <circle cx="240" cy="220" r="50" fill="url(#centerCoreGlow)" stroke={isLight ? '#0284C7' : '#00f5ff'} strokeWidth="2" style={{ filter: isLight ? 'drop-shadow(0 2px 6px rgba(2,132,199,0.2))' : 'drop-shadow(0 0 20px #00f5ff)' }} />
        <circle cx="240" cy="220" r="68" fill="none" stroke={isLight ? '#0284C7' : '#00f5ff'} strokeOpacity={isLight ? '0.2' : '0.4'} className="pulse-ring" />
      </svg>

      {/* Center Holographic Core Badge */}
      <div className="absolute left-1/2 top-1/2 z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center pointer-events-none">
        <Shield className={isLight ? 'text-[#0284C7]' : 'text-[#00f5ff] drop-shadow-[0_0_10px_#00f5ff]'} size={24} />
        <span className={`mt-1 font-mono text-[8px] font-bold leading-tight tracking-widest ${isLight ? 'text-[#0F172A]' : 'text-cyan-200'}`}>
          NATIONAL
          <br />
          CYBER CORE
        </span>
      </div>

      {/* Orbiting Sector Buttons */}
      {nodes.map((n) => (
        <button
          key={n.id}
          onClick={() => setOpen(n.short)}
          className={`group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-3 text-left backdrop-blur-xl transition-all duration-300 hover:brightness-105 ${
            isLight
              ? n.status === 'attack'
                ? 'border-[#FECACA] bg-[#FEF2F2] shadow-sm'
                : n.status === 'suspicious'
                ? 'border-[#FDE68A] bg-[#FFFBEB] shadow-sm'
                : 'border-[#CBD5E1] bg-white shadow-sm'
              : n.status === 'attack'
              ? 'border-pink-500/60 bg-pink-950/70 shadow-[0_0_20px_rgba(255,0,127,0.35)]'
              : n.status === 'suspicious'
              ? 'border-amber-400/50 bg-amber-950/70 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
              : 'border-cyan-400/30 bg-[#061224]/85 shadow-[0_0_15px_rgba(0,245,255,0.15)]'
          }`}
          style={{ left: `${(n.x / 480) * 100}%`, top: `${(n.y / 440) * 100}%` }}
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ backgroundColor: colorMap[n.status] }}
              />
              <span
                className="relative inline-flex h-3 w-3 rounded-full"
                style={{ backgroundColor: colorMap[n.status] }}
              />
            </span>
            <span className="text-xl leading-none drop-shadow">{n.emoji}</span>
            <div>
              <strong className={`block font-mono text-xs font-bold tracking-wider ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>
                {n.name}
              </strong>
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase">
                <span style={{ color: colorMap[n.status] }}>{n.status}</span>
                <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>•</span>
                <span className={isLight ? 'text-slate-600 font-semibold' : 'text-slate-300'}>{n.score}% HEALTH</span>
              </div>
            </div>
          </div>
        </button>
      ))}

      {/* Sector Dossier Side Drawer */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            className={`absolute bottom-3 right-3 top-3 z-30 w-[min(360px,88%)] overflow-y-auto rounded-2xl border p-5 shadow-2xl backdrop-blur-2xl ${
              isLight
                ? 'border-[#E2E8F0] bg-white text-[#0F172A]'
                : 'border-cyan-400/40 bg-[#071326]/98 text-slate-100'
            }`}
          >
            {/* Header */}
            <div className={`flex items-start justify-between border-b pb-3 ${isLight ? 'border-[#E2E8F0]' : 'border-white/10'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <PulseBeacon color="cyan" size="sm" />
                  <p className={`font-mono text-[10px] uppercase tracking-widest ${isLight ? 'text-[#0284C7] font-bold' : 'text-[#00f5ff]'}`}>
                    SECTOR DOSSIER
                  </p>
                </div>
                <h3 className={`mt-1 font-display text-xl font-bold ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>
                  {selected.emoji} {selected.name}
                </h3>
              </div>
              <button
                onClick={() => setOpen(null)}
                className={`rounded-lg p-1.5 transition ${isLight ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Description */}
            <p className={`mt-3 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Live digital twin of sovereign {selected.name} grid. Telemetry continuously cross-checked with Red Team attack synthesis and Blue Team automated SDN isolation.
            </p>

            {/* KPI Metrics */}
            <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
              <div className={`rounded-xl border p-3 ${isLight ? 'border-[#E2E8F0] bg-[#F8FAFC]' : 'border-white/5 bg-white/5'}`}>
                <p className={`text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Sector Health</p>
                <p className={`mt-1 font-display text-2xl font-bold ${isLight ? 'text-[#0284C7]' : 'text-[#00f5ff]'}`}>
                  {scores[selected.short] ?? 88}%
                </p>
              </div>
              <div className={`rounded-xl border p-3 ${isLight ? 'border-[#E2E8F0] bg-[#F8FAFC]' : 'border-white/5 bg-white/5'}`}>
                <p className={`text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Active Twins</p>
                <p className={`mt-1 font-display text-2xl font-bold ${isLight ? 'text-[#7C3AED]' : 'text-purple-300'}`}>
                  {twins.filter((t) => t.sector === selected.short).length || 8} NODES
                </p>
              </div>
            </div>

            {/* Security Posture Status List */}
            <div className="mt-4 space-y-2 font-mono text-[11px]">
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${isLight ? 'bg-[#F1F5F9]' : 'bg-black/40'}`}>
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Threat Vector</span>
                <span className={`font-bold ${isLight ? 'text-[#DC2626]' : 'text-pink-400'}`}>MODERATE EXPOSURE</span>
              </div>
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${isLight ? 'bg-[#F1F5F9]' : 'bg-black/40'}`}>
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Microsegmentation</span>
                <span className={`font-bold ${isLight ? 'text-[#16A34A]' : 'text-[#00ff9d]'}`}>ARMED // LEVEL 4</span>
              </div>
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${isLight ? 'bg-[#F1F5F9]' : 'bg-black/40'}`}>
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Honeytokens Deployed</span>
                <span className={`font-bold ${isLight ? 'text-[#0284C7]' : 'text-cyan-300'}`}>14 ACTIVE</span>
              </div>
            </div>

            {/* Rapid Containment Actions */}
            <div className="mt-5 space-y-2">
              <p className={`font-mono text-[10px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Direct SOAR Controls
              </p>
              <button
                onClick={() => handleIsolateSector(selected.name)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 font-mono text-xs font-bold uppercase transition ${
                  isLight
                    ? 'border-[#FECACA] bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FCDAD7]'
                    : 'border-pink-500/40 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20'
                }`}
              >
                <Lock size={14} /> SDN Micro-Isolate Sector
              </button>
              <button
                onClick={() => handleIsolateSector(selected.name)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 font-mono text-xs font-bold uppercase transition ${
                  isLight
                    ? 'border-[#BAE6FD] bg-[#E0F2FE] text-[#0284C7] hover:bg-[#BAE6FD]'
                    : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                }`}
              >
                <Zap size={14} /> Trigger Full SOAR Playbook
              </button>
            </div>

            {containLog && (
              <div className={`mt-3 rounded-xl border p-2.5 font-mono text-[11px] ${
                isLight
                  ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]'
                  : 'border-emerald-400/40 bg-emerald-950/40 text-emerald-300'
              }`}>
                {containLog}
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
