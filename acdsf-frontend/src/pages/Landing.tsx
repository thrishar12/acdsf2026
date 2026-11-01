import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  ChevronRight,
  Database,
  Eye,
  ShieldCheck,
  Zap,
  Activity,
  Radio,
  Lock,
  Cpu,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CyberCanvas } from '../components/viz/CyberCanvas';
import { HoloCard } from '../components/ui/HoloCard';
import { CyberBadge } from '../components/ui/CyberBadge';
import { RadarPingIcon, ShieldHoloIcon } from '../components/ui/CyberIcons';
import { useAuth } from '../context/AuthContext';

const modules = [
  {
    n: '01',
    icon: Database,
    title: 'Living Digital Twin',
    subtitle: 'National Infrastructure Fabric',
    copy: 'High-fidelity mirror of every critical asset, live CPU loads, memory traces, open attack surfaces, and compromise states across 6 sovereign sectors.',
    glow: 'cyan' as const,
    stat: '43 Active Nodes',
  },
  {
    n: '02',
    icon: Eye,
    title: 'Adversary Threat Intelligence',
    subtitle: 'Red Team AI & TTP Synthesis',
    copy: 'Continuous threat actor mapping, IOC fusion, and autonomous attack-path synthesis modeling nation-state APTs with MITRE ATT&CK integration.',
    glow: 'magenta' as const,
    stat: '24+ Active TTPs',
  },
  {
    n: '03',
    icon: ShieldCheck,
    title: 'Autonomous Blue Defence',
    subtitle: 'SDN Microsegmentation & SOAR',
    copy: 'Autonomous host isolation, honeytoken triggers, and automated firewall remediation rules executing in sub-second defensive windows.',
    glow: 'acid' as const,
    stat: '98.8% Auto-Contain',
  },
  {
    n: '04',
    icon: Bot,
    title: 'Explainable AI & Machine Reasoning',
    subtitle: 'SHAP / LIME Auditable Decisions',
    copy: 'Transparent AI reasoning with real-time SHAP waterfall charts, feature importance ranking, and human-in-the-loop sovereign oversight.',
    glow: 'violet' as const,
    stat: '100% Auditable',
  },
];

const sectorsPreview = [
  { name: 'Energy Grid', score: 94, status: 'SECURE', tone: 'acid' as const },
  { name: 'Financial Core', score: 88, status: 'GUARDED', tone: 'cyan' as const },
  { name: 'Healthcare', score: 96, status: 'SECURE', tone: 'acid' as const },
  { name: 'Defense Net', score: 99, status: 'DEFCON-1 ARMED', tone: 'acid' as const },
  { name: 'Telecom Grid', score: 82, status: 'PROBE DETECTED', tone: 'warn' as const },
  { name: 'Transport Nexus', score: 91, status: 'SECURE', tone: 'acid' as const },
];

export function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSimTab, setActiveSimTab] = useState<'red' | 'blue' | 'xai'>('blue');

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030712] text-slate-100">
      {/* Interactive Background Canvas */}
      <CyberCanvas className="opacity-75" />

      {/* Cyber Grid & Scanline Overlays */}
      <div className="cyber-grid-bg pointer-events-none fixed inset-0 opacity-40" />
      <div className="scanlines pointer-events-none fixed inset-0 opacity-25" />

      {/* Top Telemetry Classification Header */}
      <div className="relative z-20 border-b border-cyan-500/15 bg-[#030814]/80 px-6 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between font-mono text-[9px] uppercase tracking-widest text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Radio size={12} className="animate-pulse text-[#00f5ff]" />
              NETWORK PROTOCOL // TLS-1.3 ENCRYPTED
            </span>
            <span className="hidden text-slate-600 sm:inline">|</span>
            <span className="hidden text-slate-400 sm:inline">NATIONAL SECURITY DIRECTIVE 2026-X</span>
          </div>
          <div className="flex items-center gap-3">
            <CyberBadge label="SIMULATION FABRIC ONLINE" tone="acid" size="sm" />
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-950/50 shadow-[0_0_20px_rgba(0,245,255,0.3)]">
            <ShieldHoloIcon size={26} />
          </div>
          <div>
            <p className="font-display text-base font-bold tracking-[0.3em] text-white glow-text">ACDSF</p>
            <p className="font-mono text-[9px] tracking-widest text-cyan-400/80">AI CYBER DEFENCE SIMULATION FRAMEWORK</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-cyan-400/40 bg-cyan-950/40 px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-cyan-200 backdrop-blur-md transition-all duration-300 hover:border-cyan-300 hover:bg-cyan-500/20 hover:shadow-[0_0_25px_rgba(0,245,255,0.4)]"
          >
            <Lock size={13} className="text-[#00f5ff] transition-transform group-hover:brightness-110" />
            <span>OPERATOR ACCESS</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto flex min-h-[85vh] max-w-7xl flex-col justify-center px-6 pb-16 pt-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left Hero Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.3em] text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
            >
              <Zap size={13} className="text-[#00f5ff]" />
              Next-Gen Sovereign AI Defense
            </motion.div>

            <h1 className="mt-5 font-display text-[15vw] leading-[0.82] tracking-[0.14em] text-white sm:text-[11vw] lg:text-[7.8rem]">
              {'ACDSF'.split('').map((ch, i) => (
                <motion.span
                  key={ch + i}
                  className="acdsf-letter glow-text inline-block"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.09 * i, duration: 0.6 }}
                >
                  {ch}
                </motion.span>
              ))}
            </h1>

            <p className="mt-4 font-mono text-sm tracking-wider text-cyan-300 sm:text-base">
              Autonomous Threat Synthesis. Living Digital Twins. Real-Time Explainable AI.
            </p>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Engineered for national security command teams to simulate catastrophic cyber warfare scenarios, test autonomous multi-agent Blue Team defenses, and audit AI decisions with complete explainability.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-[#00f5ff] via-[#22d3ee] to-[#38bdf8] px-8 py-4 font-mono text-xs font-bold uppercase tracking-widest text-slate-950 shadow-[0_0_35px_rgba(0,245,255,0.45)] transition-all duration-300 hover:brightness-105 hover:shadow-[0_0_50px_rgba(0,245,255,0.7)]"
              >
                <span>ENTER COMMAND CENTER</span>
                <ArrowRight size={16} />
              </button>

              <a
                href="#modules"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-4 font-mono text-xs uppercase tracking-widest text-slate-200 backdrop-blur-md transition hover:border-cyan-400/40 hover:bg-white/10"
              >
                <span>SYSTEM SPECIFICATION</span>
                <ChevronRight size={15} />
              </a>
            </div>

            {/* Live Telemetry Bar */}
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-cyan-500/15 pt-6 font-mono text-xs">
              <div>
                <p className="text-[10px] uppercase text-slate-500">Autonomous MTTD</p>
                <p className="mt-1 font-display text-xl text-[#00f5ff]">1.8s</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500">Interception Rate</p>
                <p className="mt-1 font-display text-xl text-[#00ff9d]">99.4%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500">Sovereign Sectors</p>
                <p className="mt-1 font-display text-xl text-purple-300">6 / 6 Live</p>
              </div>
            </div>
          </div>

          {/* Right Holographic HUD Terminal Widget */}
          <div className="relative">
            <HoloCard glowColor="multi" className="p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <RadarPingIcon size={20} />
                  <span className="font-mono text-xs font-bold text-cyan-300 uppercase tracking-widest">
                    Sovereign Sector Grid
                  </span>
                </div>
                <CyberBadge label="LIVE DEFENSE" tone="acid" size="sm" />
              </div>

              {/* Sectors Grid List */}
              <div className="mt-4 space-y-2.5">
                {sectorsPreview.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3.5 py-2.5 transition hover:border-cyan-400/30 hover:bg-cyan-500/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-xs font-medium text-white">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-slate-400">{s.status}</span>
                      <span className="font-mono text-xs font-bold text-cyan-300">{s.score}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Attack Beam Feed */}
              <div className="mt-5 rounded-xl border border-pink-500/20 bg-pink-950/20 p-3 text-xs">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-pink-300">
                  <span className="flex items-center gap-1.5">
                    <Flame size={12} className="text-pink-400" /> Active Skirmish Stream
                  </span>
                  <span>T-00:04</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-300">
                  Red AI injected Zero-Day RCE against Energy SCADA Node #12. Blue AI SDN quarantine activated in 210ms.
                </p>
              </div>
            </HoloCard>
          </div>
        </div>
      </section>

      {/* Core Architectural Modules */}
      <section id="modules" className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#00f5ff]">
            Architecture // Sovereign Security Framework
          </p>
          <h2 className="mt-2 font-display text-3xl text-white sm:text-4xl">
            FOUR PILLARS OF NATIONAL CYBER COMMAND
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
            A unified simulation and defense engine designed to anticipate, withstand, and autonomously counter multi-vector hybrid warfare.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {modules.map((m, i) => (
            <motion.div
              key={m.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <HoloCard glowColor={m.glow} className="h-full p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-950/60 text-[#00f5ff] shadow-[0_0_15px_rgba(0,245,255,0.2)]">
                      <m.icon size={22} />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] tracking-widest text-cyan-400/80">{m.subtitle}</p>
                      <h3 className="font-display text-xl text-white">{m.title}</h3>
                    </div>
                  </div>
                  <span className="font-mono text-lg font-bold text-slate-500">{m.n}</span>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-slate-300">{m.copy}</p>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-xs">
                  <span className="text-slate-400">TELEMETRY BENCHMARK</span>
                  <span className="font-bold text-[#00f5ff]">{m.stat}</span>
                </div>
              </HoloCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Interactive Simulation Capability Showcase */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <HoloCard glowColor="multi" className="p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <CyberBadge label="LIVE SIMULATION ARENA" tone="cyan" />
              <h3 className="mt-3 font-display text-3xl text-white">
                Battlefield Multi-Agent Automation
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Experience the live friction between autonomous attack generation (Red Team) and automated playbooks (Blue Team) with full machine-reasoning transparency.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveSimTab('blue')}
                  className={`rounded-xl border px-4 py-2 font-mono text-xs uppercase tracking-wider transition ${
                    activeSimTab === 'blue'
                      ? 'border-cyan-400 bg-cyan-500/20 text-[#00f5ff]'
                      : 'border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Blue Team Containment
                </button>
                <button
                  onClick={() => setActiveSimTab('red')}
                  className={`rounded-xl border px-4 py-2 font-mono text-xs uppercase tracking-wider transition ${
                    activeSimTab === 'red'
                      ? 'border-pink-500 bg-pink-500/20 text-pink-300'
                      : 'border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Red Team Adversary AI
                </button>
                <button
                  onClick={() => setActiveSimTab('xai')}
                  className={`rounded-xl border px-4 py-2 font-mono text-xs uppercase tracking-wider transition ${
                    activeSimTab === 'xai'
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  XAI Reasoning
                </button>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => {
                    if (user) {
                      navigate('/app/simulation?autoStart=true');
                    } else {
                      navigate('/login');
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500 px-6 py-3 font-mono text-xs font-black uppercase text-white shadow-[0_0_25px_rgba(0,245,255,0.5)] transition hover:brightness-110"
                >
                  Launch Full Real Simulation <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Simulation Preview Card */}
            <div className="rounded-2xl border border-cyan-500/30 bg-black/60 p-6 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 text-slate-400">
                <span>SIMULATION ENGINE // TICK 0x4F8A</span>
                <span className="text-[#00ff9d]">STATUS: ACTIVE</span>
              </div>

              {activeSimTab === 'blue' && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3 rounded-lg bg-emerald-950/30 p-3 text-emerald-300 border border-emerald-500/20">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Playbook #409 Auto-Executed</p>
                      <p className="text-[11px] text-slate-400">Segmented VLAN 102 to isolate C2 communication on port 8443.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-cyan-950/30 p-3 text-cyan-300 border border-cyan-500/20">
                    <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Honeytoken Triggered</p>
                      <p className="text-[11px] text-slate-400">Adversary beacon redirected to isolated decoy sandbox in Finance grid.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSimTab === 'red' && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3 rounded-lg bg-pink-950/30 p-3 text-pink-300 border border-pink-500/20">
                    <Flame size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">APT28 Lateral Movement Attempted</p>
                      <p className="text-[11px] text-slate-400">Synthesized Pass-the-Hash against Active Directory Domain Controller.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-rose-950/30 p-3 text-rose-300 border border-rose-500/20">
                    <Zap size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Exfiltration Vector Generated</p>
                      <p className="text-[11px] text-slate-400">DNS Tunneling payload prepared against Telecom DNS server.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSimTab === 'xai' && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3 rounded-lg bg-purple-950/30 p-3 text-purple-300 border border-purple-500/20">
                    <Cpu size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">SHAP Value: High Packet Entropy (+0.84)</p>
                      <p className="text-[11px] text-slate-400">Anomalous encrypted payload structure triggered automated isolation.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-cyan-950/30 p-3 text-cyan-300 border border-cyan-500/20">
                    <Activity size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Confidence Gauge: 97.4%</p>
                      <p className="text-[11px] text-slate-400">Neural classifier validated against 4,200 known exploit signatures.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </HoloCard>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cyan-500/20 bg-[#030712] px-6 py-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <p>ACDSF · AI-POWERED CYBER DEFENCE SIMULATION FRAMEWORK · SOVEREIGN PROTOCOL</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-cyan-400 hover:underline">
              OPERATOR CLEARANCE LOGIN
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
