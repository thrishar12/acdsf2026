import React from 'react';
import { X, Server, Shield, Flame, Lock, CheckCircle2, Activity, Cpu, HardDrive } from 'lucide-react';
import { useTheme } from '../../utils/theme';

interface NodeDrawerProps {
  nodeId: string | null;
  status: string;
  onClose: () => void;
}

export const NodeDrawer: React.FC<NodeDrawerProps> = ({ nodeId, status, onClose }) => {
  const { isLight } = useTheme();
  if (!nodeId) return null;

  // Extract sector from prefix
  const pfx = nodeId.split('-')[0] || '';
  const sectorMap: Record<string, string> = {
    FINA: 'Finance',
    ENER: 'Energy & SCADA',
    GOVE: 'Government',
    TELE: 'Telecom',
    DEFE: 'Defense',
    HEAL: 'Healthcare',
    NBR: 'National Backbone',
  };
  const sector = sectorMap[pfx] || 'Core Network';

  const isCompromised = status === 'compromised';
  const isIsolated = status === 'blocked' || status === 'isolated';
  const isPatched = status === 'restored' || status === 'patched';

  return (
    <div className={`fixed inset-y-0 right-0 z-50 w-80 sm:w-96 border-l p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 overflow-y-auto ${
      isLight
        ? 'bg-white border-[#E2E8F0] text-[#0F172A]'
        : 'bg-[#040812]/95 border-cyan-500/30 text-white'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b pb-4 ${isLight ? 'border-[#E2E8F0]' : 'border-white/10'}`}>
        <div className="flex items-center gap-2">
          <Server size={18} className={isLight ? 'text-[#0284C7]' : 'text-cyan-400'} />
          <div>
            <h3 className={`font-mono text-sm font-bold ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>{nodeId}</h3>
            <span className={`font-mono text-[10px] ${isLight ? 'text-[#0284C7]' : 'text-cyan-400'}`}>{sector}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`rounded-lg p-1.5 transition ${
            isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-5 space-y-4 font-mono text-xs">
        {/* Status Badge Card */}
        <div className={`rounded-xl p-3.5 border ${
          isLight ? 'bg-[#F8FAFC] border-[#E2E8F0]' : 'bg-black/50 border-white/10'
        }`}>
          <span className="text-slate-500 text-[10px] uppercase block mb-1">Current State</span>
          <div className="flex items-center gap-2">
            {isCompromised ? (
              <>
                <Flame size={16} className={isLight ? 'text-[#DC2626]' : 'text-pink-400 animate-pulse'} />
                <span className={`font-bold ${isLight ? 'text-[#DC2626]' : 'text-pink-400'}`}>COMPROMISED (ADVERSARY ACCESS)</span>
              </>
            ) : isIsolated ? (
              <>
                <Lock size={16} className={isLight ? 'text-[#D97706]' : 'text-amber-400'} />
                <span className={`font-bold ${isLight ? 'text-[#D97706]' : 'text-amber-400'}`}>SDN ISOLATED (QUARANTINE)</span>
              </>
            ) : isPatched ? (
              <>
                <CheckCircle2 size={16} className={isLight ? 'text-[#16A34A]' : 'text-emerald-400'} />
                <span className={`font-bold ${isLight ? 'text-[#16A34A]' : 'text-emerald-400'}`}>RESTORED & PATCHED</span>
              </>
            ) : (
              <>
                <Shield size={16} className={isLight ? 'text-[#0284C7]' : 'text-cyan-400'} />
                <span className={`font-bold ${isLight ? 'text-[#0284C7]' : 'text-cyan-300'}`}>HEALTHY DIGITAL TWIN</span>
              </>
            )}
          </div>
        </div>

        {/* Digital Twin Telemetry */}
        <div className={`space-y-2 rounded-xl p-3.5 border ${
          isLight ? 'bg-[#F8FAFC] border-[#E2E8F0]' : 'bg-black/40 border-white/10'
        }`}>
          <h4 className={`font-bold uppercase text-[11px] mb-2 flex items-center gap-1.5 ${
            isLight ? 'text-[#0F172A]' : 'text-white'
          }`}>
            <Activity size={13} className={isLight ? 'text-[#0284C7]' : 'text-cyan-400'} /> Digital Twin Telemetry
          </h4>
          <div className="flex justify-between">
            <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Node Criticality</span>
            <span className={`font-bold ${isLight ? 'text-[#D97706]' : 'text-amber-300'}`}>Tier 1 (High)</span>
          </div>
          <div className="flex justify-between">
            <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Virtual CPU Load</span>
            <span className={isCompromised ? (isLight ? 'text-[#DC2626] font-bold' : 'text-pink-400 font-bold') : (isLight ? 'text-[#0F172A]' : 'text-slate-200')}>
              {isCompromised ? '87.4% (Spike)' : '14.2% (Nominal)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Memory Utilization</span>
            <span className={isLight ? 'text-[#0F172A]' : 'text-slate-200'}>{isCompromised ? '74.1%' : '32.6%'}</span>
          </div>
          <div className="flex justify-between">
            <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Ingress Flow Rate</span>
            <span className={isLight ? 'text-[#0F172A]' : 'text-slate-200'}>{isCompromised ? '1,420 pps' : '84 pps'}</span>
          </div>
          <div className="flex justify-between">
            <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>SDN Controller Rule</span>
            <span className={isIsolated ? (isLight ? 'text-[#D97706] font-bold' : 'text-amber-300 font-bold') : (isLight ? 'text-[#16A34A] font-bold' : 'text-emerald-400')}>
              {isIsolated ? 'DROP ALL (Quarantine)' : 'ALLOW_FWD'}
            </span>
          </div>
        </div>

        {/* Mitre Kill Chain Exposure */}
        <div className={`rounded-xl p-3.5 border space-y-2 ${
          isLight ? 'bg-[#F8FAFC] border-[#E2E8F0]' : 'bg-black/40 border-white/10'
        }`}>
          <h4 className={`font-bold uppercase text-[11px] ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>MITRE TTP Exposure</h4>
          <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            {isCompromised
              ? 'Adversary established command interpreter persistence and is attempting privilege escalation.'
              : isIsolated
              ? 'Traffic blocked by OpenFlow rule in SDN switch. Lateral traversal halted.'
              : 'Continuous anomaly surveillance by GNN structural detector active.'}
          </p>
        </div>
      </div>
    </div>
  );
};
