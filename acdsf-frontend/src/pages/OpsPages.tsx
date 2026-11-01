import {
  Shield,
  Radio,
  Lock,
  BarChart3,
  CheckCircle2,
  Settings,
  GitBranch,
  Play,
  Square,
  Activity,
  Crosshair,
  Volume2,
  VolumeX,
  Mail,
  Smartphone,
  Send,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { HoloCard } from '../components/ui/HoloCard';
import { CyberBadge } from '../components/ui/CyberBadge';
import { SituationMap } from '../components/viz/SituationMap';
import { useDefence } from '../hooks/useDefence';
import { apiClient } from '../services/apiClient';
import {
  playCriticalAlarm,
  playWarningAlarm,
  playContainmentChime,
  playAlertSound,
  setAudioEnabled,
  isAudioEnabled,
} from '../utils/audioAlarm';
import {
  getDesktopNotificationState,
  requestDesktopNotificationPermission,
  testDesktopNotification,
} from '../utils/notifications';

// Attack profiles available for simulation
const ATTACK_PROFILES = [
  { id: 'DDoS Simulation', label: 'DDoS Simulation', mitre: 'T1498', severity: 'HIGH', color: 'text-orange-400' },
  { id: 'Port Scan Simulation', label: 'Port Scan Simulation', mitre: 'T1046', severity: 'MEDIUM', color: 'text-yellow-400' },
  { id: 'Brute Force Simulation', label: 'Brute Force Simulation', mitre: 'T1110', severity: 'CRITICAL', color: 'text-pink-400' },
  { id: 'DoS Simulation', label: 'DoS Simulation', mitre: 'T1499', severity: 'HIGH', color: 'text-orange-400' },
  { id: 'Network Intrusion Simulation', label: 'Network Intrusion Simulation', mitre: 'T1021', severity: 'CRITICAL', color: 'text-pink-400' },
];

function formatDuration(startIso?: string, endIso?: string): string {
  if (!startIso) return '—';
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const secs = Math.round((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function fmtTime(iso?: string): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleTimeString(); } catch { return iso; }
}

function statusColor(status?: string): string {
  switch (status) {
    case 'ACTIVE': return 'text-orange-400';
    case 'DETECTED': return 'text-pink-400';
    case 'RESPONDING': return 'text-yellow-400';
    case 'STOPPED BY RED TEAM': return 'text-slate-400';
    case 'CONTAINED BY BLUE TEAM': return 'text-emerald-400';
    default: return 'text-slate-400';
  }
}

export function Simulation() {
  const data = useDefence();
  const [attackType, setAttackType] = useState(ATTACK_PROFILES[0].id);
  const [target, setTarget] = useState(data.twins[0]?.node_id || 'NODE-ENERGY-01');
  const [notifyEmail, setNotifyEmail] = useState(() => localStorage.getItem('acdsf_alert_email') || '');
  const [log, setLog] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeIncident, setActiveIncident] = useState<Record<string, unknown> | null>(null);
  const [elapsed, setElapsed] = useState('—');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = (msg: string) =>
    setLog((prev: string[]) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));

  // Poll active attack status
  const pollActive = useCallback(async () => {
    const res = await apiClient.getActiveAttack();
    if (res.ok && res.data) {
      setActiveIncident(res.data as Record<string, unknown>);
      setIsRunning(true);
    } else {
      if (isRunning) {
        setIsRunning(false);
        // Fetch final state
        const incidents = await apiClient.getIncidents();
        if (incidents.ok && Array.isArray(incidents.data) && incidents.data.length > 0) {
          setActiveIncident(incidents.data[0] as Record<string, unknown>);
        }
      }
    }
  }, [isRunning]);

  useEffect(() => {
    pollActive();
    pollRef.current = setInterval(pollActive, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollActive]);

  // Elapsed timer
  useEffect(() => {
    if (isRunning && activeIncident?.attack_started_at) {
      timerRef.current = setInterval(() => {
        setElapsed(formatDuration(activeIncident.attack_started_at as string));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, activeIncident?.attack_started_at]);

  const handleStartAttack = async () => {
    if (isRunning) return;
    const alertEmail = notifyEmail.trim() || localStorage.getItem('acdsf_alert_email') || undefined;
    // Save the email to localStorage for future sessions
    if (notifyEmail.trim()) {
      localStorage.setItem('acdsf_alert_email', notifyEmail.trim());
    }
    addLog(`Starting ${attackType} against ${target}...`);
    if (alertEmail) {
      addLog(`📧 Incoming attack alerts will be dispatched to: ${alertEmail}`);
    } else {
      addLog(`⚠️ No email set — notifications will go to default SOC admin email`);
    }
    const res = await apiClient.startAttack(attackType, target, alertEmail);
    if (res.ok && res.data) {
      const d = res.data as Record<string, unknown>;
      setActiveIncident(d);
      setIsRunning(true);
      addLog(`✓ Attack STARTED — Incident ID: ${d.incident_id}`);
      addLog(`Attack Start Time: ${fmtTime(d.attack_started_at as string)}`);
      addLog(`Status: ACTIVE — Waiting for AI detection & alert dispatch...`);
    } else {
      addLog(`✗ Failed to start attack: ${JSON.stringify(res.data)}`);
    }
  };

  const handleStopAttack = async () => {
    if (!isRunning) return;
    const incId = (activeIncident?.incident_id as string) || '';
    addLog(`Stopping attack ${incId}...`);
    const res = await apiClient.stopAttack();
    if (res.ok) {
      addLog(`✓ Attack STOPPED BY RED TEAM`);
      setIsRunning(false);
    } else {
      addLog(`✗ Stop failed: ${JSON.stringify(res.data)}`);
    }
  };

  const selectedProfile = ATTACK_PROFILES.find(p => p.id === attackType) || ATTACK_PROFILES[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-[#00f5ff] animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00f5ff]">
              REAL-TIME SIMULATION RUNTIME // WAR-GAME HARNESS
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">Live Cyber Simulation</h2>
        </div>
        <CyberBadge label={isRunning ? 'ATTACK ACTIVE' : 'SIMULATION RUNTIME ACTIVE'} tone={isRunning ? 'magenta' : 'acid'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <HoloCard glowColor="cyan" className="p-6">
          <SituationMap scores={data.sectors} twins={data.twins} />
        </HoloCard>

        {/* Red Team Attack Panel */}
        <div className="space-y-4">
          <HoloCard glowColor={isRunning ? 'magenta' : 'multi'} className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Crosshair size={18} className="text-pink-400" />
              <h3 className="font-display text-lg font-bold text-white">
                Attack Injection &amp; BEM Controls
              </h3>
            </div>

            {/* Attack Type Selector */}
            <div className="space-y-3">
              <div>
                <label className="font-mono text-[10px] uppercase text-slate-400">Attack Simulation Profile</label>
                <select
                  disabled={isRunning}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#071326] p-3 font-mono text-xs text-white outline-none focus:border-pink-400 disabled:opacity-50"
                  value={attackType}
                  onChange={(e) => setAttackType(e.target.value)}
                >
                  {ATTACK_PROFILES.map(p => (
                    <option key={p.id} value={p.id}>{p.label} [{p.mitre}]</option>
                  ))}
                </select>
              </div>

              {/* Profile Info */}
              <div className="flex items-center gap-3 rounded-lg bg-black/40 p-2.5 font-mono text-xs">
                <span className="text-slate-500">MITRE:</span>
                <span className="text-purple-300 font-bold">{selectedProfile.mitre}</span>
                <span className="text-slate-500 ml-auto">Severity:</span>
                <span className={`font-bold ${selectedProfile.color}`}>{selectedProfile.severity}</span>
              </div>

              {/* Target Node Selector */}
              <div>
                <label className="font-mono text-[10px] uppercase text-slate-400">Target Twin Node</label>
                <select
                  disabled={isRunning}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#071326] p-3 font-mono text-xs text-white outline-none focus:border-cyan-400 disabled:opacity-50"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  {data.twins.slice(0, 30).map((t) => (
                    <option key={t.node_id} value={t.node_id}>
                      {t.node_id} ({t.sector})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notification Email Input */}
              <div>
                <label className="font-mono text-[10px] uppercase text-slate-400">Notification Recipient Email</label>
                <div className="relative mt-1.5">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    disabled={isRunning}
                    placeholder="Enter any email to receive attack alerts"
                    className="w-full rounded-xl border border-white/10 bg-[#071326] py-3 pl-9 pr-3 font-mono text-xs text-white outline-none placeholder:text-slate-600 focus:border-emerald-400 disabled:opacity-50"
                    value={notifyEmail}
                    onChange={(e) => {
                      setNotifyEmail(e.target.value);
                      if (e.target.value.trim()) {
                        localStorage.setItem('acdsf_alert_email', e.target.value.trim());
                      }
                    }}
                  />
                </div>
                <p className="mt-1 font-mono text-[9px] text-slate-500">
                  Enter any Gmail or email — attack alerts and mitigation forensics will be delivered here live.
                </p>
              </div>
            </div>

            {/* START / STOP Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                disabled={isRunning}
                onClick={handleStartAttack}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 py-3 font-mono text-xs font-bold uppercase text-white shadow-[0_0_15px_rgba(255,0,127,0.4)] transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Play size={14} /> START ATTACK
              </button>
              <button
                disabled={!isRunning}
                onClick={handleStopAttack}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 py-3 font-mono text-xs font-bold uppercase text-white shadow-[0_0_10px_rgba(100,100,100,0.3)] transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Square size={14} /> STOP ATTACK
              </button>
            </div>
          </HoloCard>

          {/* Active Incident Status Panel */}
          {activeIncident && (
            <HoloCard glowColor={isRunning ? 'magenta' : 'acid'} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className={isRunning ? 'text-pink-400 animate-pulse' : 'text-emerald-400'} />
                <h4 className="font-mono text-xs font-bold uppercase text-white">
                  {isRunning ? 'ACTIVE INCIDENT' : 'LAST INCIDENT'}
                </h4>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Incident ID</span>
                  <span className="text-cyan-300 font-bold">{activeIncident.incident_id as string}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Attack Type</span>
                  <span className="text-white">{activeIncident.attack_type as string}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target</span>
                  <span className="text-purple-300">{activeIncident.target as string}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className={`font-bold ${statusColor(activeIncident.status as string)}`}>
                    {activeIncident.status as string}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Start Time</span>
                  <span className="text-emerald-300">{fmtTime(activeIncident.attack_started_at as string)}</span>
                </div>
                {(activeIncident.attack_detected_at as string) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Detection Time</span>
                    <span className="text-yellow-300">{fmtTime(activeIncident.attack_detected_at as string)}</span>
                  </div>
                )}
                {(activeIncident.attack_ended_at as string) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">End Time</span>
                    <span className="text-slate-300">{fmtTime(activeIncident.attack_ended_at as string)}</span>
                  </div>
                )}
                {isRunning && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Elapsed</span>
                    <span className="text-orange-300 font-bold">{elapsed}</span>
                  </div>
                )}
                {(activeIncident.duration_seconds as number) > 0 && !isRunning && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duration</span>
                    <span className="text-orange-300">{formatDuration(activeIncident.attack_started_at as string, activeIncident.attack_ended_at as string)}</span>
                  </div>
                )}
                {(activeIncident.confidence_score as number) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">AI Confidence</span>
                    <span className="text-emerald-300 font-bold">{activeIncident.confidence_score as number}%</span>
                  </div>
                )}
                {(activeIncident.risk_score as number) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Risk Score</span>
                    <span className="text-pink-300 font-bold">{activeIncident.risk_score as number}/100</span>
                  </div>
                )}
                {(activeIncident.mitre_technique_id as string) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">MITRE</span>
                    <span className="text-purple-300">{activeIncident.mitre_technique_id as string}</span>
                  </div>
                )}
              </div>
            </HoloCard>
          )}
        </div>
      </div>

      {/* Live Execution Log */}
      <HoloCard glowColor="cyan" className="p-5">
        <p className="font-mono text-[10px] uppercase text-slate-500 mb-2">Live Execution Log</p>
        <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl bg-black/40 p-3 font-mono text-[11px] text-cyan-300">
          {log.length === 0 ? (
            <span className="text-slate-600">Waiting for operator trigger...</span>
          ) : (
            log.map((l: string, i: number) => <p key={i}>{l}</p>)
          )}
        </div>
      </HoloCard>
    </div>
  );
}

export function Topology() {
  const data = useDefence();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch size={14} className="text-[#00f5ff] animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00f5ff]">
              SOVEREIGN SECTOR TOPOLOGY MAP
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">Network Topology</h2>
        </div>
        <CyberBadge label="TOPOLOGY CONVERGED" tone="acid" />
      </div>

      <HoloCard glowColor="cyan" className="p-6">
        <SituationMap scores={data.sectors} twins={data.twins} />
      </HoloCard>
    </div>
  );
}

export function AiDefence() {
  const data = useDefence();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-[#00ff9d] animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00ff9d]">
              AUTONOMOUS DEFENCE ENGINE // MULTI-AGENT SWARM
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">AI Autonomous Defence</h2>
          <p className="mt-1 text-sm text-slate-400">
            Active Blue Team intelligence shielding {data.twins.length} sovereign twins. Detection accuracy{' '}
            {data.kpis.detection_rate || 96.8}% • containment success rate{' '}
            {data.kpis.containment_success || 98.2}%.
          </p>
        </div>
        <CyberBadge label="BLUE SWARM ARMED" tone="acid" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'Sub-Second Host Isolation', desc: 'Kernel-level firewall rule generation executing under 200ms.', tone: 'cyan' as const },
          { title: 'Honeytoken Decoy Swarm', desc: 'Decoy Active Directory and SCADA endpoints intercepting lateral movement.', tone: 'acid' as const },
          { title: 'Automated SOAR Execution', desc: 'Playbooks auto-triggered with complete mathematical XAI explainability.', tone: 'violet' as const },
        ].map((a) => (
          <HoloCard key={a.title} glowColor={a.tone} className="p-5">
            <p className="font-mono text-xs font-bold text-cyan-300">{a.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{a.desc}</p>
            <div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-slate-500 uppercase">
              <CheckCircle2 size={12} className="text-[#00ff9d]" />
              <span>POLICY ENGINE ARMED</span>
            </div>
          </HoloCard>
        ))}
      </div>
    </div>
  );
}

export function Analytics() {
  const data = useDefence();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-purple-400 animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-purple-300">
              NATIONAL CYBER TELEMETRY ANALYTICS
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">Telemetry Analytics</h2>
        </div>
        <CyberBadge label="ANALYTICS SYNCED" tone="violet" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <HoloCard glowColor="cyan" className="p-6">
          <p className="font-mono text-xs uppercase text-slate-400">Mean Time to Detect (MTTD)</p>
          <p className="mt-2 font-display text-4xl font-bold text-[#00f5ff]">
            {data.kpis.mttd || 1.8}m
          </p>
          <p className="mt-1 text-xs text-slate-500">Industry benchmark: 207 days</p>
        </HoloCard>
        <HoloCard glowColor="acid" className="p-6">
          <p className="font-mono text-xs uppercase text-slate-400">Mean Time to Remediate (MTTR)</p>
          <p className="mt-2 font-display text-4xl font-bold text-[#00ff9d]">
            {data.kpis.mttr || 4.2}m
          </p>
          <p className="mt-1 text-xs text-slate-500">Autonomous containment window</p>
        </HoloCard>
        <HoloCard glowColor="violet" className="p-6">
          <p className="font-mono text-xs uppercase text-slate-400">Containment Success</p>
          <p className="mt-2 font-display text-4xl font-bold text-purple-300">
            {data.kpis.containment_success || 98.4}%
          </p>
          <p className="mt-1 text-xs text-slate-500">Sovereign sector defense guarantee</p>
        </HoloCard>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { services } = useDefence();

  // --- localStorage-persisted settings ---
  const [autoQuarantine, setAutoQuarantine] = useState(
    () => localStorage.getItem('acdsf_auto_quarantine') === '1'
  );
  const [audioAlarm, setAudioAlarm] = useState(() => isAudioEnabled());
  const [severityFilter, setSeverityFilter] = useState(
    () => localStorage.getItem('acdsf_severity_filter') || 'all'
  );

  // --- Password change state ---
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // --- Status messages ---
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const getToken = () => {
    try {
      const raw = localStorage.getItem('acdsf.token') || sessionStorage.getItem('acdsf.token');
      return raw || '';
    } catch { return ''; }
  };

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001';

  // --- Toggle handlers ---
  const toggleAutoQuarantine = () => {
    const next = !autoQuarantine;
    setAutoQuarantine(next);
    localStorage.setItem('acdsf_auto_quarantine', next ? '1' : '0');
  };
  const toggleAudioAlarm = () => {
    const next = !audioAlarm;
    setAudioAlarm(next);
    setAudioEnabled(next);
    if (next) {
      playAlertSound('warning');
    }
  };
  const handleSeverityChange = (val: string) => {
    setSeverityFilter(val);
    localStorage.setItem('acdsf_severity_filter', val);
  };

  // --- Notification enhancements & test state ---
  const [desktopPerm, setDesktopPerm] = useState(getDesktopNotificationState());
  const [notifBackendStatus, setNotifBackendStatus] = useState<Record<string, unknown> | null>(null);
  const [testEmailTo, setTestEmailTo] = useState(() => localStorage.getItem('acdsf_alert_email') || '');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailMsg, setTestEmailMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [testAllLoading, setTestAllLoading] = useState(false);
  const [testAllMsg, setTestAllMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // SMTP Sender Configuration state
  const [smtpConfig, setSmtpConfig] = useState<{
    smtp_email?: string;
    is_verified?: boolean;
    status_message?: string;
    has_password?: boolean;
  } | null>(null);
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [smtpEmailInput, setSmtpEmailInput] = useState('');
  const [smtpPassInput, setSmtpPassInput] = useState('');
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpMsg, setSmtpMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchNotifStatus = useCallback(async () => {
    try {
      const res = await apiClient.getNotificationStatus();
      if (res.ok && res.data) {
        setNotifBackendStatus(res.data as Record<string, unknown>);
      }
    } catch {
      // ignore
    }
    try {
      const smtpRes = await apiClient.getSmtpConfig();
      if (smtpRes.ok && smtpRes.data) {
        const d = smtpRes.data as {
          smtp_email?: string;
          is_verified?: boolean;
          status_message?: string;
          has_password?: boolean;
        };
        setSmtpConfig(d);
        if (d.smtp_email && !smtpEmailInput) {
          setSmtpEmailInput(d.smtp_email);
        }
      }
    } catch {
      // ignore
    }
  }, [smtpEmailInput]);

  useEffect(() => {
    fetchNotifStatus();
    setDesktopPerm(getDesktopNotificationState());
    setAudioAlarm(isAudioEnabled());

    const handleAudioSync = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>;
      if (custom.detail !== undefined) {
        setAudioAlarm(custom.detail.enabled);
      } else {
        setAudioAlarm(isAudioEnabled());
      }
    };
    window.addEventListener('acdsf-audio-change', handleAudioSync);
    return () => window.removeEventListener('acdsf-audio-change', handleAudioSync);
  }, [fetchNotifStatus]);

  const handleRequestDesktop = async () => {
    const ok = await requestDesktopNotificationPermission();
    setDesktopPerm(getDesktopNotificationState());
    if (ok) {
      testDesktopNotification();
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestEmailLoading(true);
    setTestEmailMsg(null);
    const target = testEmailTo.trim();
    if (target) {
      localStorage.setItem('acdsf_alert_email', target);
    }
    try {
      const res = await apiClient.testEmail(target || undefined);
      const isSent = res.ok && (res.data as { sent?: boolean })?.sent !== false;
      const respData = res.data as { message?: string; recipient?: string; status?: string };
      if (isSent) {
        setTestEmailMsg({
          text: `✓ Alert delivered successfully to ${respData.recipient || target || 'recipient'}!`,
          ok: true,
        });
      } else {
        const errorText = respData.message || respData.status || 'Email delivery failed.';
        setTestEmailMsg({
          text: `⚠️ ${errorText}`,
          ok: false,
        });
      }
    } catch (err: unknown) {
      setTestEmailMsg({
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        ok: false,
      });
    } finally {
      setTestEmailLoading(false);
      setTimeout(() => setTestEmailMsg(null), 10000);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpSaving(true);
    setSmtpMsg(null);
    try {
      const res = await apiClient.updateSmtpConfig(smtpEmailInput.trim(), smtpPassInput.trim());
      if (res.ok && (res.data as { success?: boolean })?.success) {
        setSmtpMsg({
          text: `✓ Google SMTP sender verified & connected for ${smtpEmailInput.trim()}!`,
          ok: true,
        });
        setSmtpPassInput('');
        fetchNotifStatus();
        setTimeout(() => setShowSmtpConfig(false), 2500);
      } else {
        const err = (res.data as { message?: string })?.message || 'SMTP authentication failed';
        setSmtpMsg({
          text: `⚠️ ${err}`,
          ok: false,
        });
      }
    } catch (err: unknown) {
      setSmtpMsg({
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        ok: false,
      });
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleSendTestAll = async () => {
    setTestAllLoading(true);
    setTestAllMsg(null);
    try {
      playCriticalAlarm();
      testDesktopNotification();
      const res = await apiClient.testAllNotifications();
      if (res.ok) {
        setTestAllMsg({
          text: '✓ Full notification matrix triggered: SSE broadcasted, audio sounded, email queued.',
          ok: true,
        });
      } else {
        setTestAllMsg({
          text: `Triggered locally. Server status: ${JSON.stringify(res.data)}`,
          ok: true,
        });
      }
    } catch (err: unknown) {
      setTestAllMsg({
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        ok: false,
      });
    } finally {
      setTestAllLoading(false);
      setTimeout(() => setTestAllMsg(null), 6000);
    }
  };

  // --- Export audit logs ---
  const handleExport = async (format: 'json' | 'csv') => {
    setExportMsg('Generating...');
    try {
      const res = await fetch(`${backendUrl}/api/export-audit?format=${format}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acdsf_audit_log.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportMsg(`Exported as ${format.toUpperCase()} ✓`);
    } catch (e: any) {
      setExportMsg(`Export failed: ${e.message}`);
    }
    setTimeout(() => setExportMsg(null), 3000);
  };

  // --- Reset simulation ---
  const handleReset = async () => {
    if (!window.confirm('⚠️ This will wipe ALL compromised states and restore blocked SDN nodes. Continue?')) return;
    setResetMsg('Resetting...');
    try {
      const res = await fetch(`${backendUrl}/api/reset-simulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResetMsg(`✓ ${data.message} (${data.nodes_restored?.length || 0} nodes restored)`);
    } catch (e: any) {
      setResetMsg(`Reset failed: ${e.message}`);
    }
    setTimeout(() => setResetMsg(null), 5000);
  };

  // --- Change password ---
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) { setPwMsg({ text: 'New passphrases do not match.', ok: false }); return; }
    if (newPw.length < 8) { setPwMsg({ text: 'New passphrase must be at least 8 characters.', ok: false }); return; }
    try {
      const res = await fetch(`${backendUrl}/api/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPwMsg({ text: '✓ Passphrase updated successfully.', ok: true });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      setPwMsg({ text: e.message, ok: false });
    }
  };

  // --- Toggle switch component ---
  const Toggle = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
    <div className="flex items-center justify-between py-3">
      <span className="font-mono text-sm text-slate-200">{label}</span>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
          on ? 'border-emerald-400 bg-emerald-500/30' : 'border-slate-600 bg-slate-800'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out mt-[1px] ${
            on ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-[#00f5ff] animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00f5ff]">
              INTEGRATION FABRIC // ENVIRONMENT CONFIG
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">System Settings</h2>
        </div>
        <CyberBadge label="SYSTEM CONFIG NOMINAL" tone="acid" />
      </div>

      {/* 1. AUTOMATION CONTROLS */}
      <HoloCard glowColor="cyan" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-cyan-400" />
          <h3 className="font-display text-lg font-bold text-white">Automation Controls</h3>
        </div>
        <Toggle on={autoQuarantine} onToggle={toggleAutoQuarantine} label="Automatic SDN Quarantine on Exfiltration" />
        <p className="text-xs text-slate-500 mt-1 font-mono">
          {autoQuarantine
            ? '✓ ACTIVE — Hosts triggering Stage 6 exfiltration will be auto-blocked on the SDN fabric.'
            : '○ MANUAL REVIEW — Exfiltration alerts require operator confirmation before SDN isolation.'}
        </p>
      </HoloCard>

      {/* 2. DATA & AUDIT TOOLS */}
      <HoloCard glowColor="violet" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-violet-400" />
          <h3 className="font-display text-lg font-bold text-white">Data &amp; Audit Tools</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('json')}
            className="rounded-lg border border-violet-500/40 bg-violet-950/40 px-4 py-2 font-mono text-xs font-bold uppercase text-violet-300 hover:bg-violet-900/50 transition-colors"
          >
            Export Audit Logs (JSON)
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="rounded-lg border border-violet-500/40 bg-violet-950/40 px-4 py-2 font-mono text-xs font-bold uppercase text-violet-300 hover:bg-violet-900/50 transition-colors"
          >
            Export Audit Logs (CSV)
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-2 font-mono text-xs font-bold uppercase text-rose-300 hover:bg-rose-900/50 transition-colors"
          >
            Reset Simulation State
          </button>
        </div>
        {exportMsg && <p className="mt-3 font-mono text-xs text-violet-300">{exportMsg}</p>}
        {resetMsg && <p className="mt-3 font-mono text-xs text-rose-300">{resetMsg}</p>}
      </HoloCard>

      {/* 3. NOTIFICATION ENHANCEMENTS & TELEMETRY */}
      <HoloCard glowColor="multi" className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-amber-400 animate-pulse" />
            <div>
              <h3 className="font-display text-lg font-bold text-white">Notification &amp; Alert Subsystem</h3>
              <p className="font-mono text-[10px] text-slate-400">Multi-Channel Incident Dispatch Matrix (SSE, Sound, Email, Web Push)</p>
            </div>
          </div>
          <button
            onClick={fetchNotifStatus}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 font-mono text-xs text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition"
          >
            <RefreshCw size={12} /> Refresh Status
          </button>
        </div>

        {/* Telemetry Channel Health Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 font-mono text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-[10px] uppercase">SSE Stream</span>
              <Radio size={12} className="text-emerald-400" />
            </div>
            <p className="font-bold text-emerald-400">ONLINE</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Real-time Popups</p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 font-mono text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-[10px] uppercase">Audio Siren</span>
              {audioAlarm ? <Volume2 size={12} className="text-emerald-400" /> : <VolumeX size={12} className="text-slate-500" />}
            </div>
            <p className={`font-bold ${audioAlarm ? 'text-emerald-400' : 'text-slate-500'}`}>
              {audioAlarm ? 'ACTIVE' : 'MUTED'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Web Audio Synth</p>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 font-mono text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-[10px] uppercase">Email SMTP</span>
              <Mail size={12} className="text-purple-400" />
            </div>
            <p className="font-bold text-purple-300">
              {(notifBackendStatus?.email as Record<string, string>)?.status || 'CONFIGURED'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">HTML Incidents</p>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 font-mono text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-[10px] uppercase">Desktop Push</span>
              <Smartphone size={12} className="text-rose-400" />
            </div>
            <p className={`font-bold ${desktopPerm === 'granted' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {desktopPerm === 'granted' ? 'ENABLED' : 'NEEDS PERMISSION'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">OS Native Alerts</p>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="space-y-5 divide-y divide-white/10">
          {/* Audio Alarm Config */}
          <div className="pt-2">
            <Toggle on={audioAlarm} onToggle={toggleAudioAlarm} label="Audio Alarm on Cyber Breach" />
            <p className="text-xs text-slate-400 mt-0.5 mb-3 font-mono">
              {audioAlarm
                ? '✓ High-urgency audio siren sounds automatically upon AI attack detection.'
                : '○ Audio alarm is muted.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={playCriticalAlarm}
                className="flex items-center gap-1.5 rounded-lg border border-pink-500/40 bg-pink-950/40 px-3 py-1.5 font-mono text-xs text-pink-300 hover:bg-pink-900/50 transition"
              >
                <Volume2 size={13} /> Test Critical Siren
              </button>
              <button
                onClick={playWarningAlarm}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 font-mono text-xs text-amber-300 hover:bg-amber-900/50 transition"
              >
                <Volume2 size={13} /> Test Warning Tone
              </button>
              <button
                onClick={playContainmentChime}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 font-mono text-xs text-emerald-300 hover:bg-emerald-900/50 transition"
              >
                <Volume2 size={13} /> Test Resolution Chime
              </button>
            </div>
          </div>

          {/* Severity Filter */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-sm font-semibold text-slate-200">Alert Severity Threshold</p>
              <p className="font-mono text-xs text-slate-400 mt-0.5">
                Filter which detection severities trigger popups and audio sirens.
              </p>
            </div>
            <select
              value={severityFilter}
              onChange={(e) => handleSeverityChange(e.target.value)}
              className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3.5 py-2 font-mono text-xs font-bold text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">All Severities (Recommended)</option>
              <option value="critical">Critical Severity Only</option>
              <option value="high">High + Critical Severities</option>
              <option value="none">None (Mute All Popups)</option>
            </select>
          </div>

          {/* Browser Desktop Notifications */}
          <div className="pt-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div>
                <p className="font-mono text-sm font-semibold text-slate-200">Browser Desktop Push Notifications</p>
                <p className="font-mono text-xs text-slate-400 mt-0.5">
                  Receive native operating system desktop alerts even when the browser tab is in background.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {desktopPerm !== 'granted' ? (
                  <button
                    onClick={handleRequestDesktop}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/50 px-3.5 py-1.5 font-mono text-xs font-bold uppercase text-cyan-300 hover:bg-cyan-900/50 transition"
                  >
                    <Smartphone size={13} /> Grant Notification Permission
                  </button>
                ) : (
                  <button
                    onClick={() => testDesktopNotification()}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-950/40 px-3.5 py-1.5 font-mono text-xs font-bold uppercase text-emerald-300 hover:bg-emerald-900/50 transition"
                  >
                    <Bell size={13} /> Test Desktop Alert
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Email Alert Configuration & Live Dispatch */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-semibold text-slate-200">Email Incident Dispatch Matrix (SMTP)</p>
                  <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border ${
                    smtpConfig?.is_verified
                      ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-300'
                      : 'border-amber-500/50 bg-amber-950/50 text-amber-300'
                  }`}>
                    {smtpConfig?.is_verified ? '● SMTP CONNECTED' : '● SENDER AUTH NEEDED'}
                  </span>
                </div>
                <p className="font-mono text-xs text-slate-400 mt-0.5">
                  Sender: <span className="text-cyan-300 font-bold">{smtpConfig?.smtp_email || 'Not configured'}</span>
                  {!smtpConfig?.is_verified && (
                    <span className="text-amber-400 ml-2">⚠️ App Password required for live inbox delivery</span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSmtpConfig(!showSmtpConfig)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition"
              >
                <Settings size={13} /> {showSmtpConfig ? 'Hide SMTP Settings' : 'Configure Sender SMTP'}
              </button>
            </div>

            {/* SMTP Sender Configuration Panel */}
            {showSmtpConfig && (
              <div className="mb-4 rounded-xl border border-purple-500/30 bg-[#0d091a] p-4">
                <p className="font-mono text-xs font-bold uppercase text-purple-300 mb-1">
                  Google Gmail SMTP Sender Credentials
                </p>
                <p className="font-mono text-[11px] text-slate-400 mb-3 leading-relaxed">
                  To send security alerts to any recipient Gmail, Google requires a 16-character App Password on your sender account.
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 underline ml-1 hover:text-cyan-300"
                  >
                    Generate App Password at Google Account &rarr;
                  </a>
                </p>

                <form onSubmit={handleSaveSmtp} className="flex flex-wrap gap-2.5 items-end">
                  <div className="flex-1 min-w-[220px]">
                    <label className="block font-mono text-[10px] text-slate-400 mb-1">Sender Gmail Address</label>
                    <input
                      type="email"
                      required
                      placeholder="your.sender@gmail.com"
                      value={smtpEmailInput}
                      onChange={(e) => setSmtpEmailInput(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex-1 min-w-[220px]">
                    <label className="block font-mono text-[10px] text-slate-400 mb-1">16-Character Google App Password</label>
                    <input
                      type="password"
                      required
                      placeholder="e.g. abcd efgh ijkl mnop"
                      value={smtpPassInput}
                      onChange={(e) => setSmtpPassInput(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={smtpSaving}
                    className="rounded-lg border border-emerald-500/50 bg-emerald-950/60 px-4 py-2 font-mono text-xs font-bold uppercase text-emerald-300 hover:bg-emerald-900/60 transition disabled:opacity-50"
                  >
                    {smtpSaving ? 'Verifying...' : 'Save & Verify'}
                  </button>
                </form>

                {smtpMsg && (
                  <p className={`mt-2.5 font-mono text-xs ${smtpMsg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {smtpMsg.text}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-purple-500/20 text-[10px] font-mono text-slate-400 space-y-1">
                  <p className="font-bold text-slate-300">Quick 30-Second Google Setup:</p>
                  <p>1. Open Google Account &rarr; Security &rarr; enable <strong>2-Step Verification</strong>.</p>
                  <p>2. Go to <strong>myaccount.google.com/apppasswords</strong>.</p>
                  <p>3. Create an app password for &quot;ACDSF&quot; (16 letters).</p>
                  <p>4. Paste it above and click Save. All recipient emails will now receive alerts live!</p>
                </div>
              </div>
            )}

            {/* Recipient Test Dispatch Form */}
            <form onSubmit={handleSendTestEmail} className="flex flex-wrap gap-2.5 max-w-xl">
              <input
                type="email"
                placeholder="Enter any Gmail ID to test incident alert delivery"
                value={testEmailTo}
                onChange={(e) => {
                  setTestEmailTo(e.target.value);
                  if (e.target.value.trim()) {
                    localStorage.setItem('acdsf_alert_email', e.target.value.trim());
                  }
                }}
                className="flex-1 min-w-[260px] rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={testEmailLoading}
                className="flex items-center gap-1.5 rounded-lg border border-purple-500/50 bg-purple-950/50 px-4 py-2 font-mono text-xs font-bold uppercase text-purple-300 hover:bg-purple-900/50 transition disabled:opacity-50"
              >
                <Send size={13} /> {testEmailLoading ? 'Dispatching...' : 'Send Test Alert to Email'}
              </button>
            </form>
            {testEmailMsg && (
              <p className={`mt-2 font-mono text-xs ${testEmailMsg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                {testEmailMsg.text}
              </p>
            )}
          </div>

          {/* Full Pipeline Smoke Test */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-sm font-semibold text-white">Full Subsystem Smoke Test</p>
              <p className="font-mono text-xs text-slate-400 mt-0.5">
                Dispatches a test event across all four channels simultaneously (SSE popup, siren audio, desktop notification, and SMTP email).
              </p>
            </div>
            <button
              onClick={handleSendTestAll}
              disabled={testAllLoading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-5 py-2.5 font-mono text-xs font-bold uppercase text-white shadow-[0_0_15px_rgba(255,0,127,0.4)] transition hover:brightness-110 disabled:opacity-50"
            >
              <Play size={14} /> {testAllLoading ? 'Triggering...' : 'Trigger Full Alert Test'}
            </button>
          </div>
          {testAllMsg && (
            <p className={`pt-2 font-mono text-xs ${testAllMsg.ok ? 'text-cyan-300' : 'text-rose-300'}`}>
              {testAllMsg.text}
            </p>
          )}
        </div>
      </HoloCard>

      {/* 4. OPERATOR ACCOUNT */}
      <HoloCard glowColor="magenta" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={18} className="text-rose-400" />
          <h3 className="font-display text-lg font-bold text-white">Operator Account — Change Passphrase</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-1">Current Passphrase</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 font-mono text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-1">New Passphrase</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 font-mono text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
              placeholder="Min. 8 characters"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-1">Confirm New Passphrase</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 font-mono text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
              placeholder="Re-enter new passphrase"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-6 py-2 font-mono text-xs font-bold uppercase text-rose-300 hover:bg-rose-900/50 transition-colors"
          >
            Update Passphrase
          </button>
          {pwMsg && (
            <p className={`font-mono text-xs ${pwMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
              {pwMsg.text}
            </p>
          )}
        </form>
      </HoloCard>

      {/* 5. INTEGRATION SERVICES MESH (existing) */}
      <HoloCard glowColor="multi" className="p-6">
        <h3 className="font-display text-lg font-bold text-white">
          Sovereign Integration Services Mesh
        </h3>
        <ul className="mt-4 divide-y divide-white/10 font-mono text-xs">
          {Object.entries(services).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between py-3">
              <span className="capitalize text-white font-medium">{k} Service Gateway</span>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                  v
                    ? 'border border-emerald-500/40 bg-emerald-950/40 text-[#00ff9d]'
                    : 'border border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
                }`}
              >
                {v ? 'LIVE CONNECTED' : 'SYNTHETIC EMULATOR'}
              </span>
            </li>
          ))}
        </ul>
      </HoloCard>
    </div>
  );
}
