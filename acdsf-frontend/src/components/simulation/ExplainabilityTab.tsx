import React from 'react';
import { Sparkles, Brain, Cpu, BarChart2, Shield, Activity, Target } from 'lucide-react';
import { HoloCard } from '../ui/HoloCard';
import { useTheme } from '../../utils/theme';

interface ExplainabilityTabProps {
  scenario: string;
  anomalyScore: number;
  techniquesUsed: string[];
}

const SHAP_FEATURES = [
  { name: 'Graph Degree Centrality Deviation', weight: 0.34, impact: 'High Risk' },
  { name: 'Flow Ingress Packet Burst Rate', weight: 0.28, impact: 'High Risk' },
  { name: 'Payload Shannon Entropy Spike', weight: 0.19, impact: 'Medium Risk' },
  { name: 'Non-Standard Destination Port (SSH/RDP Pivot)', weight: 0.12, impact: 'Medium Risk' },
  { name: 'TCP Flag Anomaly (SYN-FIN Scan)', weight: 0.07, impact: 'Low Risk' },
];

const MITRE_TACTIC_COLUMNS = [
  { tactic: 'Reconnaissance', id: 'TA0043', techniques: ['T1595', 'T1592', 'T1590'] },
  { tactic: 'Initial Access', id: 'TA0001', techniques: ['T1566', 'T1190', 'T1133', 'T1078'] },
  { tactic: 'Execution', id: 'TA0002', techniques: ['T1059', 'T1547', 'T1053'] },
  { tactic: 'Priv Escalation', id: 'TA0004', techniques: ['T1068', 'T1548', 'T1134'] },
  { tactic: 'Lateral Move', id: 'TA0008', techniques: ['T1021', 'T1570', 'T1080'] },
  { tactic: 'Exfiltration', id: 'TA0010', techniques: ['T1041', 'T1567', 'T1048', 'T1486'] },
];

export const ExplainabilityTab: React.FC<ExplainabilityTabProps> = ({
  scenario,
  anomalyScore,
  techniquesUsed,
}) => {
  const { isLight } = useTheme();

  const headingText = isLight ? 'text-[#0F172A]' : 'text-white';
  const muted = isLight ? 'text-[#475569]' : 'text-slate-400';
  const labelText = isLight ? 'text-[#475569]' : 'text-slate-300';
  const cyanAccent = isLight ? 'text-[#0284C7]' : 'text-cyan-400';
  const purpleAccent = isLight ? 'text-[#7C3AED]' : 'text-purple-400';
  const pinkAccent = isLight ? 'text-[#DC2626]' : 'text-pink-400';
  const trackBg = isLight ? 'bg-[#E2E8F0]' : 'bg-slate-900';
  const trackBorder = isLight ? 'border-[#E2E8F0]' : 'border-white/5';
  const subPanelBg = isLight ? 'bg-[#F8FAFC] border-[#E2E8F0]' : 'bg-black/40';
  const headerBorder = isLight ? 'border-[#E2E8F0]' : 'border-white/10';
  const redPanelBg = isLight ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-black/40 border-pink-500/20';
  const bluePanelBg = isLight ? 'bg-[#F0F9FF] border-[#BAE6FD]' : 'bg-black/40 border-cyan-500/20';
  const mitreColBg = isLight ? 'bg-[#F8FAFC] border-[#E2E8F0]' : 'bg-black/40 border-white/10';
  const mitreBorder = isLight ? 'border-[#E2E8F0]' : 'border-white/10';
  const firedTech = isLight
    ? 'bg-[#DC2626] text-white border border-[#B91C1C]'
    : 'bg-pink-600 text-white shadow-[0_0_10px_rgba(255,0,127,0.5)] border border-pink-400';
  const unfiredTech = isLight
    ? 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]'
    : 'bg-black/40 text-slate-500 border border-white/5';
  const purpleIconBg = isLight
    ? 'bg-[#F3E8FF] border-[#DDD6FE] text-[#7C3AED]'
    : 'bg-purple-950/60 border-purple-500/40 text-purple-300';

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <HoloCard glowColor="multi" className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${purpleIconBg}`}>
            <Brain size={20} />
          </div>
          <div>
            <h3 className={`font-display text-base font-bold ${headingText} tracking-wider`}>
              EXPLAINABLE AI (XAI) & MITRE ATT&CK HEATMAP
            </h3>
            <p className={`font-mono text-xs ${muted}`}>
              SHAP feature attributions explaining Blue Team detection decisions & MITRE adversary matrix coverage
            </p>
          </div>
        </div>
      </HoloCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SHAP Feature Importance */}
        <HoloCard glowColor="cyan" className="p-4 border-cyan-500/20">
          <div className={`flex items-center justify-between border-b ${headerBorder} pb-2 mb-3`}>
            <span className={`font-mono text-xs font-bold ${headingText} flex items-center gap-1.5`}>
              <BarChart2 size={14} className={cyanAccent} /> SHAP ATTRIBUTION WEIGHTS (BLUE GNN/LSTM)
            </span>
            <span className={`font-mono text-[10px] ${cyanAccent}`}>GLOBAL MODEL IMPORTANCE</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {SHAP_FEATURES.map((feat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className={labelText}>{feat.name}</span>
                  <span className={`${cyanAccent} font-bold`}>
                    +{(feat.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <div className={`h-2 w-full rounded-full ${trackBg} overflow-hidden border ${trackBorder}`}>
                  <div
                    className={`h-full rounded-full ${isLight ? 'bg-gradient-to-r from-[#0284C7] to-[#7C3AED]' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
                    style={{ width: `${feat.weight * 100 * 2}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </HoloCard>

        {/* Model Confidence Breakdown */}
        <HoloCard glowColor="cyan" className="p-4 border-cyan-500/20">
          <div className={`flex items-center justify-between border-b ${headerBorder} pb-2 mb-3`}>
            <span className={`font-mono text-xs font-bold ${headingText} flex items-center gap-1.5`}>
              <Sparkles size={14} className={purpleAccent} /> MULTI-AGENT DECISION EXPLANATIONS
            </span>
            <span className={`font-mono text-[10px] ${purpleAccent}`}>REASONING AUDIT</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className={`rounded-xl ${redPanelBg} p-3 border`}>
              <span className={`${pinkAccent} font-bold block mb-1`}>
                Adversary DQN Policy Rationale
              </span>
              <p className={`text-[11px] ${labelText} leading-relaxed`}>
                Red agent exploits maximum Q-value state transitions targeting nodes adjacent to known high-value targets (SRV-1/SRV-2). When defensive SDN isolation blocks a branch, epsilon exploration encourages lateral probing across the switch.
              </p>
            </div>

            <div className={`rounded-xl ${bluePanelBg} p-3 border`}>
              <span className={`${cyanAccent} font-bold block mb-1`}>
                Blue Team Autonomous Countermeasure Rationale
              </span>
              <p className={`text-[11px] ${labelText} leading-relaxed`}>
                When structural anomaly score exceeds 0.60 threshold, the Blue DQN selects SDN isolation for critical servers to prevent exfiltration, while applying emergency patches for endpoints to minimize enterprise downtime.
              </p>
            </div>
          </div>
        </HoloCard>
      </div>

      {/* MITRE ATT&CK Matrix Heatmap */}
      <HoloCard glowColor="multi" className="p-4">
        <div className={`flex items-center justify-between border-b ${headerBorder} pb-2 mb-3`}>
          <span className={`font-mono text-xs font-bold ${headingText} flex items-center gap-1.5`}>
            <Target size={14} className={pinkAccent} /> MITRE ATT&CK TECHNIQUE HEAT DISTRIBUTION
          </span>
          <span className={`font-mono text-[10px] ${pinkAccent}`}>
            {techniquesUsed.length} ACTIVE TECHNIQUES OBSERVED
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {MITRE_TACTIC_COLUMNS.map((col) => (
            <div key={col.id} className={`rounded-xl ${mitreColBg} p-2.5 border font-mono text-xs`}>
              <div className={`border-b ${mitreBorder} pb-1.5 mb-2`}>
                <span className={`${headingText} font-bold text-[11px] block truncate`}>{col.tactic}</span>
                <span className={`${muted} text-[9px]`}>{col.id}</span>
              </div>
              <div className="space-y-1.5">
                {col.techniques.map((tech) => {
                  const isFired = techniquesUsed.includes(tech);
                  return (
                    <div
                      key={tech}
                      className={`rounded px-2 py-1 text-[10px] font-bold text-center transition ${
                        isFired ? firedTech : unfiredTech
                      }`}
                    >
                      {tech}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </HoloCard>
    </div>
  );
};
