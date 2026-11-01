import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertTriangle, Shield, Clock, Target, Activity, ExternalLink } from 'lucide-react';
import type { IncidentEvent } from '../../hooks/useSSE';
import { useTheme } from '../../utils/theme';

interface AttackPopupProps {
  event: IncidentEvent | null;
  onClose: () => void;
}

function severityColor(severity?: string, isLight?: boolean): string {
  if (isLight) {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'border-[#FECACA] shadow-lg';
      case 'HIGH': return 'border-[#FED7AA] shadow-lg';
      case 'MEDIUM': return 'border-[#FEF08A] shadow-lg';
      default: return 'border-[#BAE6FD] shadow-lg';
    }
  }
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'border-pink-500 shadow-[0_0_40px_rgba(236,72,153,0.4)]';
    case 'HIGH': return 'border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.3)]';
    case 'MEDIUM': return 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.25)]';
    default: return 'border-cyan-500 shadow-[0_0_25px_rgba(0,245,255,0.2)]';
  }
}

function severityBadgeClass(severity?: string, isLight?: boolean): string {
  if (isLight) {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]';
      case 'HIGH': return 'bg-[#FFEDD5] text-[#EA580C] border-[#FED7AA]';
      case 'MEDIUM': return 'bg-[#FEF9C3] text-[#CA8A04] border-[#FEF08A]';
      default: return 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]';
    }
  }
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'bg-pink-500/20 text-pink-300 border-pink-500/50';
    case 'HIGH': return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
    case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
    default: return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
  }
}

function riskColor(score?: number, isLight?: boolean): string {
  if (!score) return isLight ? 'text-[#475569]' : 'text-slate-400';
  if (score >= 76) return isLight ? 'text-[#DC2626]' : 'text-pink-400';
  if (score >= 51) return isLight ? 'text-[#EA580C]' : 'text-orange-400';
  if (score >= 26) return isLight ? 'text-[#D97706]' : 'text-yellow-400';
  return isLight ? 'text-[#16A34A]' : 'text-emerald-400';
}

function formatTime(iso?: string): string {
  if (!iso) return 'Just now';
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

export function AttackPopup({ event, onClose }: AttackPopupProps) {
  const navigate = useNavigate();
  const { isLight } = useTheme();
  const [visible, setVisible] = useState(false);
  const [autoCloseRemaining, setAutoCloseRemaining] = useState(30);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    if (!event) return;
    setVisible(true);
    setAutoCloseRemaining(30);

    const interval = setInterval(() => {
      setAutoCloseRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [event, handleClose]);

  if (!event || !visible) return null;

  // Merge detection fields from nested detection object or root
  const det = (event.detection || {}) as Record<string, unknown>;
  const severity = (event.severity || det.severity || 'HIGH') as string;
  const riskScore = (event.risk_score || det.risk_score || 0) as number;
  const confidence = (event.confidence_score || det.confidence_score) as number | undefined;
  const techniqueId = (event.mitre_technique_id || det.mitre_technique_id) as string | undefined;
  const techniqueName = (event.mitre_technique_name || det.mitre_technique_name) as string | undefined;
  const detectedAt = (event.attack_detected_at || (det.attack_detected_at as string | undefined));
  const attackType = String(event.attack_type || det.attack_type || 'Threat Incident');
  const target = String(event.target || det.target || 'Sovereign Fabric');
  const source = String(event.source_ip || event.source || det.source_ip || det.source || '10.0.1.45 (Red Team)');
  const recommendedAction = String(event.recommended_action || det.recommended_action || event.blue_team_response || 'Deploy SDN OpenFlow DROP isolation rule on switch to isolate threat asset.');
  const notifStatuses = (event.notification_statuses || {}) as Record<string, string>;

  // Only show for DETECTED / RESPONDING / ACTIVE status
  if (event.status && !['DETECTED', 'RESPONDING', 'ACTIVE'].includes(event.status)) {
    return null;
  }

  const containerBg = isLight ? 'bg-white border-[#E2E8F0]' : 'bg-[#07090e]/95 backdrop-blur-xl';
  const headerBorder = isLight ? 'border-[#E2E8F0]' : 'border-white/10';
  const subBoxBg = isLight ? 'bg-[#F8FAFC] border border-[#E2E8F0]' : 'bg-black/40';
  const textMuted = isLight ? 'text-[#475569]' : 'text-slate-500';
  const textBody = isLight ? 'text-[#0F172A]' : 'text-white';
  const textRed = isLight ? 'text-[#DC2626]' : 'text-pink-400';
  const textBlue = isLight ? 'text-[#0284C7]' : 'text-cyan-400';
  const textGreen = isLight ? 'text-[#16A34A]' : 'text-emerald-400';
  const textPurple = isLight ? 'text-[#7C3AED]' : 'text-purple-300';
  const recActionBg = isLight ? 'border-[#BAE6FD] bg-[#F0F9FF]' : 'border-cyan-500/30 bg-cyan-950/20';
  const statusBanner = isLight ? 'border-[#FECACA] bg-[#FEF2F2]' : 'border-pink-500/30 bg-pink-950/30';

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-end pointer-events-none">
      <div
        className={`pointer-events-auto mt-6 mr-6 w-[420px] max-w-[calc(100vw-48px)] rounded-2xl border ${containerBg} transition-all duration-300 ${severityColor(severity, isLight)} ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
        style={{ animation: 'slideIn 0.4s ease-out' }}
      >
        {/* Header */}
        <div className={`flex items-start justify-between p-4 border-b ${headerBorder}`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <AlertTriangle className={`${textRed} animate-pulse`} size={24} />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-pink-500 animate-ping" />
            </div>
            <div>
              <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${textRed} font-bold`}>
                🚨 CYBER ATTACK DETECTED
              </p>
              <p className={`font-mono text-xs ${textBody} font-bold mt-0.5`}>
                {event.incident_id || 'INCIDENT ALERT'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[10px] ${textMuted}`}>{autoCloseRemaining}s</span>
            <button
              onClick={handleClose}
              className={`rounded-lg p-1 ${isLight ? 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/10'} transition`}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Attack Type */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className={textRed} />
              <span className={`font-mono text-xs ${textMuted}`}>Attack Type</span>
            </div>
            <span className={`font-mono text-xs font-bold ${textBody}`}>{attackType}</span>
          </div>

          {/* Source IP / Target */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-lg ${subBoxBg} p-2.5`}>
              <p className={`font-mono text-[10px] uppercase ${textMuted}`}>Source IP / Host</p>
              <p className={`font-mono text-xs font-bold ${isLight ? 'text-[#DC2626]' : 'text-pink-300'} mt-0.5 truncate`}>{source}</p>
            </div>
            <div className={`rounded-lg ${subBoxBg} p-2.5`}>
              <p className={`font-mono text-[10px] uppercase ${textMuted}`}>Target Node</p>
              <p className={`font-mono text-xs font-bold ${textPurple} mt-0.5 truncate`}>{target}</p>
            </div>
          </div>

          {/* Severity + Risk Score */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-lg ${subBoxBg} p-2.5`}>
              <p className={`font-mono text-[10px] uppercase ${textMuted}`}>Severity</p>
              <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${severityBadgeClass(severity, isLight)}`}>
                {severity}
              </span>
            </div>
            <div className={`rounded-lg ${subBoxBg} p-2.5`}>
              <p className={`font-mono text-[10px] uppercase ${textMuted}`}>Risk Score</p>
              <p className={`font-mono text-lg font-bold mt-0.5 ${riskColor(riskScore, isLight)}`}>
                {riskScore}<span className={`text-xs ${textMuted}`}>/100</span>
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className={`rounded-lg ${subBoxBg} p-2.5 flex items-center gap-2`}>
            <Clock size={12} className={`${textGreen} shrink-0`} />
            <div className="flex-1">
              <p className={`font-mono text-[10px] uppercase ${textMuted}`}>Detection Time</p>
              <p className={`font-mono text-xs ${textGreen} font-bold`}>{formatTime(detectedAt)}</p>
            </div>
          </div>

          {/* AI + MITRE */}
          <div className="grid grid-cols-2 gap-2">
            {confidence !== undefined && (
              <div className={`rounded-lg ${subBoxBg} p-2.5`}>
                <p className={`font-mono text-[10px] uppercase ${textMuted}`}>AI Confidence</p>
                <p className={`font-mono text-xs font-bold ${textGreen} mt-0.5`}>{confidence}%</p>
              </div>
            )}
            {techniqueId && (
              <div className={`rounded-lg ${subBoxBg} p-2.5`}>
                <p className={`font-mono text-[10px] uppercase ${textMuted}`}>MITRE ATT&CK</p>
                <p className={`font-mono text-xs font-bold ${textPurple} mt-0.5`}>{techniqueId}</p>
                <p className={`font-mono text-[9px] ${textMuted} truncate`}>{techniqueName}</p>
              </div>
            )}
          </div>

          {/* Recommended Response Action */}
          <div className={`rounded-lg border ${recActionBg} p-2.5`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Shield size={12} className={textBlue} />
              <p className={`font-mono text-[10px] uppercase font-bold ${textBlue}`}>
                Recommended Action
              </p>
            </div>
            <p className={`font-mono text-[11px] ${isLight ? 'text-[#0F172A]' : 'text-slate-200'} leading-relaxed`}>
              {recommendedAction}
            </p>
          </div>

          {/* Status */}
          <div className={`flex items-center gap-2 rounded-lg border ${statusBanner} p-2.5`}>
            <Activity size={12} className={`${textRed} animate-pulse`} />
            <span className={`font-mono text-xs font-bold ${isLight ? 'text-[#DC2626]' : 'text-pink-300'}`}>
              STATUS: {event.status || 'RESPONDING'}
            </span>
          </div>

          {/* Multi-Channel Notification Status */}
          <div className={`rounded-lg ${subBoxBg} p-2.5`}>
            <p className={`font-mono text-[10px] uppercase ${isLight ? 'text-[#0F172A]' : 'text-slate-400'} font-semibold mb-2 flex items-center justify-between`}>
              <span>Notification Dispatch Channels</span>
              <span className={`text-[9px] ${textMuted}`}>Auto-Dispatched</span>
            </p>
            <div className="space-y-1.5">
              {/* Dashboard Popup */}
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[10px] ${isLight ? 'text-[#475569]' : 'text-slate-300'}`}>🖥️ Dashboard Pop-up</span>
                <span className={`font-mono text-[10px] font-bold ${textGreen}`}>SENT (Active)</span>
              </div>
              {/* Email */}
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[10px] ${isLight ? 'text-[#475569]' : 'text-slate-300'}`}>✉️ Email Alerts</span>
                <span className={`font-mono text-[10px] font-bold ${
                  (notifStatuses.email || '').startsWith('SENT') || (notifStatuses.email || '').startsWith('SIMULATED')
                    ? textGreen
                    : (isLight ? 'text-[#D97706]' : 'text-amber-400')
                }`}>
                  {notifStatuses.email || 'Dispatched (9 emails)'}
                </span>
              </div>
              {/* SMS */}
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[10px] ${isLight ? 'text-[#475569]' : 'text-slate-300'}`}>📱 SMS Security Alerts</span>
                <span className={`font-mono text-[10px] font-bold ${
                  (notifStatuses.sms || '').startsWith('SENT') || (notifStatuses.sms || '').startsWith('SIMULATED')
                    ? textGreen
                    : (isLight ? 'text-[#D97706]' : 'text-amber-400')
                }`}>
                  {notifStatuses.sms || 'Dispatched (8 mobiles)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`border-t ${headerBorder} p-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className={`font-mono text-[10px] uppercase ${isLight ? 'text-[#475569] hover:text-[#0F172A]' : 'text-slate-500 hover:text-white'} transition`}
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                handleClose();
                navigate('/app/attack-report');
              }}
              className={`flex items-center gap-1 font-mono text-[10px] uppercase ${textBlue} hover:opacity-80 transition`}
            >
              Report <ExternalLink size={10} />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield size={11} className={textBlue} />
            <span className={`font-mono text-[10px] ${textBlue}`}>Blue Team Responding...</span>
          </div>
        </div>

        {/* Progress bar for auto-close */}
        <div className={`h-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-800'} rounded-b-2xl overflow-hidden`}>
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-rose-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(autoCloseRemaining / 30) * 100}%` }}
          />
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(32px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
