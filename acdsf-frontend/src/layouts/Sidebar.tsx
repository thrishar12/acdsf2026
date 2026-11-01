import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity, BarChart3, Bot, Eye, FileText, GitBranch, LayoutDashboard, LogOut, Menu,
  Network, Settings, Shield, Siren, Sparkles, Users, Zap, Terminal,
  Bell, Volume2, VolumeX, ShieldAlert, Wifi, UserCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PulseBeacon } from '../components/ui/CyberIcons';
import { isAudioEnabled, setAudioEnabled, playAcousticPing } from '../utils/audioAlarm';
import { ThemeToggle } from '../components/ui/ThemeToggle';

import type { LucideIcon } from 'lucide-react';

const navSections: Array<{
  title: string;
  items: Array<{
    to: string;
    label: string;
    icon: LucideIcon;
    badge?: string;
    tone?: string;
  }>;
}> = [
  {
    title: 'CORE SOC OPERATIONS',
    items: [
      { to: '/app/command-center', label: 'Command Center', icon: LayoutDashboard },
      { to: '/app/simulation', label: 'Live Simulation', icon: Activity, badge: 'REALTIME' },
      { to: '/app/battlefield', label: 'Cyber Battlefield', icon: Zap, badge: 'WAR ROOM' },
      { to: '/app/digital-twin', label: 'Digital Twin SDN', icon: Network },
    ],
  },
  {
    title: 'INTELLIGENCE & REASONING',
    items: [
      { to: '/app/threat-intelligence', label: 'Threat Intel Feed', icon: Eye },
      { to: '/app/topology', label: 'Network Topology', icon: GitBranch },
      { to: '/app/ai-defence', label: 'Autonomous AI Shield', icon: Shield },
      { to: '/app/xai-insights', label: 'XAI Machine Reasoning', icon: Sparkles },
      { to: '/app/incidents', label: 'Incident Triage & Radar', icon: Siren },
      { to: '/app/attack-report', label: 'Attack Report & Export', icon: FileText, badge: 'HOT' },
      { to: '/app/analytics', label: 'Telemetry Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'TACTICAL OPERATOR DESKS',
    items: [
      { to: '/app/admin', label: 'Admin Sovereignty', icon: Users },
      { to: '/app/users', label: 'IAM & User Registry', icon: Users, badge: 'IAM' },
      { to: '/app/profile', label: 'Operator Dossier', icon: UserCheck },
      { to: '/app/analyst', label: 'Analyst Terminal', icon: Terminal },
      { to: '/app/red-team', label: 'Red Team Hub', icon: Zap, tone: 'text-pink-400' },
      { to: '/app/blue-team', label: 'Blue Team Defense', icon: Shield, tone: 'text-cyan-400' },
      { to: '/app/settings', label: 'System Settings', icon: Settings },
    ],
  },
];

export function Sidebar({
  alerts = 0,
  onOpenNotifications,
}: {
  alerts?: number;
  onOpenNotifications?: () => void;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [now, setNow] = useState(new Date());
  const [defcon, setDefcon] = useState<'DEFCON 1' | 'DEFCON 2' | 'DEFCON 3' | 'DEFCON 4' | 'DEFCON 5'>('DEFCON 2');
  const [audioActive, setAudioActive] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    // Initialize audio state
    setAudioActive(isAudioEnabled());

    const handleAudioSync = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>;
      if (custom.detail !== undefined) {
        setAudioActive(custom.detail.enabled);
      } else {
        setAudioActive(isAudioEnabled());
      }
    };

    window.addEventListener('acdsf-audio-change', handleAudioSync);
    return () => {
      clearInterval(id);
      window.removeEventListener('acdsf-audio-change', handleAudioSync);
    };
  }, []);

  const handleToggleAudio = () => {
    const next = !audioActive;
    setAudioActive(next);
    setAudioEnabled(next);
    if (next) {
      playAcousticPing();
    }
  };

  const defconStyles = {
    'DEFCON 1': 'border-pink-500/60 bg-pink-950/40 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]',
    'DEFCON 2': 'border-rose-500/60 bg-rose-950/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]',
    'DEFCON 3': 'border-amber-500/60 bg-amber-950/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    'DEFCON 4': 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]',
    'DEFCON 5': 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
  };

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-[#050913]/95 border-r border-cyan-500/20 p-4 flex flex-col z-20 shadow-[0_0_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-5 p-2 rounded-xl bg-gradient-to-r from-cyan-950/30 to-purple-950/20 border border-cyan-500/20">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-950/60 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <Bot size={22} className="animate-pulse" />
          <div className="absolute -bottom-0.5 -right-0.5">
            <PulseBeacon color="acid" size="sm" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-bold tracking-[0.25em] text-white">ACDSF</p>
            <span className="font-mono text-[9px] text-cyan-400 font-bold">{now.toLocaleTimeString()}</span>
          </div>
          <p className="font-mono text-[8px] tracking-widest text-cyan-300/80 uppercase font-semibold">SOVEREIGN DEFENCE</p>
        </div>
      </div>

      {/* DEFCON Readiness Selector */}
      <div className="mb-4 space-y-2.5">
        <div className="relative">
          <select
            aria-label="DEFCON Defense Readiness Condition"
            value={defcon}
            onChange={(e) => setDefcon(e.target.value as typeof defcon)}
            className={`w-full cursor-pointer rounded-xl border px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider outline-none transition-all duration-200 ${defconStyles[defcon]}`}
          >
            <option value="DEFCON 1" className="bg-[#070b16] text-pink-400">DEFCON 1 // IMMINENT ATTACK</option>
            <option value="DEFCON 2" className="bg-[#070b16] text-rose-400">DEFCON 2 // ARMED RESPONSE</option>
            <option value="DEFCON 3" className="bg-[#070b16] text-amber-400">DEFCON 3 // ELEVATED THREAT</option>
            <option value="DEFCON 4" className="bg-[#070b16] text-cyan-400">DEFCON 4 // ACTIVE GUARD</option>
            <option value="DEFCON 5" className="bg-[#070b16] text-emerald-400">DEFCON 5 // NOMINAL FABRIC</option>
          </select>
        </div>
        
        {/* Sound System & Notification Buttons */}
        <div className="grid grid-cols-2 gap-2 font-mono">
          {/* Sound Synthesizer System Toggle Button */}
          <button
            onClick={handleToggleAudio}
            className={`group flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-all duration-200 ${
              audioActive
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:border-emerald-400'
                : 'border-rose-500/30 bg-rose-950/20 text-rose-400 hover:border-rose-500/60'
            }`}
            title={audioActive ? 'Acoustic Siren System Active (Click to mute)' : 'Acoustic Siren System Muted (Click to enable & test)'}
          >
            {audioActive ? (
              <>
                <Volume2 size={14} className="text-emerald-400 animate-pulse" />
                <span className="text-[10px] tracking-wide uppercase">SOUND ON</span>
              </>
            ) : (
              <>
                <VolumeX size={14} className="text-rose-400" />
                <span className="text-[10px] tracking-wide uppercase">MUTED</span>
              </>
            )}
          </button>
          
          {/* Notification Center Trigger Button */}
          <button
            onClick={onOpenNotifications}
            className="relative flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-2 text-xs font-bold text-cyan-300 transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-900/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            title="Open Notification Matrix & Alerts"
          >
            <Bell size={14} className="text-cyan-400" />
            <span className="text-[10px] tracking-wide uppercase">ALERTS</span>
            {alerts > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-600 px-1 font-mono text-[9px] font-bold text-white shadow-[0_0_10px_rgba(236,72,153,0.9)] animate-pulse">
                {alerts}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-2 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500 font-semibold mb-1.5">
              {section.title}
            </p>
            {section.items.map(({ to, label, icon: Icon, badge, tone }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'border border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.18)]'
                      : 'text-slate-400 border border-transparent hover:border-slate-800 hover:bg-white/[0.06] hover:text-slate-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={15}
                      className={`shrink-0 transition-transform duration-200 group-hover:brightness-110 ${
                        isActive
                          ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                          : tone || 'text-slate-500 group-hover:text-cyan-300'
                      }`}
                    />
                    <span className="flex-1 truncate tracking-wide">{label}</span>
                    {badge && (
                      <span className={`rounded-full px-1.5 py-0.2 font-mono text-[8px] font-bold ${
                        badge === 'REALTIME' || badge === 'HOT'
                          ? 'border border-pink-500/50 bg-pink-950/40 text-pink-300'
                          : 'border border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
                      }`}>
                        {badge}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-cyan-400 rounded-l shadow-[0_0_8px_rgba(6,182,212,1)]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Operator Clearance Profile Footprint */}
      <div className="mt-3 pt-3 border-t border-cyan-500/20">
        <div
          onClick={() => navigate('/app/profile')}
          className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/40 p-2.5 transition-all duration-200 hover:border-cyan-500/40 hover:bg-black/60 cursor-pointer group"
          title="Open Operator Dossier"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-500/40 bg-purple-950/40 font-mono text-xs font-bold text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)] group-hover:brightness-110 transition-transform">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">{user?.name || 'Tactical Operator'}</p>
            <div className="flex items-center gap-1.5 font-mono text-[9px] text-cyan-400">
              <PulseBeacon color="acid" size="sm" />
              <span className="truncate uppercase font-semibold">{user?.role || 'Admin'} Level Clearance</span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              logout();
              navigate('/login');
            }}
            title="Terminate Session"
            className="rounded-lg p-1.5 text-slate-400 transition-all duration-200 hover:bg-pink-950/40 hover:text-pink-400 hover:brightness-110"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({
  alerts = 0,
  onOpenNotifications,
}: {
  alerts?: number;
  onOpenNotifications?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [audioActive, setAudioActive] = useState(true);

  useEffect(() => {
    setAudioActive(isAudioEnabled());
  }, []);

  const handleToggle = () => {
    const next = !audioActive;
    setAudioActive(next);
    setAudioEnabled(next);
    if (next) playAcousticPing();
  };

  return (
    <div className="flex items-center justify-between border-b border-cyan-500/20 bg-[#050913]/95 px-4 py-3 md:hidden z-30 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/50 bg-cyan-950/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]">
          <Bot size={16} />
        </div>
        <span className="font-display font-bold tracking-[0.25em] text-white">ACDSF</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:text-cyan-300 hover:bg-white/5"
          title="Toggle Audio"
        >
          {audioActive ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} className="text-rose-400" />}
        </button>

        <button
          onClick={onOpenNotifications}
          className="relative rounded-lg border border-white/10 p-2 text-slate-300 transition hover:text-cyan-300 hover:bg-white/5"
          title="Open Notification Center"
        >
          <Bell size={16} />
          {alerts > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-600 px-1 font-mono text-[9px] font-bold text-white">
              {alerts}
            </span>
          )}
        </button>

        <ThemeToggle compact />

        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-white/10 p-2 text-slate-300 transition-all duration-200 hover:text-cyan-300 hover:bg-white/5"
        >
          <Menu size={18} />
        </button>
      </div>

      {open && (
        <div className="absolute left-3 right-3 top-16 z-50 max-h-[80vh] space-y-1 overflow-y-auto rounded-2xl border border-cyan-500/30 bg-[#07090e]/95 p-3 shadow-2xl backdrop-blur-2xl">
          {navSections.flatMap((s) => s.items).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition-all duration-150 ${
                  isActive ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              <Icon size={15} /> {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
