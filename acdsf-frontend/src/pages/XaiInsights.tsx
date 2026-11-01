import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Radio,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Cpu,
} from 'lucide-react';
import { useState } from 'react';
import { HoloCard } from '../components/ui/HoloCard';
import { RingStat } from '../components/ui/RingStat';
import { CyberBadge } from '../components/ui/CyberBadge';
import { useDefence } from '../hooks/useDefence';
import { mockXai } from '../data/mockData';

export function XaiInsights() {
  const { xai } = useDefence();
  const [overrideNotice, setOverrideNotice] = useState<string | null>(null);

  const decision = xai.decision || mockXai.decision;
  const confidence = xai.confidence || mockXai.confidence;
  const features = xai.features?.length ? xai.features : mockXai.features;

  const chart = features.map((f) => ({
    name: f.name,
    value: Math.abs(f.value) * 100,
    rawVal: f.value,
    fill: f.value >= 0 ? '#00f5ff' : '#ff007f',
  }));

  const handleOverride = (action: string) => {
    setOverrideNotice(`[SOVEREIGN OVERRIDE LOGGED] Action: ${action} applied by Operator.`);
    setTimeout(() => setOverrideNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-purple-400 animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-purple-300">
              MACHINE REASONING // XAI SHAP & LIME AUDIT
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">
            Why Did The AI Make This Defense Decision?
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Every autonomous multi-agent recommendation is mathematically mapped through SHAP Shapley values and local linear surrogates (LIME).
          </p>
        </div>
        <CyberBadge label="DECISION MODEL AUDITABLE" tone="acid" />
      </div>

      {/* Primary Reasoning Cards */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <HoloCard glowColor="cyan" className="p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="text-[#00f5ff]" size={18} />
              <span className="font-mono text-xs uppercase tracking-wider text-slate-400">
                AI Threat Classification
              </span>
            </div>
            <span className="font-mono text-[10px] text-cyan-300">MODEL // RESNET-CYBER-v4</span>
          </div>

          <p className="mt-4 font-display text-3xl font-bold text-white glow-text">
            {decision}
          </p>

          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {xai.explanation || mockXai.explanation}
          </p>

          <div className="mt-5 rounded-xl border border-cyan-400/30 bg-cyan-950/40 p-4">
            <p className="font-mono text-[10px] uppercase text-cyan-300">Recommended SOAR Playbook</p>
            <p className="mt-1 font-mono text-sm font-semibold text-white">
              {xai.recommendation || mockXai.recommendation}
            </p>
          </div>
        </HoloCard>

        {/* Confidence Gauge Card */}
        <HoloCard glowColor="violet" className="flex flex-col items-center justify-center p-6 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-purple-300">
            Model Neural Confidence
          </p>
          <div className="my-4">
            <RingStat value={Number(confidence)} label="Certainty" color="#a855f7" />
          </div>
          <p className="font-mono text-[11px] text-slate-400">
            Validated against 18,400 synthetic intrusion vectors.
          </p>
        </HoloCard>
      </div>

      {/* SHAP & LIME Feature Importance Visualizations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* SHAP Chart */}
        <HoloCard glowColor="cyan" className="p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-display text-lg font-bold text-white">
              SHAP Value Feature Attribution
            </h3>
            <span className="font-mono text-[10px] text-cyan-300">GLOBAL SENSITIVITY</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Hyper-cyan indicates features increasing defensive confidence; magenta indicates anomaly drivers.
          </p>

          <div className="mt-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071326',
                    borderColor: '#00f5ff',
                    borderRadius: '12px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="value" radius={6}>
                  {chart.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HoloCard>

        {/* LIME Local Surrogates */}
        <HoloCard glowColor="violet" className="p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-display text-lg font-bold text-white">
              LIME Local Explanation Weights
            </h3>
            <span className="font-mono text-[10px] text-purple-300">SURROGATE DECOMPOSITION</span>
          </div>

          <ul className="mt-4 space-y-3.5">
            {features.map((f) => (
              <li key={f.name} className="font-mono text-xs">
                <div className="mb-1 flex justify-between">
                  <span className="text-slate-300 font-medium">{f.name}</span>
                  <span className={f.value >= 0 ? 'text-[#00f5ff]' : 'text-[#ff007f]'}>
                    {f.value > 0 ? '+' : ''}
                    {f.value}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full ${f.value >= 0 ? 'bg-[#00f5ff]' : 'bg-[#ff007f]'}`}
                    style={{ width: `${Math.min(100, Math.abs(f.value) * 160)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </HoloCard>
      </div>

      {/* Human-in-the-Loop Override Console */}
      <HoloCard glowColor="multi" className="p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-[#00ff9d]" />
            <h3 className="font-display text-lg font-bold text-white">
              Human-in-the-Loop Sovereign Governance
            </h3>
          </div>
          <CyberBadge label="OPERATOR SUPERVISION ACTIVE" tone="acid" size="sm" />
        </div>

        <p className="mt-3 text-xs text-slate-300">
          Command officers retain complete sovereign control to validate, tune, or override autonomous AI defensive decisions prior to system-wide policy propagation.
        </p>

        <div className="mt-6 flex flex-wrap gap-4">
          <button
            onClick={() => handleOverride('Approved AI SOAR Execution')}
            className="flex items-center gap-2 rounded-xl bg-[#00ff9d] px-5 py-2.5 font-mono text-xs font-bold uppercase text-slate-950 shadow-[0_0_20px_rgba(0,255,157,0.4)] transition hover:brightness-110"
          >
            <CheckCircle2 size={15} /> Authorize & Deploy Playbook
          </button>
          <button
            onClick={() => handleOverride('Manual Quarantine Override')}
            className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-950/40 px-5 py-2.5 font-mono text-xs uppercase text-cyan-200 transition hover:bg-cyan-500/20"
          >
            <Sliders size={15} /> Adjust Decision Sensitivity
          </button>
          <button
            onClick={() => handleOverride('Revoked Autonomous Action')}
            className="flex items-center gap-2 rounded-xl border border-pink-500/40 bg-pink-950/40 px-5 py-2.5 font-mono text-xs uppercase text-pink-300 transition hover:bg-pink-500/20"
          >
            <RotateCcw size={15} /> Override & Halt Action
          </button>
        </div>

        {overrideNotice && (
          <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-950/40 p-3 font-mono text-xs text-emerald-300">
            {overrideNotice}
          </div>
        )}
      </HoloCard>
    </div>
  );
}
