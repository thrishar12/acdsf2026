import { useState } from 'react';
import {
  User,
  Shield,
  Key,
  Lock,
  Clock,
  Terminal,
  LogOut,
  RefreshCw,
  Copy,
  CheckCircle2,
  ShieldCheck,
  FileCode,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { CyberBadge } from '../components/ui/CyberBadge';
import { toast } from '../components/ui/Toast';
import { PulseBeacon } from '../components/ui/CyberIcons';

const CLEARANCE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'System-wide Root Clearance & Configuration',
    'Tactical SDN Graph Mutation & Route Interdiction',
    'Adversary Simulation Trigger (Red Team)',
    'Autonomous AI Mitigation Deployment (Blue Team)',
    'Identity & Access Management (IAM)',
    'Global Security Audit Trail Access',
  ],
  analyst: [
    'Incident Triage & Radar Assessment',
    'MITRE ATT&CK Knowledge Graph Traversal',
    'XAI Machine Reasoning Inspection',
    'Real-time Telemetry & Metrics Monitoring',
    'Case Generation & SOAR Playbook Execution',
  ],
  'red-team': [
    'Adversary Emulation & APT Campaign Injection',
    'CIC-IDS2017 Dataset Threat Replay',
    'Reconnaissance & Vulnerability Scanning',
    'Lateral Movement Simulation',
  ],
  'blue-team': [
    'Autonomous SDN Node Isolation',
    'Firewall & Traffic Scrubbing Deployment',
    'Acoustic Siren & Incident Containment',
    'Telemetry Defense Verification',
  ],
  viewer: [
    'Read-only Sovereign Dashboard Observation',
    'Public Threat Intelligence Feed',
  ],
};

export function ProfilePage() {
  const { user, token, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const permissions = user?.role ? (CLEARANCE_PERMISSIONS[user.role] || CLEARANCE_PERMISSIONS.analyst) : [];

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success('JWT Bearer token copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      toast.success('Session verified and identity refreshed');
    } catch {
      toast.error('Session refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const getTone = (role?: string): 'magenta' | 'cyan' | 'acid' | 'warn' | 'violet' => {
    switch (role) {
      case 'admin':
        return 'magenta';
      case 'red-team':
        return 'warn';
      case 'blue-team':
        return 'cyan';
      case 'analyst':
        return 'acid';
      default:
        return 'violet';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/50 bg-cyan-950/50 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
            <span className="font-mono text-xl font-bold">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
            </span>
            <div className="absolute -bottom-1 -right-1">
              <PulseBeacon color="acid" size="sm" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-wider text-white">
                {user?.name || 'Tactical Operator'}
              </h1>
              <CyberBadge label={user?.role?.toUpperCase() || 'ANALYST'} tone={getTone(user?.role)} size="sm" />
            </div>
            <p className="font-mono text-xs text-slate-400 mt-0.5">
              Identity Coordinate: <span className="text-cyan-300">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-4 py-2 font-mono text-xs font-bold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/50 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            SYNC IDENTITY
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-2 rounded-xl border border-pink-500/30 bg-pink-950/40 px-4 py-2 font-mono text-xs font-bold text-pink-300 hover:border-pink-500/60 hover:bg-pink-900/50 transition-all shadow-[0_0_12px_rgba(236,72,153,0.2)]"
          >
            <LogOut size={13} />
            TERMINATE SESSION
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dossier Details */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 border-cyan-500/20">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-300 mb-4 flex items-center gap-2">
              <User size={15} />
              TACTICAL DOSSIER SPECIFICATIONS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Operator Call-Sign</span>
                <span className="text-white font-bold text-sm tracking-wide">{user?.name}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Sovereign Email Coordinate</span>
                <span className="text-cyan-300 font-bold text-xs truncate block">{user?.email}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Assigned Security Clearance</span>
                <span className="text-pink-300 font-bold text-xs uppercase">{user?.role} Level Sovereignty</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Cryptographic Standard</span>
                <span className="text-emerald-300 font-bold text-xs">HS256 JWT / bcrypt Hashed</span>
              </div>
            </div>
          </GlassCard>

          {/* Clearance Capabilities Matrix */}
          <GlassCard className="p-6 border-purple-500/20">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-purple-300 mb-4 flex items-center gap-2">
              <ShieldCheck size={15} />
              ACTIVE AUTHORIZED CAPABILITIES
            </h2>
            <div className="space-y-2.5">
              {permissions.map((perm, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 font-mono text-xs text-slate-200"
                >
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Cryptographic Session & Token */}
        <div className="space-y-6">
          <GlassCard className="p-6 border-pink-500/20">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-pink-300 mb-4 flex items-center gap-2">
              <Lock size={15} />
              CRYPTOGRAPHIC SESSION
            </h2>

            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-slate-400">SESSION STATUS</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <PulseBeacon color="acid" size="sm" />
                  AUTHENTICATED
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-slate-400">ACCESS DURATION</span>
                <span className="text-white font-bold">1 HOUR / ROLLING</span>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-slate-400">RATE LIMIT PROTECTION</span>
                <span className="text-cyan-400 font-bold">ACTIVE (5 ERR/5M)</span>
              </div>

              <div className="pt-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2">Bearer Token Signature</span>
                <div className="relative rounded-xl border border-white/10 bg-black/80 p-3 font-mono text-[10px] text-slate-400 break-all max-h-28 overflow-y-auto">
                  {token ? `${token.slice(0, 80)}...` : 'No active token'}
                </div>
                <button
                  onClick={handleCopyToken}
                  className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/30 py-2 text-xs font-mono font-bold text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400 transition-all"
                >
                  {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copied ? 'COPIED TO CLIPBOARD' : 'COPY ACCESS TOKEN'}
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Quick Command Navigation */}
          <GlassCard className="p-6 border-cyan-500/20">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-300 mb-3 flex items-center gap-2">
              <Terminal size={15} />
              QUICK COMMANDS
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/app/command-center')}
                className="w-full text-left rounded-xl border border-white/5 bg-white/[0.02] p-2.5 font-mono text-xs text-slate-300 hover:border-cyan-500/40 hover:text-white transition-all flex items-center justify-between"
              >
                <span>Command Center</span>
                <Zap size={12} className="text-cyan-400" />
              </button>
              <button
                onClick={() => navigate('/app/users')}
                className="w-full text-left rounded-xl border border-white/5 bg-white/[0.02] p-2.5 font-mono text-xs text-slate-300 hover:border-cyan-500/40 hover:text-white transition-all flex items-center justify-between"
              >
                <span>IAM &amp; Operator Registry</span>
                <Zap size={12} className="text-cyan-400" />
              </button>
              <button
                onClick={() => navigate('/app/attack-report')}
                className="w-full text-left rounded-xl border border-white/5 bg-white/[0.02] p-2.5 font-mono text-xs text-slate-300 hover:border-cyan-500/40 hover:text-white transition-all flex items-center justify-between"
              >
                <span>Export Attack Dossier</span>
                <Zap size={12} className="text-cyan-400" />
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
