import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDefenceData } from '../hooks/useDefenceData';
import { useSSE } from '../hooks/useSSE';
import { Sidebar, MobileNav } from './Sidebar';
import { CyberCanvas } from '../components/viz/CyberCanvas';
import { AttackPopup } from '../components/ui/AttackPopup';
import { NotificationCenter } from '../components/ui/NotificationCenter';
import { Shield, Bell } from 'lucide-react';
import type { IncidentEvent } from '../hooks/useSSE';
import { playAlertSound, isAudioEnabled, setAudioEnabled } from '../utils/audioAlarm';
import { sendDesktopNotification, getDesktopNotificationState } from '../utils/notifications';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useTheme } from '../utils/theme';

export function CommandLayout() {
  const { isLight } = useTheme();
  const data = useDefenceData();
  const { lastEvent, events, connected, clearEvents } = useSSE();
  const [popupEvent, setPopupEvent] = useState<IncidentEvent | null>(null);
  const [shownEventIds, setShownEventIds] = useState<Set<string>>(new Set());
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);

  // Handle incoming SSE detection events
  useEffect(() => {
    if (!lastEvent || !lastEvent.incident_id) return;
    const status = lastEvent.status || 'DETECTED';
    const eventKey = `${lastEvent.incident_id}_${status}`;

    if (
      (status === 'DETECTED' || status === 'RESPONDING' || status === 'ACTIVE') &&
      !shownEventIds.has(eventKey)
    ) {
      setShownEventIds(prev => new Set([...prev, eventKey]));
      setPopupEvent(lastEvent);

      // Check severity filter and audio alarm
      const det = (lastEvent.detection || {}) as Record<string, unknown>;
      const severity = ((lastEvent.severity || det.severity || 'HIGH') as string).toLowerCase();
      const filter = localStorage.getItem('acdsf_severity_filter') || 'all';

      const shouldAlert =
        filter === 'all' ||
        (filter === 'critical' && severity === 'critical') ||
        (filter === 'high' && (severity === 'critical' || severity === 'high'));

      if (shouldAlert && isAudioEnabled()) {
        playAlertSound(severity);
      }

      // Trigger desktop notification if permission granted
      if (shouldAlert && getDesktopNotificationState() === 'granted') {
        const attackName = lastEvent.attack_type || (det.attack_type as string) || 'Threat Incident';
        const target = lastEvent.target || (det.target as string) || 'Sovereign Fabric';
        sendDesktopNotification(`🚨 Cyber Attack Detected: ${attackName}`, {
          body: `Target: ${target} | Severity: ${severity.toUpperCase()} | Risk: ${lastEvent.risk_score || det.risk_score || 0}/100`,
          tag: `incident-${lastEvent.incident_id}`,
        });
      }
    }
  }, [lastEvent, shownEventIds]);

  const totalAlerts = (data.alerts?.length || 0) + events.length;

  return (
    <div className={`relative min-h-screen transition-colors duration-200 ${isLight ? 'bg-gradient-to-br from-[#FBCFE8] via-[#FEF3C7] to-[#FCE7F3] text-[#0F172A]' : 'bg-[#07090e] text-slate-100'}`}>
      {/* Dynamic Background Cyber Canvas (Dark only) */}
      {!isLight && <CyberCanvas className="opacity-60" />}
      
      {/* Scanline Overlay (Dark only) */}
      {!isLight && <div className="scanlines pointer-events-none fixed inset-0 z-0 opacity-20" />}

      {/* Sidebar Navigation */}
      <div className="hidden md:block">
        <Sidebar
          alerts={totalAlerts}
          onOpenNotifications={() => setNotifCenterOpen(true)}
        />
      </div>

      {/* Main Command Console Viewport */}
      <div className="relative z-10 flex min-h-screen flex-col md:ml-64 transition-all duration-150">
        <MobileNav
          alerts={totalAlerts}
          onOpenNotifications={() => setNotifCenterOpen(true)}
        />
        
        {/* Critical Alert Banner */}
        {(data.twins.some(n => n.is_compromised === 1 || n.is_compromised === true) || data.alerts.some(a => a.severity === 'critical')) && (
          <div className="bg-magenta/20 border-b border-magenta text-white px-4 py-2 text-center text-sm font-bold font-mono uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse">
            🚨 CRITICAL: COMPROMISED NODE DETECTED ON FABRIC 🚨
          </div>
        )}
        
        {/* Slim Page Title Header */}
        <header className={`hidden md:flex h-16 items-center px-6 border-b-2 transition-colors duration-150 ${
          isLight
            ? 'border-[#F472B6] bg-gradient-to-r from-[#FBCFE8] via-[#FEF3C7] to-[#FCE7F3] shadow-sm'
            : 'border-cyan-500/20 bg-[#050913]/90 backdrop-blur-xl'
        }`}>
          <div className="flex items-center gap-3">
            <Shield size={18} className={isLight ? 'text-[#E11D48]' : 'text-cyan-400'} />
            <span className={`font-mono text-[10px] uppercase tracking-[0.2em] font-bold ${
              isLight ? 'text-[#E11D48]' : 'text-cyan-400'
            }`}>
              Sovereign Domain
            </span>
            <span className={isLight ? 'text-[#FECDD3]' : 'text-slate-600'}>|</span>
            <h1 className={`font-display text-base font-bold tracking-wide ${
              isLight ? 'text-[#0F172A]' : 'text-slate-100'
            }`}>
              National Cyber Defence Fabric
            </h1>
            <span className={`ml-2 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold ${
              isLight
                ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]'
                : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
            }`}>
              AI SOC ACTIVE
            </span>
          </div>

          {/* Audio, Notification, and SSE Indicators */}
          <div className="ml-auto flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Direct Sound System Quick-Toggle & Diagnostic Sound */}
            <button
              onClick={() => {
                const next = !isAudioEnabled();
                setAudioEnabled(next);
                if (next) playAlertSound('warning');
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs transition-all duration-150 ${
                isLight
                  ? isAudioEnabled()
                    ? 'border-[#86EFAC] bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0] shadow-sm'
                    : 'border-[#F472B6] bg-[#FCE7F3] text-[#DC2626] hover:bg-[#FBCFE8]'
                  : isAudioEnabled()
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'border-rose-500/40 bg-rose-950/30 text-rose-400 hover:border-rose-400'
              }`}
              title={isAudioEnabled() ? 'Audio Alarm: ONLINE (Click to mute)' : 'Audio Alarm: MUTED (Click to activate & test sound)'}
            >
              <span className="text-[11px] font-bold">
                {isAudioEnabled() ? '🔊 SOUND ON' : '🔇 MUTED'}
              </span>
            </button>

            {/* Notification Center Trigger */}
            <button
              onClick={() => setNotifCenterOpen(true)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-xs font-bold transition-all duration-150 ${
                isLight
                  ? 'border-[#FDE68A] bg-[#FEF3C7] text-[#78350F] hover:bg-[#FDE047] shadow-sm'
                  : 'border-cyan-500/30 bg-cyan-950/30 text-cyan-300 hover:border-cyan-400 hover:text-white hover:bg-cyan-900/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
              }`}
              title="Open Threat Notification Drawer"
            >
              <Bell size={13} className={isLight ? 'text-[#D97706]' : 'text-cyan-400'} />
              <span>NOTIFICATIONS</span>
              {events.length > 0 && (
                <span className="ml-1 rounded-full bg-pink-500 px-1.5 py-0.2 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(236,72,153,0.8)]">
                  {events.length}
                </span>
              )}
            </button>

            {/* Live SSE Status */}
            <div className={`flex items-center gap-2 border-l pl-3 ${isLight ? 'border-[#FECDD3]' : 'border-slate-800'}`}>
              <div className={`h-2 w-2 rounded-full ${connected ? (isLight ? 'bg-[#16A34A]' : 'bg-emerald-400 animate-ping') : (isLight ? 'bg-[#DC2626]' : 'bg-rose-400')}`} />
              <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${connected ? (isLight ? 'text-[#15803D]' : 'text-emerald-400') : (isLight ? 'text-[#DC2626]' : 'text-rose-400')}`}>
                {connected ? 'LIVE TELEMETRY' : 'RECONNECTING'}
              </span>
            </div>
          </div>
        </header>

        <main className="relative flex-1 p-4 md:p-6 pb-12">
          {/* Subtle Ambient Vignette (Dark only) */}
          {!isLight && (
            <div className="pointer-events-none fixed inset-0 bg-radial-[circle_at_50%_50%] from-transparent via-[#07090e]/40 to-[#07090e]/80" />
          )}
          
          <div className="relative z-10 mx-auto max-w-7xl">
            <Outlet context={{ ...data, sseEvents: events, lastSseEvent: lastEvent }} />
          </div>
        </main>
      </div>

      {/* Global Attack Detection Popup */}
      <AttackPopup
        event={popupEvent}
        onClose={() => setPopupEvent(null)}
      />

      {/* Glassmorphic Notification Drawer */}
      <NotificationCenter
        isOpen={notifCenterOpen}
        onClose={() => setNotifCenterOpen(false)}
        events={events}
        onClearEvents={clearEvents}
        connected={connected}
      />
    </div>
  );
}
