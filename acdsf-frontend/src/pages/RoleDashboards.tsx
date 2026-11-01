import {
  Users,
  Shield,
  Crosshair,
  Radar,
  Radio,
  CheckCircle2,
  Lock,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { HoloCard } from '../components/ui/HoloCard';
import { Link } from 'react-router-dom';
import { CyberBadge } from '../components/ui/CyberBadge';
import { PulseBeacon } from '../components/ui/CyberIcons';
import { useDefence } from '../hooks/useDefence';
import { apiClient } from '../services/apiClient';
import { getStoredToken } from '../utils/token';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001';

const defaultOperators = [
  { name: 'Director Vance', role: 'admin', last: 'Live Active', access: 'TS-SCI Level 5', status: 'ONLINE' },
  { name: 'Lead Analyst Kowalski', role: 'analyst', last: '1m ago', access: 'Intel Level 4', status: 'ONLINE' },
  { name: 'Red Cell Commander', role: 'red-team', last: '4m ago', access: 'Adversary Level 4', status: 'ONLINE' },
  { name: 'Blue Cell Commander', role: 'blue-team', last: 'Live Active', access: 'Containment Level 4', status: 'ONLINE' },
  { name: 'Analyst Sarah Chen', role: 'analyst', last: '12m ago', access: 'Triage Level 3', status: 'IDLE' },
];

export function AdminDashboard() {
  const data = useDefence();
  const [emergencyLocked, setEmergencyLocked] = useState(false);
  const [realUsers, setRealUsers] = useState<any[]>([]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    fetch(`${API_BASE}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.users)) {
          setRealUsers(d.users);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-[#00f5ff] animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00f5ff]">
              SOVEREIGN GOVERNANCE // SYSTEM COMMAND
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">
            Admin — National System Sovereignty
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Global orchestration of service mesh fabrics, operator clearances, and emergency lockdown controls.
          </p>
        </div>
        <CyberBadge label="CLEARANCE: LEVEL 5 ROOT" tone="acid" />
      </div>

      {/* Service Mesh Health Matrix */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.services).map(([k, v]) => (
          <HoloCard key={k} glowColor={v ? 'acid' : 'cyan'} className="p-5 text-center">
            <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 uppercase">
              <span>SERVICE MESH</span>
              <PulseBeacon color={v ? 'acid' : 'cyan'} size="sm" />
            </div>
            <p className="mt-2 font-display text-lg font-bold text-white capitalize">{k}</p>
            <span
              className={`mt-2 inline-block rounded-full border px-3 py-0.5 font-mono text-[10px] uppercase ${
                v
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-[#00ff9d]'
                  : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
              }`}
            >
              {v ? 'OPERATIONAL' : 'SIMULATED MESH'}
            </span>
          </HoloCard>
        ))}
      </div>

      {/* Operator Directory */}
      <HoloCard glowColor="multi" className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-cyan-400" />
            <h3 className="font-display text-lg font-bold text-white">
              Authorized Operator Clearance Matrix
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-400">
              {realUsers.length > 0 ? `${realUsers.length} REGISTERED IDENTITIES` : '5 SESSIONS ACTIVE'}
            </span>
            <Link
              to="/app/users"
              className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3 py-1 font-mono text-[10px] font-bold text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
            >
              OPEN FULL IAM CONSOLE →
            </Link>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-white/10 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="pb-3">Operator Name</th>
                <th className="pb-3">Command Role</th>
                <th className="pb-3">Telemetry / Last Active</th>
                <th className="pb-3">Clearance Level</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(realUsers.length > 0
                ? realUsers.map((u) => ({
                    name: u.full_name || u.username,
                    role: u.role,
                    last: u.last_login ? new Date(u.last_login).toLocaleTimeString() : 'N/A',
                    access: u.role === 'admin' ? 'TS-SCI Level 5 Root' : 'Clearance Level 3',
                    status: 'ONLINE',
                  }))
                : defaultOperators
              ).map((o, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition">
                  <td className="py-3 font-bold text-white">{o.name}</td>
                  <td className="py-3">
                    <span className="font-bold uppercase text-cyan-300">{o.role}</span>
                  </td>
                  <td className="py-3 text-slate-400">{o.last}</td>
                  <td className="py-3 text-purple-300">{o.access}</td>
                  <td className="py-3 text-right">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                        o.status === 'ONLINE'
                          ? 'bg-emerald-500/20 text-[#00ff9d] border border-emerald-500/40'
                          : 'bg-slate-700/20 text-slate-400 border border-slate-700/40'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HoloCard>

      {/* Emergency Global Lockdown Switch */}
      <HoloCard glowColor="magenta" className="p-6 border-pink-500/40">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase text-pink-400 font-bold">
              SOVEREIGN OVERRIDE PROTOCOL
            </span>
            <h3 className="mt-1 font-display text-xl font-bold text-white">
              Global Sovereign Network Lockdown
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              Isolates all 6 sector perimeter gateways, re-encrypts all mesh tokens, and enforces zero-trust kernel boundaries.
            </p>
          </div>
          <button
            onClick={() => setEmergencyLocked(!emergencyLocked)}
            className={`rounded-xl px-6 py-3 font-mono text-xs font-bold uppercase transition ${
              emergencyLocked
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-pink-600 text-white shadow-[0_0_25px_rgba(255,0,127,0.5)] hover:brightness-110'
            }`}
          >
            {emergencyLocked ? 'RESTORE MESH TRAFFIC' : 'ENGAGE LOCKDOWN'}
          </button>
        </div>
      </HoloCard>
    </div>
  );
}

export function AnalystDashboard() {
  const data = useDefence();
  const [selId, setSelId] = useState<string | number | null>(null);
  const sel = data.alerts.find((a) => a.id === selId) || data.alerts[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-purple-400 animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-purple-300">
              THREAT HUNTING WORKBENCH // INVESTIGATION DESK
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">
            Analyst — Deep Packet & Triage Workbench
          </h2>
        </div>
        <CyberBadge label="ANALYST CLEARANCE L4" tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left: Active Incidents Queue */}
        <HoloCard glowColor="cyan" className="p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-cyan-300">
              <Radar size={16} /> Active Intrusions In Triage
            </p>
            <span className="font-mono text-[10px] text-slate-400">{data.alerts.length} ALERTS</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {data.alerts.map((a) => {
              const isSelected = (sel?.id === a.id);
              return (
                <button
                  key={String(a.id)}
                  onClick={() => setSelId(a.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left font-mono text-xs transition ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_rgba(0,245,255,0.2)]'
                      : 'border-white/5 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div>
                    <span className="block font-bold text-white">{a.type}</span>
                    <span className="text-[10px] text-slate-400">Sector {a.sector} • Host {a.ip}</span>
                  </div>
                  <span className="rounded bg-white/5 px-2 py-1 text-[10px] text-purple-300">
                    {a.severity.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </HoloCard>

        {/* Right: Selected Case Dossier */}
        <HoloCard glowColor="violet" className="p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="font-mono text-[10px] uppercase text-purple-300">INCIDENT CASE DOSSIER</span>
            <span className="font-mono text-xs text-cyan-300">CASE ID #{sel?.id || '001'}</span>
          </div>

          <h3 className="mt-4 font-display text-2xl font-bold text-white">
            {sel?.type || 'Select an incident'}
          </h3>

          <div className="mt-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between rounded-lg bg-black/40 p-2.5">
              <span className="text-slate-400">Affected Host IP:</span>
              <span className="text-cyan-300 font-bold">{sel?.ip}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-black/40 p-2.5">
              <span className="text-slate-400">Sovereign Sector:</span>
              <span className="text-purple-300">{sel?.sector}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-black/40 p-2.5">
              <span className="text-slate-400">Detection Confidence:</span>
              <span className="text-[#00ff9d]">{sel?.confidence ?? 94}%</span>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-cyan-400/30 bg-cyan-950/40 p-4">
            <p className="font-mono text-[10px] uppercase text-cyan-300">Analyst Recommendation</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-200">
              {sel?.action || 'Isolate lateral movement pathways on port 445 and initiate forensic packet dump.'}
            </p>
          </div>
        </HoloCard>
      </div>
    </div>
  );
}

export function RedTeamDashboard() {
  const campaigns = [
    { name: 'Nightfall / Energy SCADA', progress: 74, vector: 'Zero-Day RCE', result: 'Pivot Established' },
    { name: 'Ledger / SWIFT Financial Gateway', progress: 45, vector: 'Credential Spray', result: 'WAF Intercepted' },
    { name: 'Harbor / Maritime Transport', progress: 20, vector: 'Spearphishing', result: 'Recon Only' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-pink-400 animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-pink-400">
              AUTONOMOUS ADVERSARY THEATRE // OFFENSIVE HUB
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">
            Red Team AI — Campaign Theatre
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Autonomous multi-stage cyber warfare simulations testing national infrastructure resilience.
          </p>
        </div>
        <CyberBadge label="CAMPAIGNS RUNNING" tone="magenta" />
      </div>

      {/* Campaign Progress Bars */}
      <div className="space-y-4">
        {campaigns.map((c) => (
          <HoloCard key={c.name} glowColor="magenta" className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <div className="flex items-center gap-2 text-pink-300 font-bold">
                <Crosshair size={16} className="text-[#ff007f]" />
                <span>{c.name}</span>
              </div>
              <span className="rounded bg-pink-500/20 px-2.5 py-0.5 text-[10px] text-pink-300 border border-pink-500/30">
                {c.result}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-slate-400">
              <span>Attack Vector: {c.vector}</span>
              <span>Killchain Progress: {c.progress}%</span>
            </div>

            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-900 border border-pink-500/20">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-rose-600 shadow-[0_0_12px_#ff007f]"
                style={{ width: `${c.progress}%` }}
              />
            </div>
          </HoloCard>
        ))}
      </div>

      {/* Attack Yield Visualizer */}
      <HoloCard glowColor="magenta" className="p-6">
        <h3 className="font-display text-lg font-bold text-white">
          Simulated Exploit Yield by Campaign
        </h3>
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={campaigns.map((c) => ({ n: c.name.split(' / ')[0], p: c.progress }))}>
              <XAxis dataKey="n" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#180712',
                  borderColor: '#ff007f',
                  borderRadius: '12px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="p" fill="#ff007f" radius={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </HoloCard>
    </div>
  );
}

export function BlueTeamDashboard() {
  const data = useDefence();
  const [note, setNote] = useState('');
  const [activeIncident, setActiveIncident] = useState<Record<string, unknown> | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [actionHistory, setActionHistory] = useState<string[]>([]);

  const DEFENSIVE_ACTIONS = [
    { id: 'Block Source IP', label: 'Block Source IP', icon: Lock, color: 'from-pink-500 to-rose-600', desc: 'Firewall rule to drop all traffic from attack source' },
    { id: 'Isolate Target Node', label: 'Isolate Target Node', icon: Shield, color: 'from-orange-500 to-red-600', desc: 'SDN microsegmentation to quarantine the target node' },
    { id: 'Apply Rate Limiting', label: 'Apply Rate Limiting', icon: Activity, color: 'from-yellow-500 to-amber-600', desc: 'Traffic shaping to throttle attack bandwidth' },
    { id: 'Contain Incident', label: 'Contain Incident', icon: CheckCircle2, color: 'from-emerald-500 to-green-600', desc: 'Full incident containment and Blue Team resolution' },
  ];

  const pollActive = useCallback(async () => {
    const res = await apiClient.getActiveAttack();
    if (res.ok && res.data) {
      setActiveIncident(res.data as Record<string, unknown>);
    } else {
      // Check last incident
      const histRes = await apiClient.getIncidents();
      if (histRes.ok && Array.isArray(histRes.data) && histRes.data.length > 0) {
        const last = histRes.data[0] as Record<string, unknown>;
        // Only show if recent (within 2 minutes)
        const created = new Date(last.created_at as string).getTime();
        if (Date.now() - created < 120_000) {
          setActiveIncident(last);
        } else {
          setActiveIncident(null);
        }
      }
    }
  }, []);

  useEffect(() => {
    pollActive();
    const interval = setInterval(pollActive, 2000);
    return () => clearInterval(interval);
  }, [pollActive]);

  const handleAction = async (action: string) => {
    if (!activeIncident?.incident_id || isActing) return;
    setIsActing(true);
    const incId = activeIncident.incident_id as string;
    const res = await apiClient.containAttack(incId, action);
    if (res.ok) {
      const msg = `[${new Date().toLocaleTimeString()}] ${action} applied to ${incId} — CONTAINED BY BLUE TEAM`;
      setNote(msg);
      setActionHistory(prev => [msg, ...prev].slice(0, 20));
      // Also SDN isolate if applicable
      if (action === 'Isolate Target Node' && activeIncident.target) {
        await apiClient.blockHost(activeIncident.target as string);
      }
    } else {
      setNote(`[ERROR] Action failed: ${JSON.stringify(res.data)}`);
    }
    setIsActing(false);
  };

  const fmtTime = (iso?: string) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleTimeString(); } catch { return iso; }
  };

  const statusColor = (s?: string) => {
    if (s === 'ACTIVE') return 'text-orange-400';
    if (s === 'DETECTED') return 'text-pink-400';
    if (s === 'RESPONDING') return 'text-yellow-400';
    if (s?.includes('CONTAINED')) return 'text-emerald-400';
    if (s?.includes('STOPPED')) return 'text-slate-400';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-[#00ff9d] animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00ff9d]">
              AUTONOMOUS SOAR PROTECTION FLOOR
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">
            Blue Team AI — Protection &amp; Containment Floor
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Autonomous multi-agent containment, instant microsegmentation, and SOAR mitigation queues.
          </p>
        </div>
        <CyberBadge label="BLUE GUARD ACTIVE" tone="acid" />
      </div>

      {/* Quick KPI Stat Trio */}
      <div className="grid gap-4 sm:grid-cols-3">
        <HoloCard glowColor="cyan" className="p-5">
          <Shield className="text-[#00f5ff]" size={24} />
          <p className="mt-3 font-mono text-[10px] uppercase text-slate-400">Threats Blocked</p>
          <p className="font-display text-3xl font-bold text-white">{data.twins.filter(t => t.alert_count > 0).length || 24}</p>
        </HoloCard>
        <HoloCard glowColor="acid" className="p-5">
          <CheckCircle2 className="text-[#00ff9d]" size={24} />
          <p className="mt-3 font-mono text-[10px] uppercase text-slate-400">Automated SOAR Fires</p>
          <p className="font-display text-3xl font-bold text-white">{actionHistory.length || 18}</p>
        </HoloCard>
        <HoloCard glowColor="magenta" className="p-5">
          <Lock className="text-pink-400" size={24} />
          <p className="mt-3 font-mono text-[10px] uppercase text-slate-400">Hosts Isolated</p>
          <p className="font-display text-3xl font-bold text-white">
            {data.twins.filter((t) => t.is_compromised).length || 2}
          </p>
        </HoloCard>
      </div>

      {/* Active Incident Response */}
      {activeIncident ? (
        <HoloCard glowColor="magenta" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-pink-400 animate-pulse" />
            <h3 className="font-display text-lg font-bold text-white">Active Incident — Blue Team Response</h3>
            <span className={`ml-auto font-mono text-xs font-bold ${statusColor(activeIncident.status as string)}`}>
              {activeIncident.status as string}
            </span>
          </div>

          {/* Incident Summary */}
          <div className="grid grid-cols-2 gap-3 mb-4 font-mono text-xs">
            <div className="rounded-lg bg-black/40 p-2.5">
              <p className="text-slate-500 text-[10px] uppercase">Incident ID</p>
              <p className="font-bold text-cyan-300 mt-0.5">{activeIncident.incident_id as string}</p>
            </div>
            <div className="rounded-lg bg-black/40 p-2.5">
              <p className="text-slate-500 text-[10px] uppercase">Attack Type</p>
              <p className="font-bold text-white mt-0.5">{activeIncident.attack_type as string}</p>
            </div>
            <div className="rounded-lg bg-black/40 p-2.5">
              <p className="text-slate-500 text-[10px] uppercase">Target</p>
              <p className="font-bold text-purple-300 mt-0.5">{activeIncident.target as string}</p>
            </div>
            <div className="rounded-lg bg-black/40 p-2.5">
              <p className="text-slate-500 text-[10px] uppercase">Risk Score</p>
              <p className="font-bold text-pink-300 mt-0.5">{(activeIncident.risk_score as number) || 'N/A'}/100</p>
            </div>
            {(activeIncident.attack_detected_at as string) && (
              <div className="rounded-lg bg-black/40 p-2.5">
                <p className="text-slate-500 text-[10px] uppercase">Detection Time</p>
                <p className="font-bold text-yellow-300 mt-0.5">{fmtTime(activeIncident.attack_detected_at as string)}</p>
              </div>
            )}
            {(activeIncident.mitre_technique_id as string) && (
              <div className="rounded-lg bg-black/40 p-2.5">
                <p className="text-slate-500 text-[10px] uppercase">MITRE ATT&amp;CK</p>
                <p className="font-bold text-purple-300 mt-0.5">{activeIncident.mitre_technique_id as string}</p>
              </div>
            )}
          </div>

          {/* Defensive Action Buttons */}
          <p className="font-mono text-[10px] uppercase text-slate-400 mb-3">Defensive Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {DEFENSIVE_ACTIONS.map(action => (
              <button
                key={action.id}
                disabled={isActing || !!(activeIncident.final_status as string)}
                onClick={() => handleAction(action.id)}
                className={`flex items-center gap-2 rounded-xl bg-gradient-to-r ${action.color} p-3 font-mono text-xs font-bold uppercase text-white shadow-[0_0_12px_rgba(0,0,0,0.3)] transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                <action.icon size={14} />
                <span className="leading-tight">{action.label}</span>
              </button>
            ))}
          </div>

          {note && (
            <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-950/40 p-3 font-mono text-xs text-emerald-300">
              {note}
            </div>
          )}
        </HoloCard>
      ) : (
        <HoloCard glowColor="multi" className="p-6">
          <h3 className="font-display text-lg font-bold text-white">Active Defense Containment Queue</h3>
          <p className="mt-1 text-xs text-slate-400">
            No active attack detected. Monitoring for threats...
          </p>

          <div className="mt-4 space-y-2.5">
            {data.twins
              .filter((t) => t.is_compromised || t.alert_count)
              .slice(0, 6)
              .map((t) => (
                <div
                  key={t.node_id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3 font-mono text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{t.node_id}</span>
                    <span className="ml-3 text-slate-400">Sector {t.sector}</span>
                  </div>
                  <button
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1.5 font-bold uppercase text-slate-950 shadow-[0_0_12px_rgba(0,245,255,0.3)] hover:brightness-110 transition"
                    onClick={async () => {
                      await apiClient.blockHost(t.node_id);
                      setNote(`[SDN ENFORCED] Isolated host ${t.node_id}.`);
                    }}
                  >
                    SDN Isolate
                  </button>
                </div>
              ))}
          </div>

          {note && (
            <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-950/40 p-3 font-mono text-xs text-emerald-300">
              {note}
            </div>
          )}
        </HoloCard>
      )}

      {/* Action History */}
      {actionHistory.length > 0 && (
        <HoloCard glowColor="acid" className="p-5">
          <p className="font-mono text-[10px] uppercase text-slate-400 mb-3">Blue Team Action Log</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {actionHistory.map((a, i) => (
              <p key={i} className="font-mono text-[11px] text-emerald-300">{a}</p>
            ))}
          </div>
        </HoloCard>
      )}
    </div>
  );
}
