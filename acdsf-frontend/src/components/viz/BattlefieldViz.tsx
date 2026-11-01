import { motion } from 'framer-motion';
import {
  Crosshair,
  ShieldCheck,
  Zap,
  Flame,
  Radio,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useState } from 'react';
import { battlefieldEvents } from '../../data/mockData';
import { HoloCard } from '../ui/HoloCard';
import { CyberBadge } from '../ui/CyberBadge';
import { PulseBeacon } from '../ui/CyberIcons';
import { useTheme } from '../../utils/theme';

const killchainSteps = [
  { id: 'recon', label: '1. Reconnaissance', status: 'completed' },
  { id: 'weapon', label: '2. Weaponization', status: 'completed' },
  { id: 'delivery', label: '3. Delivery', status: 'active' },
  { id: 'exploit', label: '4. Exploitation', status: 'contested' },
  { id: 'c2', label: '5. C2 Beacon', status: 'blocked' },
  { id: 'lateral', label: '6. Lateral Move', status: 'blocked' },
  { id: 'exfil', label: '7. Exfiltration', status: 'blocked' },
];

export function BattlefieldViz() {
  const { isLight } = useTheme();
  const [events, setEvents] = useState(battlefieldEvents);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const injectScenario = (name: string, side: 'red' | 'blue', detail: string) => {
    const newEvent = {
      t: new Date().toISOString().slice(11, 19),
      side,
      label: name,
      detail,
    };
    setEvents((prev) => [newEvent, ...prev.slice(0, 7)]);
    setActionNotice(`[${side.toUpperCase()}] ${name} injected into live simulation arena.`);
    setTimeout(() => {
      setActionNotice(null);
    }, 3500);
  };

  return (
    <div className="space-y-6">
      {/* Killchain Visual Progression Strip */}
      <HoloCard glowColor="multi" className="p-5">
        <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 font-mono text-xs ${
          isLight ? 'border-[#E2E8F0]' : 'border-white/10'
        }`}>
          <span className={`flex items-center gap-2 ${isLight ? 'text-[#0284C7] font-bold' : 'text-cyan-300'}`}>
            <Radio size={14} className={isLight ? 'text-[#0284C7]' : 'animate-pulse text-[#00f5ff]'} />
            MITRE ATT&CK KILLCHAIN POSTURE
          </span>
          <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>BLUE TEAM CONTAINMENT ACTIVE AT STEP 5</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {killchainSteps.map((step) => {
            const darkStatusStyles = {
              completed: 'border-pink-500/50 bg-pink-950/40 text-pink-300',
              active: 'border-pink-400 bg-pink-500/20 text-white shadow-[0_0_15px_rgba(255,0,127,0.4)] animate-pulse',
              contested: 'border-amber-400/50 bg-amber-950/40 text-amber-300',
              blocked: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300',
            };
            const lightStatusStyles = {
              completed: 'border-[#FECACA] bg-[#FEE2E2] text-[#DC2626]',
              active: 'border-[#DC2626] bg-[#DC2626] text-white shadow-sm font-bold',
              contested: 'border-[#FDE68A] bg-[#FEF3C7] text-[#D97706]',
              blocked: 'border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]',
            };
            const statusStyles = isLight ? lightStatusStyles : darkStatusStyles;
            return (
              <div
                key={step.id}
                className={`rounded-xl border p-2.5 text-center font-mono text-[11px] transition ${statusStyles[step.status as keyof typeof statusStyles]}`}
              >
                <p className="font-bold">{step.label}</p>
                <p className="mt-1 text-[9px] uppercase tracking-wider opacity-80">{step.status}</p>
              </div>
            );
          })}
        </div>
      </HoloCard>

      {/* Main Red vs Blue Holographic Arena */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${
        isLight
          ? 'border-[#E2E8F0] bg-white shadow-sm'
          : 'border-cyan-500/30 bg-gradient-to-b from-[#180914] via-[#08101e] to-[#041220] shadow-2xl'
      }`}>
        {/* Ambient Radial Lighting (Dark mode only) */}
        {!isLight && (
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 15% 50%, rgba(255,0,127,0.25), transparent 40%), radial-gradient(circle at 85% 50%, rgba(0,245,255,0.25), transparent 40%)',
            }}
          />
        )}

        {/* Top Status Bar */}
        <div className={`relative z-10 flex flex-wrap items-center justify-between gap-4 border-b pb-4 ${
          isLight ? 'border-[#E2E8F0]' : 'border-white/10'
        }`}>
          <CyberBadge label="RED TEAM AI // OFFENSIVE ENGINE" tone="magenta" />
          <div className={`flex items-center gap-2 font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <PulseBeacon color="acid" size="sm" />
            <span>LIVE MULTI-AGENT ARENA</span>
          </div>
          <CyberBadge label="BLUE TEAM AI // AUTONOMOUS GUARD" tone="cyan" />
        </div>

        {/* Center Battle Graphic Visualization */}
        <div className="relative my-8 grid items-center gap-6 lg:grid-cols-[180px_1fr_180px]">
          {/* Red Team Left Hexagon Node */}
          <motion.div
            className={`hex mx-auto flex h-40 w-40 flex-col items-center justify-center border text-center transition-all ${
              isLight
                ? 'border-[#FECACA] bg-[#FEF2F2] shadow-sm'
                : 'border-pink-500/50 bg-pink-950/50 shadow-[0_0_30px_rgba(255,0,127,0.3)]'
            }`}
            animate={{
              boxShadow: isLight
                ? ['0 1px 3px rgba(0,0,0,0.08)', '0 4px 12px rgba(220,38,38,0.15)', '0 1px 3px rgba(0,0,0,0.08)']
                : [
                    '0 0 20px rgba(255,0,127,0.2)',
                    '0 0 45px rgba(255,0,127,0.5)',
                    '0 0 20px rgba(255,0,127,0.2)',
                  ],
            }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            <Crosshair className={isLight ? 'text-[#DC2626]' : 'text-[#ff007f]'} size={28} />
            <strong className={`mt-2 font-display text-xs tracking-wider ${isLight ? 'text-[#DC2626]' : 'text-pink-200'}`}>
              RED TEAM AI
            </strong>
            <span className={`font-mono text-[9px] uppercase ${isLight ? 'text-[#991B1B] font-bold' : 'text-pink-400'}`}>
              Autonomous Attack
            </span>
          </motion.div>

          {/* SVG Animated Conflict Arc */}
          <div className="relative h-44 w-full">
            <svg viewBox="0 0 640 160" className="h-full w-full">
              <defs>
                <linearGradient id="redAttackBeam" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={isLight ? '#DC2626' : '#ff007f'} />
                  <stop offset="100%" stopColor={isLight ? '#EA580C' : '#f43f5e'} />
                </linearGradient>
                <linearGradient id="blueDefendBeam" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor={isLight ? '#0284C7' : '#00f5ff'} />
                  <stop offset="100%" stopColor={isLight ? '#16A34A' : '#00ff9d'} />
                </linearGradient>
              </defs>

              {/* Red Attack Wave */}
              <path
                d="M 20 50 C 180 20, 260 80, 320 80 C 380 80, 460 30, 620 50"
                fill="none"
                stroke="url(#redAttackBeam)"
                strokeWidth="2.5"
                strokeDasharray="8 8"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-120" dur="1.8s" repeatCount="indefinite" />
              </path>

              {/* Blue Defence Wave */}
              <path
                d="M 620 110 C 460 130, 380 80, 320 80 C 260 80, 180 130, 20 110"
                fill="none"
                stroke="url(#blueDefendBeam)"
                strokeWidth="2.5"
                strokeDasharray="8 8"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-120" dur="2s" repeatCount="indefinite" />
              </path>

              {/* Contested Target Node */}
              <circle cx="320" cy="80" r="24" fill={isLight ? '#F8FAFC' : '#0b1728'} stroke={isLight ? '#0284C7' : '#00f5ff'} strokeWidth="2" />
              <circle cx="320" cy="80" r="32" fill="none" stroke={isLight ? '#0284C7' : '#a855f7'} strokeOpacity={isLight ? '0.3' : '0.4'} className="pulse-ring" />
              <text x="320" y="77" textAnchor="middle" fill={isLight ? '#0F172A' : '#00f5ff'} fontSize="9" fontFamily="monospace" fontWeight="bold">
                SCADA
              </text>
              <text x="320" y="89" textAnchor="middle" fill={isLight ? '#16A34A' : '#00ff9d'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                SHIELDED
              </text>
            </svg>
          </div>

          {/* Blue Team Right Hexagon Node */}
          <motion.div
            className={`hex mx-auto flex h-40 w-40 flex-col items-center justify-center border text-center transition-all ${
              isLight
                ? 'border-[#BAE6FD] bg-[#E0F2FE] shadow-sm'
                : 'border-cyan-400/50 bg-cyan-950/50 shadow-[0_0_30px_rgba(0,245,255,0.3)]'
            }`}
            animate={{
              boxShadow: isLight
                ? ['0 1px 3px rgba(0,0,0,0.08)', '0 4px 12px rgba(2,132,199,0.15)', '0 1px 3px rgba(0,0,0,0.08)']
                : [
                    '0 0 20px rgba(0,245,255,0.2)',
                    '0 0 45px rgba(0,245,255,0.5)',
                    '0 0 20px rgba(0,245,255,0.2)',
                  ],
            }}
            transition={{ duration: 2.2, repeat: Infinity, delay: 0.3 }}
          >
            <ShieldCheck className={isLight ? 'text-[#0284C7]' : 'text-[#00f5ff]'} size={28} />
            <strong className={`mt-2 font-display text-xs tracking-wider ${isLight ? 'text-[#0284C7]' : 'text-cyan-200'}`}>
              BLUE TEAM AI
            </strong>
            <span className={`font-mono text-[9px] uppercase ${isLight ? 'text-[#16A34A] font-bold' : 'text-[#00ff9d]'}`}>
              Autonomous Guard
            </span>
          </motion.div>
        </div>

        {/* Tactical Scenario Trigger Controls */}
        <div className={`relative z-10 border-t pt-4 ${isLight ? 'border-[#E2E8F0]' : 'border-white/10'}`}>
          <p className={`font-mono text-xs uppercase tracking-widest ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
            Inject Scenario & Autonomous Response Test:
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              onClick={() =>
                injectScenario(
                  'APT29 Zero-Day Injection',
                  'red',
                  'Exploiting CVE-2026-8819 on Edge VPN Router.'
                )
              }
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs font-semibold transition ${
                isLight
                  ? 'border-[#FECACA] bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FCDAD7]'
                  : 'border-pink-500/40 bg-pink-950/40 text-pink-300 hover:bg-pink-500/20'
              }`}
            >
              <Flame size={14} /> Inject Zero-Day Exploit
            </button>
            <button
              onClick={() =>
                injectScenario(
                  'Distributed DDoS Surge',
                  'red',
                  '1.4 Tbps SYN Flood targeted against Finance Gateway.'
                )
              }
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs font-semibold transition ${
                isLight
                  ? 'border-[#FECACA] bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FCDAD7]'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              <Zap size={14} /> Trigger DDoS Wave
            </button>
            <button
              onClick={() =>
                injectScenario(
                  'SDN Microsegmentation Enforced',
                  'blue',
                  'Decoupled SCADA VLAN from external network routes.'
                )
              }
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs font-semibold transition ${
                isLight
                  ? 'border-[#BAE6FD] bg-[#E0F2FE] text-[#0284C7] hover:bg-[#BAE6FD]'
                  : 'border-cyan-400/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-500/20'
              }`}
            >
              <Lock size={14} /> Autonomous SDN Isolate
            </button>
            <button
              onClick={() =>
                injectScenario(
                  'Decoy Honeypot Redirect',
                  'blue',
                  'Rerouted lateral movement credentials to sandbox container.'
                )
              }
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs font-semibold transition ${
                isLight
                  ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0]'
                  : 'border-emerald-400/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              <CheckCircle2 size={14} /> Deploy Honeytoken Decoy
            </button>
          </div>

          {actionNotice && (
            <div className={`mt-3 rounded-xl border p-3 font-mono text-xs ${
              isLight
                ? 'border-[#BAE6FD] bg-[#F0F9FF] text-[#0284C7] font-semibold'
                : 'border-cyan-400/40 bg-cyan-950/50 text-cyan-200'
            }`}>
              {actionNotice}
            </div>
          )}
        </div>
      </div>

      {/* Live Skirmish Event Feed */}
      <div>
        <h3 className={`font-display text-lg ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>Live Skirmish Event Telemetry Stream</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e, i) => (
            <motion.div
              key={e.label + i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border p-4 font-mono text-xs ${
                isLight
                  ? e.side === 'red'
                    ? 'border-[#FECACA] bg-[#FEF2F2] text-[#0F172A]'
                    : 'border-[#DCFCE7] bg-[#F0FDF4] text-[#0F172A]'
                  : e.side === 'red'
                  ? 'border-pink-500/20 bg-pink-950/20 text-slate-200'
                  : 'border-emerald-500/20 bg-emerald-950/20 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold ${
                  isLight
                    ? e.side === 'red' ? 'text-[#DC2626]' : 'text-[#16A34A]'
                    : e.side === 'red' ? 'text-pink-400' : 'text-[#00ff9d]'
                }`}>
                  {e.side === 'red' ? 'RED ATTACK' : 'BLUE DEFENCE'}
                </span>
                <span className={`text-[10px] ${isLight ? 'text-slate-500 font-semibold' : 'text-slate-500'}`}>{e.t}</span>
              </div>
              <strong className={`mt-1 block text-sm ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>{e.label}</strong>
              <p className={`mt-1 text-xs ${isLight ? 'text-[#475569]' : 'text-slate-400'}`}>{e.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
