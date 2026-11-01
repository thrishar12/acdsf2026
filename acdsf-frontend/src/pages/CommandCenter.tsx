import {
  Activity,
  AlertTriangle,
  Bot,
  Crosshair,
  Server,
  ShieldCheck,
  Target,
  Zap,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MetricCard } from '../components/ui/MetricCard';
import { RingStat } from '../components/ui/RingStat';
import { SituationMap } from '../components/viz/SituationMap';
import { useDefence } from '../hooks/useDefence';
import { useMetrics } from '../hooks/useMetrics';
import { HoloCard } from '../components/ui/HoloCard';
import { CyberBadge } from '../components/ui/CyberBadge';
import { PulseBeacon, RadarPingIcon } from '../components/ui/CyberIcons';
import { MiniSimView } from '../components/simulation/MiniSimView';
import { useTheme } from '../utils/theme';

const defaultTrend = [
  { day: 'Mon', risk: 31, intercepted: 142 },
  { day: 'Tue', risk: 28, intercepted: 168 },
  { day: 'Wed', risk: 34, intercepted: 195 },
  { day: 'Thu', risk: 25, intercepted: 130 },
  { day: 'Fri', risk: 24, intercepted: 210 },
  { day: 'Sat', risk: 19, intercepted: 98 },
  { day: 'Sun', risk: 22, intercepted: 185 },
];

export function CommandCenter() {
  const { isLight } = useTheme();
  const data = useDefence();
  const { metrics } = useMetrics();

  const risk = metrics.risk_score || data.kpis.risk_score || 22;
  const compromised = data.twins.filter((n) => n.is_compromised).length;

  const chartData = metrics.trend_7d && metrics.trend_7d.length > 0
    ? metrics.trend_7d.map((t) => ({
        day: t.day.length > 5 ? t.day.slice(5) : t.day,
        risk: Math.max(10, Math.min(95, t.incidents * 9 + 18)),
        intercepted: t.incidents * 12 + 25,
      }))
    : defaultTrend;

  const deskLinks = isLight
    ? [
        ['/app/admin', 'Admin Sovereignty', 'border-[#BAE6FD] bg-[#E0F2FE] text-[#0284C7] hover:bg-[#BAE6FD] font-semibold'],
        ['/app/analyst', 'Analyst Workbench', 'border-[#DDD6FE] bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#DDD6FE] font-semibold'],
        ['/app/red-team', 'Red Team Hub', 'border-[#FECACA] bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA] font-semibold'],
        ['/app/blue-team', 'Blue Team Floor', 'border-[#BBF7D0] bg-[#DCFCE7] text-[#16A34A] hover:bg-[#BBF7D0] font-semibold'],
      ]
    : [
        ['/app/admin', 'Admin Sovereignty', 'border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10'],
        ['/app/analyst', 'Analyst Workbench', 'border-purple-400/30 text-purple-200 hover:bg-purple-400/10'],
        ['/app/red-team', 'Red Team Hub', 'border-pink-500/30 text-pink-300 hover:bg-pink-500/10'],
        ['/app/blue-team', 'Blue Team Floor', 'border-emerald-400/30 text-emerald-200 hover:bg-emerald-400/10'],
      ];

  return (
    <div className="space-y-6">
      {/* Top Holographic Command HUD Banner */}
      <HoloCard glowColor="multi" className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <CyberBadge label="NATIONAL SECURITY THREAT LEVEL: DEFCON 2" tone="magenta" size="sm" />
              <span className={`hidden font-mono text-xs sm:inline ${isLight ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                LIVE FABRIC VERSION 2.6
              </span>
            </div>
            <h2 className={`mt-2 font-display text-2xl font-bold md:text-3xl ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>
              National Cyber Defense Fabric is Live.
            </h2>
            <p className={`mt-1 text-sm ${isLight ? 'text-[#475569]' : 'text-slate-300'}`}>
              Autonomous multi-agent AI defense nodes are continuously shielding 6 sovereign sectors. Click any sector node in the Cyber Situation Map below to inspect active telemetry and execute direct SDN containment.
            </p>
          </div>

          {/* Health Gauge & Radar Icon */}
          <div className="flex items-center gap-6">
            <div className="hidden sm:block">
              <RadarPingIcon size={64} />
            </div>
            <div className={`rounded-2xl border p-4 ${isLight ? 'border-2 border-[#F472B6] bg-gradient-to-br from-[#FFF0F5] via-[#FFFBEB] to-[#FCE7F3]' : 'border-white/10 bg-black/40'}`}>
              <RingStat value={100 - Number(risk)} label="Defense Readiness" color={isLight ? '#16A34A' : '#00ff9d'} />
            </div>
          </div>
        </div>

        {/* Quick Operator Desk Switcher Pills */}
        <div className={`mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4 font-mono text-xs ${
          isLight ? 'border-[#F472B6]' : 'border-white/10'
        }`}>
          <span className={isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}>OPERATOR ACCESS PORTALS:</span>
          <div className="flex flex-wrap gap-2">
            {deskLinks.map(([to, label, styles]) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[10px] uppercase tracking-wider transition ${styles}`}
              >
                <span>{label}</span>
                <ArrowUpRight size={12} />
              </Link>
            ))}
          </div>
        </div>
      </HoloCard>

      {/* 8-Card Holographic KPI Telemetry Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Threats Detected"
          value={data.kpis.active_threats || data.alerts.length || 7}
          detail="Hostile intrusions flagged"
          icon={AlertTriangle}
          tone="red"
        />
        <MetricCard
          label="Total Sovereign Nodes"
          value={data.twins.length || 43}
          detail="Across 6 critical sectors"
          icon={Server}
          tone="cyan"
        />
        <MetricCard
          label="Compromised Assets"
          value={compromised || 2}
          detail="Contained in sandbox isolation"
          icon={Target}
          tone="warn"
        />
        <MetricCard
          label="AI Defence Interception"
          value={data.kpis.detection_rate || 96.8}
          suffix="%"
          detail="Sub-second MTTD"
          icon={Bot}
          tone="ok"
        />
        <MetricCard
          label="Red Team Simulations"
          value={12}
          detail="Autonomous campaigns active"
          icon={Crosshair}
          tone="red"
        />
        <MetricCard
          label="Blue Team MTTR"
          value={data.kpis.mttr || 4.2}
          suffix="m"
          detail="Mean time to remediate"
          icon={ShieldCheck}
          tone="ok"
        />
        <MetricCard
          label="Aggregate Risk Score"
          value={risk}
          detail="Guarded posture / 100"
          icon={Zap}
          tone="warn"
        />
        <MetricCard
          label="System Sovereignty"
          value={99.98}
          suffix="%"
          detail="TLS 1.3 / Mesh Operational"
          icon={Activity}
          tone="ok"
        />
      </div>

      {/* Live Cyber Arena Battle Mini-View */}
      <MiniSimView />

      {/* Centerpiece: Situation Map & 7-Day Trend Chart */}
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        {/* Left: 6-Sector Cyber Situation Map */}
        <HoloCard glowColor="cyan" className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <PulseBeacon color="cyan" size="sm" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#00f5ff]">
                  Sovereign Sector Grid
                </p>
              </div>
              <h3 className="mt-1 font-display text-xl font-bold text-white">
                Interactive Cyber Situation Map
              </h3>
            </div>
            <CyberBadge label="ORBITAL MAP ACTIVE" tone="acid" size="sm" />
          </div>

          <SituationMap scores={data.sectors} twins={data.twins} />
        </HoloCard>

        {/* Right: 7-Day Posture Movement & Defense Trajectory */}
        <HoloCard glowColor="violet" className="flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-mono text-[10px] uppercase tracking-widest ${isLight ? 'text-[#7C3AED] font-bold' : 'text-purple-300'}`}>
                  Risk Analytics
                </p>
                <h3 className={`mt-1 font-display text-xl font-bold ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>
                  7-Day Risk & Attack Posture
                </h3>
              </div>
              <TrendingUp className={isLight ? 'text-[#0284C7]' : 'text-[#00f5ff]'} size={20} />
            </div>

            <div className="my-6 flex items-center justify-center">
              <RingStat value={risk} label="Current Risk Level" color={isLight ? '#D97706' : '#fbbf24'} />
            </div>
          </div>

          <div>
            <p className={`mb-2 font-mono text-[10px] uppercase ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
              Trend Trajectory // Threat Velocity
            </p>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isLight ? '#0284C7' : '#00f5ff'} stopOpacity={isLight ? 0.3 : 0.45} />
                    <stop offset="95%" stopColor={isLight ? '#0284C7' : '#00f5ff'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={isLight ? '#E2E8F0' : '#1e293b'} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: isLight ? '#475569' : '#64748b', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis tick={{ fill: isLight ? '#475569' : '#64748b', fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? '#FFFFFF' : '#071326',
                    borderColor: isLight ? '#E2E8F0' : '#00f5ff',
                    borderRadius: '12px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: isLight ? '#0F172A' : '#fff',
                    boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.08)' : undefined,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="risk"
                  stroke={isLight ? '#0284C7' : '#00f5ff'}
                  strokeWidth={2.5}
                  fill="url(#riskGlow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </HoloCard>
      </div>
    </div>
  );
}
