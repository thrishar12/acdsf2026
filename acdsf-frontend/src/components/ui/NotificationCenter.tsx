import { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Volume2,
  VolumeX,
  Radio,
  Mail,
  Smartphone,
  ShieldAlert,
  CheckCircle2,
  Play,
  Trash2,
  ExternalLink,
  Save,
  Send,
  Zap,
  MessageSquare,
  ListFilter,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { IncidentEvent } from '../../hooks/useSSE';
import {
  isAudioEnabled,
  setAudioEnabled,
  playContainmentChime,
  playAcousticPing,
  playCriticalAlarm,
  unlockAudio,
} from '../../utils/audioAlarm';
import {
  getDesktopNotificationState,
  requestDesktopNotificationPermission,
  testDesktopNotification,
} from '../../utils/notifications';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  events: IncidentEvent[];
  onClearEvents: () => void;
  connected: boolean;
}

export function NotificationCenter({
  isOpen,
  onClose,
  events,
  onClearEvents,
  connected,
}: NotificationCenterProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'controls' | 'audit_logs'>('controls');
  const [audioOn, setAudioOn] = useState(true);
  const [desktopPerm, setDesktopPerm] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<Record<string, unknown> | null>(null);

  // User Alert Gmail state
  const [alertEmail, setAlertEmail] = useState<string>(() => {
    return localStorage.getItem('acdsf_alert_email') || user?.email || 'myacdsfproject@gmail.com';
  });
  const [emailSavedNotice, setEmailSavedNotice] = useState<string | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [sendingTestSms, setSendingTestSms] = useState(false);

  // Transmission audit logs
  const [auditLogs, setAuditLogs] = useState<{ email_logs: any[]; sms_logs: any[] }>({
    email_logs: [],
    sms_logs: [],
  });
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = () => {
    setLoadingLogs(true);
    apiClient.getNotificationLogs().then((res) => {
      if (res.ok && res.data) {
        setAuditLogs(res.data as { email_logs: any[]; sms_logs: any[] });
      }
      setLoadingLogs(false);
    });
  };

  useEffect(() => {
    setAudioOn(isAudioEnabled());
    setDesktopPerm(getDesktopNotificationState());
    const stored = localStorage.getItem('acdsf_alert_email');
    if (stored) {
      setAlertEmail(stored);
    } else if (user?.email) {
      setAlertEmail(user.email);
    }
  }, [isOpen, user?.email]);

  useEffect(() => {
    if (isOpen) {
      apiClient.getNotificationStatus().then((res) => {
        if (res.ok && res.data) {
          setBackendStatus(res.data as Record<string, unknown>);
        }
      });
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAudio = () => {
    unlockAudio();
    const next = !audioOn;
    setAudioOn(next);
    setAudioEnabled(next);
    if (next) {
      playAcousticPing();
    }
  };

  const handleTestSiren = () => {
    unlockAudio();
    playCriticalAlarm();
  };

  const handleTestPing = () => {
    unlockAudio();
    playAcousticPing();
  };

  const handleRequestDesktop = async () => {
    const ok = await requestDesktopNotificationPermission();
    setDesktopPerm(getDesktopNotificationState());
    if (ok) {
      testDesktopNotification();
    }
  };

  const handleSaveAlertEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = alertEmail.trim();
    if (!clean) return;
    localStorage.setItem('acdsf_alert_email', clean);
    setEmailSavedNotice(`✓ Alert Gmail set to ${clean}`);
    setTimeout(() => setEmailSavedNotice(null), 3500);
  };

  const handleSendTestToGmail = async () => {
    setSendingTestEmail(true);
    setTestResult(null);
    unlockAudio();
    playAcousticPing();
    const cleanEmail = alertEmail.trim();
    if (cleanEmail) {
      localStorage.setItem('acdsf_alert_email', cleanEmail);
    }
    try {
      const res = await apiClient.testEmail(cleanEmail || undefined);
      const isSent = res.ok && (res.data as { sent?: boolean })?.sent !== false;
      const respData = res.data as { message?: string; recipient?: string; status?: string };
      if (isSent) {
        setTestResult(`✓ Attack alert email delivered to ${respData.recipient || cleanEmail}!`);
        fetchLogs();
      } else {
        const errorText = respData.message || respData.status || 'Email delivery failed.';
        setTestResult(`⚠️ ${errorText}`);
      }
    } catch (e: unknown) {
      setTestResult(`Email test error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSendingTestEmail(false);
      setTimeout(() => setTestResult(null), 10000);
    }
  };

  const handleSendTestSms = async () => {
    setSendingTestSms(true);
    setTestResult(null);
    unlockAudio();
    playAcousticPing();
    try {
      const res = await apiClient.testSms();
      if (res.ok) {
        const d = res.data as { message?: string };
        setTestResult(`✓ SMS security alert dispatched: ${d.message || 'Queued'}`);
        fetchLogs();
      } else {
        setTestResult(`⚠️ SMS test status: ${JSON.stringify(res.data)}`);
      }
    } catch (e: unknown) {
      setTestResult(`SMS test error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSendingTestSms(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  const handleDispatchFullMatrix = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      unlockAudio();
      playCriticalAlarm();
      testDesktopNotification();
      const res = await apiClient.testAllNotifications();
      if (res.ok) {
        setTestResult('✓ Full telemetry alert matrix dispatched: Audio sounded, SSE popup pushed, Email & SMS sent to all recipients.');
        fetchLogs();
      } else {
        setTestResult('⚠️ Local alerts sounded; backend test status: ' + JSON.stringify(res.data));
      }
    } catch (e: unknown) {
      setTestResult('Test error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  const emailInfo = (backendStatus?.email as Record<string, unknown>) || {};
  const smsInfo = (backendStatus?.sms as Record<string, unknown>) || {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <aside
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-cyan-500/30 bg-[#040813]/98 shadow-[-15px_0_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-all"
        style={{ animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-transparent to-pink-950/30 p-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-950/60 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Bell className="text-cyan-300" size={18} />
              {connected && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
            <div>
              <h3 className="font-display text-base font-bold tracking-wide text-white">
                Threat Alert &amp; Dispatch Matrix
              </h3>
              <p className="font-mono text-[9px] uppercase tracking-widest text-cyan-400/80 font-semibold">
                Autonomous Incident Notification Center
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            title="Close Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 bg-black/40 px-4 pt-2">
          <button
            onClick={() => setActiveTab('controls')}
            className={`flex-1 pb-2.5 font-mono text-xs font-bold transition border-b-2 ${
              activeTab === 'controls'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Alert Controls &amp; Channels
          </button>
          <button
            onClick={() => {
              setActiveTab('audit_logs');
              fetchLogs();
            }}
            className={`flex-1 pb-2.5 font-mono text-xs font-bold transition border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'audit_logs'
                ? 'border-pink-500 text-pink-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Transmission Logs</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[9px] text-slate-300">
              {auditLogs.email_logs.length + auditLogs.sms_logs.length}
            </span>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'controls' ? (
            <>
              {/* 1. ACOUSTIC SOUND SYSTEM CONTROL */}
              <div className="rounded-xl border border-cyan-500/30 bg-[#070e1c]/80 p-3.5 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${audioOn ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300' : 'border-rose-500/40 bg-rose-950/40 text-rose-400'}`}>
                      {audioOn ? <Volume2 size={16} className="animate-pulse" /> : <VolumeX size={16} />}
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-white uppercase tracking-wider">Acoustic Audio Alarm</p>
                      <p className="font-mono text-[10px] text-slate-400">Tactical sound synthesize &amp; frequency chime</p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleAudio}
                    className={`font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded-md border transition ${
                      audioOn
                        ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {audioOn ? 'ENABLED' : 'MUTED'}
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleTestSiren}
                    className="flex-1 rounded-lg border border-pink-500/30 bg-pink-950/30 py-1.5 font-mono text-[10px] font-bold text-pink-300 hover:bg-pink-900/40 transition"
                  >
                    Play Critical Alarm
                  </button>
                  <button
                    onClick={handleTestPing}
                    className="flex-1 rounded-lg border border-cyan-500/30 bg-cyan-950/30 py-1.5 font-mono text-[10px] font-bold text-cyan-300 hover:bg-cyan-900/40 transition"
                  >
                    Play Tactical Ping
                  </button>
                </div>
              </div>

              {/* 2. MULTI-RECIPIENT EMAIL DISPATCH CONTROL */}
              <div className="rounded-xl border border-purple-500/30 bg-[#10071c]/80 p-3.5 shadow-[0_0_20px_rgba(168,85,247,0.08)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 text-purple-300">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                        Email Alert Matrix
                      </p>
                      <p className="font-mono text-[10px] text-purple-300/80">
                        {String(emailInfo.registered_recipients_count || 9)} Deduplicated Recipients Registered
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border ${
                    emailInfo.status === 'CONFIGURED'
                      ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-300'
                      : 'border-amber-500/50 bg-amber-950/50 text-amber-300'
                  }`}>
                    {String(emailInfo.status || 'SIMULATED_MODE')}
                  </span>
                </div>

                <form onSubmit={handleSaveAlertEmail} className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={alertEmail}
                      onChange={(e) => {
                        setAlertEmail(e.target.value);
                        if (e.target.value.trim()) {
                          localStorage.setItem('acdsf_alert_email', e.target.value.trim());
                        }
                      }}
                      placeholder="your.email@gmail.com"
                      className="flex-1 rounded-lg border border-purple-500/30 bg-black/50 px-3 py-1.5 font-mono text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-lg border border-purple-500/50 bg-purple-900/50 px-3 py-1.5 font-mono text-xs font-bold text-purple-200 hover:bg-purple-800/60 transition"
                      title="Save Alert Gmail"
                    >
                      <Save size={12} /> Save
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleSendTestToGmail}
                      disabled={sendingTestEmail}
                      className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-1.5 font-mono text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/50 transition disabled:opacity-50"
                    >
                      <Send size={11} /> {sendingTestEmail ? 'Dispatching...' : 'Dispatch Test Alert to Emails'}
                    </button>
                    <span className="font-mono text-[9px] text-slate-400">
                      9 Emails Auto-Dispatched
                    </span>
                  </div>
                </form>

                {emailSavedNotice && (
                  <p className="mt-2 font-mono text-[10px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded p-1.5">
                    {emailSavedNotice}
                  </p>
                )}
              </div>

              {/* 3. SMS SECURITY ALERT MATRIX */}
              <div className="rounded-xl border border-amber-500/30 bg-[#160d05]/80 p-3.5 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 text-amber-300">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                        SMS Security Alerts (+91)
                      </p>
                      <p className="font-mono text-[10px] text-amber-300/80">
                        {String(smsInfo.registered_numbers_count || 8)} Indian Mobile Numbers Registered
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border ${
                    String(smsInfo.status || '').startsWith('CONFIGURED')
                      ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-300'
                      : 'border-amber-500/50 bg-amber-950/50 text-amber-300'
                  }`}>
                    {String(smsInfo.status || 'SIMULATED_MODE')}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleSendTestSms}
                    disabled={sendingTestSms}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 font-mono text-[11px] font-bold text-amber-300 hover:bg-amber-900/50 transition disabled:opacity-50"
                  >
                    <Send size={11} /> {sendingTestSms ? 'Dispatching...' : 'Dispatch Test Alert to SMS (+91)'}
                  </button>
                  <span className="font-mono text-[9px] text-slate-400">
                    Fast2SMS / Twilio
                  </span>
                </div>
              </div>

              {/* 4. MULTI-CHANNEL TELEMETRY HUD & ACTION */}
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-2">
                  Telemetry Dispatch Matrix
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  {/* SSE */}
                  <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-2">
                    <div className="flex items-center gap-1.5">
                      <Radio size={12} className={connected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'} />
                      <span className="text-[10px] text-slate-300">Live SSE Feed</span>
                    </div>
                    <span className={`text-[9px] font-bold ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {connected ? 'CONNECTED' : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Desktop Notification */}
                  <button
                    onClick={desktopPerm === 'granted' ? () => testDesktopNotification() : handleRequestDesktop}
                    className={`flex items-center justify-between rounded-lg border p-2 transition ${
                      desktopPerm === 'granted'
                        ? 'border-cyan-500/30 bg-cyan-950/20 text-cyan-300'
                        : 'border-amber-500/30 bg-amber-950/20 text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Smartphone size={12} className={desktopPerm === 'granted' ? 'text-cyan-400' : 'text-amber-400'} />
                      <span className="text-[10px]">Desktop Push</span>
                    </div>
                    <span className="text-[9px] font-bold">{desktopPerm === 'granted' ? 'ACTIVE' : 'ENABLE'}</span>
                  </button>
                </div>

                {/* Test All Action Button */}
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={handleDispatchFullMatrix}
                    disabled={testing}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-pink-500/40 bg-pink-950/40 py-2 font-mono text-xs font-bold uppercase text-pink-300 hover:bg-pink-900/50 hover:border-pink-400 transition shadow-[0_0_15px_rgba(236,72,153,0.2)] disabled:opacity-50"
                  >
                    <Play size={12} /> {testing ? 'Testing Matrix...' : 'Dispatch All Channels Test'}
                  </button>
                  {events.length > 0 && (
                    <button
                      onClick={() => {
                        onClearEvents();
                        playContainmentChime();
                      }}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 font-mono text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Clear Threat Feed"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                </div>

                {testResult && (
                  <p className="mt-2.5 font-mono text-[11px] text-cyan-300 bg-cyan-950/50 border border-cyan-500/40 rounded p-2">
                    {testResult}
                  </p>
                )}
              </div>

              {/* 5. REAL-TIME THREAT INCIDENT FEED */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Live Threat Detection Feed ({events.length})
                  </p>
                </div>

                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-white/5 bg-black/20 p-4">
                    <CheckCircle2 size={32} className="text-emerald-500/60 mb-2" />
                    <p className="font-mono text-xs font-bold text-slate-300">All Security Channels Nominal</p>
                    <p className="font-mono text-[10px] text-slate-500 mt-1 max-w-[280px]">
                      No active threat vectors currently detected. Launch a simulation or click test alert to view live telemetry.
                    </p>
                  </div>
                ) : (
                  events.map((ev, i) => {
                    const det = (ev.detection || {}) as Record<string, unknown>;
                    const sev = (ev.severity || det.severity || 'HIGH') as string;
                    const attackType = ev.attack_type || (det.attack_type as string) || 'Threat Incident';
                    const target = ev.target || (det.target as string) || 'Core Fabric';
                    const time = ev.attack_detected_at ? new Date(ev.attack_detected_at).toLocaleTimeString() : 'Just now';

                    return (
                      <div
                        key={`${ev.incident_id || i}_${i}`}
                        className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-black/60 to-[#070f1e]/60 p-3.5 space-y-2 hover:border-cyan-500/50 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert size={15} className="text-pink-400 shrink-0 animate-pulse" />
                            <span className="font-mono text-xs font-bold text-white">{attackType}</span>
                          </div>
                          <span
                            className={`font-mono text-[9px] font-bold uppercase rounded px-2 py-0.5 border ${
                              sev === 'CRITICAL'
                                ? 'border-pink-500/60 bg-pink-950/50 text-pink-300 shadow-[0_0_8px_rgba(236,72,153,0.4)]'
                                : 'border-amber-500/60 bg-amber-950/50 text-amber-300'
                            }`}
                          >
                            {sev}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1 font-mono text-[10px] text-slate-400">
                          <div>
                            <span className="text-slate-500">Target Node: </span>
                            <span className="text-purple-300 font-bold">{target}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500">Detected: </span>
                            <span className="text-slate-300">{time}</span>
                          </div>
                        </div>

                        {ev.incident_id && (
                          <div className="flex items-center justify-between border-t border-white/5 pt-2">
                            <span className="font-mono text-[9px] text-cyan-400 font-bold">{ev.incident_id}</span>
                            <button
                              onClick={() => {
                                onClose();
                                navigate('/app/attack-report');
                              }}
                              className="flex items-center gap-1 font-mono text-[9px] uppercase font-bold text-cyan-300 hover:text-white transition"
                            >
                              View Full Attack Report <ExternalLink size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* AUDIT LOGS TAB */
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase font-bold text-slate-300">
                  Dispatcher Transmission Audit Log
                </p>
                <button
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition"
                >
                  <RefreshCw size={11} className={loadingLogs ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              {/* SMS Audit Log */}
              <div className="rounded-xl border border-amber-500/20 bg-black/40 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                    <MessageSquare size={13} />
                    <span>SMS Transmission Records ({auditLogs.sms_logs.length})</span>
                  </div>
                </div>

                {auditLogs.sms_logs.length === 0 ? (
                  <p className="text-[10px] text-slate-500 py-3 text-center">No SMS logs recorded yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {auditLogs.sms_logs.slice(0, 15).map((log, i) => (
                      <div key={log.id || i} className="flex items-center justify-between rounded bg-white/5 p-1.5 text-[10px]">
                        <div>
                          <p className="text-white font-bold">{log.recipient}</p>
                          <p className="text-[9px] text-slate-400 truncate max-w-[240px]">
                            {log.error || log.message}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            log.status === 'SENT' || log.status === 'DELIVERED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                              : log.status === 'SIMULATED'
                              ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                              : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                          }`}>
                            {log.status}
                          </span>
                          <p className="text-[8px] text-slate-500 mt-0.5">
                            {log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Email Audit Log */}
              <div className="rounded-xl border border-purple-500/20 bg-black/40 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                    <Mail size={13} />
                    <span>Email Transmission Records ({auditLogs.email_logs.length})</span>
                  </div>
                </div>

                {auditLogs.email_logs.length === 0 ? (
                  <p className="text-[10px] text-slate-500 py-3 text-center">No email logs recorded yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {auditLogs.email_logs.slice(0, 15).map((log, i) => (
                      <div key={log.id || i} className="flex items-center justify-between rounded bg-white/5 p-1.5 text-[10px]">
                        <div>
                          <p className="text-white font-bold truncate max-w-[220px]">{log.recipient}</p>
                          <p className="text-[9px] text-slate-400 truncate max-w-[240px]">{log.subject}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            log.status === 'SENT'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                              : log.status === 'SIMULATED'
                              ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                              : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                          }`}>
                            {log.status}
                          </span>
                          <p className="text-[8px] text-slate-500 mt-0.5">
                            {log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
