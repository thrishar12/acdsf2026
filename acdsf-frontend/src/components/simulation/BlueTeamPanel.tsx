import React from 'react';
import { ShieldCheck, Lock, Activity, RefreshCw, Zap, CheckCircle2, Shield, Radio, Terminal } from 'lucide-react';
import { HoloCard } from '../ui/HoloCard';
import { CyberBadge } from '../ui/CyberBadge';
import { ActiveDefenseVisual } from '../../hooks/useSimulation';
import { useTheme } from '../../utils/theme';

interface BlueTeamPanelProps {
  blueState: {
    mode: string;
    cumulativeReward: number;
    isolatedNodes: string[];
    patchedNodes: string[];
    detectionRate: number;
    mttd: number;
    mttr: number;
    activePlaybook?: string;
    anomalyScore?: number;
    gnnScore?: number;
    lstmScore?: number;
  };
  activeDefense: ActiveDefenseVisual | null;
  scenario: string;
}

const PLAYBOOK_STEPS_MAP: Record<string, string[]> = {
  APT: [
    'Triage: Correlate IOCs across SIEM telemetry',
    'Contain: SDN Dynamic Flow Rule Isolation',
    'Eradicate: Terminate persistence mechanisms',
    'Recover: Rebuild asset from immutable gold twin',
    'Report: Cryptographic incident log generated',
  ],
  Ransomware: [
    'Triage: Detect bulk file access entropy anomalies',
    'Contain: Emergency network micro-segmentation',
    'Eradicate: Terminate encryption processes via EDR',
    'Recover: Rollback snapshot from clean replica',
    'Report: Ransomware post-mortem audit',
  ],
  DDoS: [
    'Triage: Ingress rate analysis at Edge routers',
    'Mitigate: BGP Flowspec rate-limiting applied',
    'Contain: Blackhole rogue external IP sources',
    'Recover: Normalize backbone bandwidth',
    'Report: DDoS mitigation summary',
  ],
  Insider: [
    'Triage: UEBA credential anomaly correlation',
    'Contain: Revoke Kerberos/OAuth tokens',
    'Investigate: Memory & forensic artifact freeze',
    'Recover: Enforce credential rotation',
    'Report: HR & compliance audit notice',
  ],
};

export const BlueTeamPanel: React.FC<BlueTeamPanelProps> = ({
  blueState,
  activeDefense,
  scenario,
}) => {
  const { isLight } = useTheme();
  const playbookSteps = PLAYBOOK_STEPS_MAP[scenario] || PLAYBOOK_STEPS_MAP.APT;
  const anomalyScore = blueState.anomalyScore ?? 0.72;

  const panelBg = isLight ? 'bg-[#E0F2FE] border-[#BAE6FD]' : 'bg-cyan-950/20 border-cyan-500/30';
  const subPanelBg = isLight ? 'bg-[#F0F9FF] border-[#BAE6FD]' : 'bg-black/40 border-cyan-500/10';
  const metricBg = isLight ? 'bg-white border-[#E2E8F0]' : 'bg-black/40 border-white/5';
  const labelText = isLight ? 'text-[#475569]' : 'text-slate-500';
  const headingText = isLight ? 'text-[#0F172A]' : 'text-white';
  const accentText = isLight ? 'text-[#0284C7]' : 'text-cyan-400';
  const modeText = isLight ? 'text-[#475569]' : 'text-slate-400';
  const trackBg = isLight ? 'bg-[#E2E8F0]' : 'bg-slate-900';
  const trackBorder = isLight ? 'border-[#E2E8F0]' : 'border-white/10';
  const sdnBadgeBg = isLight ? 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  const soarStepBg = isLight ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-black/30 border-emerald-500/10';
  const soarStepText = isLight ? 'text-[#0F172A]' : 'text-slate-300';
  const stepNumBg = isLight ? 'bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]' : 'bg-emerald-950 text-emerald-300 border-emerald-500/30';
  const isolateBg = isLight ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]' : 'border-amber-500/40 bg-amber-950/30 text-amber-300';
  const anomalyHighBar = isLight
    ? 'bg-gradient-to-r from-[#0284C7] to-[#DC2626]'
    : 'bg-gradient-to-r from-cyan-400 to-pink-500 shadow-[0_0_10px_#ff0055]';
  const anomalyNormBar = isLight
    ? 'bg-gradient-to-r from-[#0284C7] to-[#16A34A]'
    : 'bg-gradient-to-r from-cyan-500 to-emerald-400';
  const anomalyValueText = anomalyScore > 0.6
    ? (isLight ? 'text-[#DC2626]' : 'text-pink-400')
    : (isLight ? 'text-[#0284C7]' : 'text-cyan-300');
  const gnnText = isLight ? 'text-[#0284C7]' : 'text-cyan-300';
  const lstmText = isLight ? 'text-[#7C3AED]' : 'text-purple-300';
  const headerBorder = isLight ? 'border-[#BAE6FD]' : 'border-cyan-500/20';
  const headerTopBorder = isLight ? 'border-[#BAE6FD]' : 'border-cyan-500/20';
  const soarBorder = isLight ? 'border-[#E2E8F0]' : 'border-white/10';

  return (
    <div className="flex flex-col gap-4">
      {/* Header Card */}
      <HoloCard glowColor="cyan" className="p-4 border-cyan-500/30">
        <div className={`flex items-center justify-between border-b ${headerTopBorder} pb-3`}>
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isLight ? 'bg-[#E0F2FE] border-[#BAE6FD] text-[#0284C7]' : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.4)]'} border`}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className={`font-display text-sm font-bold tracking-wider ${headingText}`}>
                BLUE TEAM AI // SOVEREIGN GUARD
              </h3>
              <p className={`font-mono text-[10px] ${accentText}`}>
                SDN CONTROLLER • SOAR • GNN/LSTM DETECTOR
              </p>
            </div>
          </div>
          <CyberBadge label="DEFENSIVE" tone="cyan" />
        </div>

        {/* Quick Defensive Metrics */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono text-xs">
          <div className={`rounded-lg ${metricBg} p-2 border`}>
            <span className={`text-[10px] ${labelText} block uppercase`}>Reward</span>
            <span className={`text-base font-bold ${blueState.cumulativeReward >= 0 ? accentText : (isLight ? 'text-[#D97706]' : 'text-amber-500')}`}>
              {blueState.cumulativeReward > 0 ? `+${blueState.cumulativeReward.toFixed(1)}` : blueState.cumulativeReward.toFixed(1)}
            </span>
          </div>
          <div className={`rounded-lg ${metricBg} p-2 border`}>
            <span className={`text-[10px] ${labelText} block uppercase`}>Detection Rate</span>
            <span className={`text-base font-bold ${isLight ? 'text-[#16A34A]' : 'text-emerald-400'}`}>
              {blueState.detectionRate > 0 ? `${blueState.detectionRate.toFixed(1)}%` : '92.4%'}
            </span>
          </div>
          <div className={`rounded-lg ${metricBg} p-2 border`}>
            <span className={`text-[10px] ${labelText} block uppercase`}>MTTD / MTTR</span>
            <span className={`text-base font-bold ${accentText}`}>
              {blueState.mttd > 0 ? `${blueState.mttd.toFixed(1)}s` : '1.8s'}
            </span>
          </div>
        </div>
      </HoloCard>

      {/* Active Defense Action */}
      <HoloCard glowColor="cyan" className="p-4 border-cyan-500/20">
        <div className={`flex items-center justify-between text-xs font-mono mb-2`}>
          <span className={`flex items-center gap-1.5 ${accentText} font-bold`}>
            <Shield size={14} className="animate-pulse" /> CURRENT COUNTERMEASURE
          </span>
          <span className={`text-[10px] ${modeText} uppercase`}>MODE: {blueState.mode}</span>
        </div>

        {activeDefense ? (
          <div className={`space-y-2 rounded-xl ${panelBg} border p-3`}>
            <div className="flex items-center justify-between">
              <span className={`font-mono text-xs font-bold ${headingText}`}>
                {activeDefense.action}
              </span>
              <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] border ${sdnBadgeBg}`}>
                SDN ENFORCED
              </span>
            </div>
            <div className={`flex items-center justify-between text-[11px] font-mono ${modeText}`}>
              <span>Target Host: {activeDefense.target}</span>
              <span className={`${isLight ? 'text-[#16A34A]' : 'text-emerald-400'} font-bold`}>
                {activeDefense.success ? '✓ SUCCESSFUL RESPONSE' : '✗ ACTION RETRIED'}
              </span>
            </div>
          </div>
        ) : (
          <div className={`py-4 text-center font-mono text-xs ${labelText} italic`}>
            Monitoring telemetry feeds & network flows...
          </div>
        )}
      </HoloCard>

      {/* Anomaly Detection Pipeline Gauges */}
      <HoloCard glowColor="cyan" className="p-4 border-cyan-500/20">
        <div className={`flex items-center justify-between border-b ${headerBorder} pb-2 mb-3 font-mono text-xs`}>
          <span className={`${headingText} font-bold flex items-center gap-1.5`}>
            <Activity size={14} className={accentText} /> MULTI-MODEL ANOMALY DETECTOR
          </span>
          <span className={`${accentText} text-[10px]`}>THRESHOLD: 0.60</span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {/* Combined Score Bar */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className={labelText}>Hybrid Fusion Anomaly Score</span>
              <span className={`font-bold ${anomalyValueText}`}>
                {(anomalyScore * 100).toFixed(0)}% {anomalyScore > 0.6 ? '(ANOMALY)' : '(NORMAL)'}
              </span>
            </div>
            <div className={`h-2 w-full rounded-full ${trackBg} overflow-hidden border ${trackBorder}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${anomalyScore > 0.6 ? anomalyHighBar : anomalyNormBar}`}
                style={{ width: `${Math.min(100, Math.max(10, anomalyScore * 100))}%` }}
              />
            </div>
          </div>

          {/* Sub-models */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className={`rounded-lg ${metricBg} p-2 border`}>
              <span className={`${labelText} block`}>GNN Structural Model</span>
              <span className={`${gnnText} font-bold`}>0.824 (High Centrality)</span>
            </div>
            <div className={`rounded-lg ${metricBg} p-2 border`}>
              <span className={`${labelText} block`}>LSTM Temporal Sequence</span>
              <span className={`${lstmText} font-bold`}>0.761 (Burst Entropy)</span>
            </div>
          </div>
        </div>
      </HoloCard>

      {/* Automated SOAR Playbook Execution */}
      <HoloCard glowColor="multi" className="p-4">
        <div className={`flex items-center justify-between border-b ${soarBorder} pb-2 mb-3`}>
          <span className={`font-mono text-xs font-bold ${headingText} flex items-center gap-1.5`}>
            <Terminal size={14} className={isLight ? 'text-[#16A34A]' : 'text-emerald-400'} /> SOAR INCIDENT RESPONSE PLAYBOOK
          </span>
          <span className={`font-mono text-[10px] ${isLight ? 'text-[#16A34A]' : 'text-emerald-400'} font-bold`}>
            {scenario} PROTOCOL
          </span>
        </div>

        <div className="space-y-2">
          {playbookSteps.map((step, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 rounded-lg ${soarStepBg} p-2 border font-mono text-xs`}
            >
              <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${stepNumBg} text-[10px] font-bold border`}>
                {idx + 1}
              </div>
              <span className={`text-[11px] ${soarStepText}`}>{step}</span>
            </div>
          ))}
        </div>
      </HoloCard>

      {/* SDN Isolated Hosts List */}
      <HoloCard glowColor="cyan" className="p-4 border-cyan-500/20">
        <div className="flex items-center justify-between mb-2">
          <h4 className={`font-mono text-xs font-bold ${isLight ? 'text-[#475569]' : 'text-slate-300'} uppercase flex items-center gap-1.5`}>
            <Lock size={13} className={isLight ? 'text-[#D97706]' : 'text-amber-400'} /> SDN Isolated Enclaves
          </h4>
          <span className={`font-mono text-[10px] ${isLight ? 'text-[#D97706]' : 'text-amber-300'}`}>
            {blueState.isolatedNodes.length} Isolated
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {blueState.isolatedNodes.length > 0 ? (
            blueState.isolatedNodes.map((node) => (
              <span
                key={node}
                className={`rounded-md border ${isolateBg} px-2 py-1 font-mono text-[10px] flex items-center gap-1`}
              >
                <Lock size={10} /> {node}
              </span>
            ))
          ) : (
            <span className={`text-[11px] font-mono ${labelText}`}>No active SDN quarantine</span>
          )}
        </div>
      </HoloCard>
    </div>
  );
};
