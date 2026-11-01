import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  X,
  Search,
  Lock,
  Radio,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDefence } from '../hooks/useDefence';
import { PulseBeacon } from '../components/ui/CyberIcons';
import { useTheme } from '../utils/theme';
import type { TwinNode } from '../types';

function enrich(n: TwinNode, i: number): TwinNode {
  return {
    ...n,
    ip: n.ip || `10.${(i % 6) + 1}.0.${20 + i}`,
    memory_usage: n.memory_usage ?? ((i * 13) % 75) + 15,
    open_ports: n.open_ports?.length ? n.open_ports : [22, 80, 443, 8080],
  };
}

export function DigitalTwin() {
  const { isLight } = useTheme();
  const { twins } = useDefence();
  const [selected, setSelected] = useState<TwinNode | null>(null);
  const [filterSector, setFilterSector] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quarantineLog, setQuarantineLog] = useState<string | null>(null);

  const enrichedTwins = useMemo(() => twins.map(enrich), [twins]);

  const filteredTwins = useMemo(() => {
    return enrichedTwins.filter((t) => {
      const matchSector = filterSector === 'ALL' || t.sector === filterSector;
      const matchSearch =
        t.node_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.ip?.includes(searchQuery);
      return matchSector && matchSearch;
    });
  }, [enrichedTwins, filterSector, searchQuery]);

  const nodes: Node[] = useMemo(
    () =>
      filteredTwins.slice(0, 30).map((n, i) => {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const hot = Boolean(n.is_compromised);
        return {
          id: n.node_id,
          position: { x: col * 200 + 40, y: row * 160 + 40 },
          data: {
            label: (
              <div className="font-mono text-left">
                <div className={`flex items-center justify-between border-b pb-1 ${
                  isLight ? 'border-[#E2E8F0]' : 'border-white/10'
                }`}>
                  <span className={`font-bold text-[11px] ${isLight ? 'text-[#0F172A]' : 'text-white'}`}>{n.node_id}</span>
                  <span className={`text-[9px] ${isLight ? 'text-[#64748B]' : 'text-slate-400'}`}>{n.sector}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className={isLight ? 'text-[#0284C7]' : 'text-cyan-300'}>{n.ip}</span>
                  <span className={hot ? (isLight ? 'text-[#DC2626] font-bold' : 'text-pink-400 font-bold') : (isLight ? 'text-[#16A34A] font-bold' : 'text-[#00ff9d]')}>
                    {hot ? 'COMPROMISED' : 'SECURE'}
                  </span>
                </div>
                <div className={`mt-1 h-1 w-full overflow-hidden rounded ${isLight ? 'bg-[#E2E8F0]' : 'bg-slate-800'}`}>
                  <div
                    className={`h-full ${hot ? (isLight ? 'bg-[#DC2626]' : 'bg-[#ff007f]') : (isLight ? 'bg-[#0284C7]' : 'bg-[#00f5ff]')}`}
                    style={{ width: `${n.cpu_load || 40}%` }}
                  />
                </div>
              </div>
            ),
          },
          style: {
            background: isLight
              ? (hot ? '#FEE2E2' : '#FFFFFF')
              : (hot
                ? 'linear-gradient(135deg, rgba(63, 18, 25, 0.95), rgba(24, 7, 12, 0.95))'
                : 'linear-gradient(135deg, rgba(8, 20, 38, 0.9), rgba(4, 10, 20, 0.95))'),
            color: isLight ? '#0F172A' : '#e2e8f0',
            border: `1px solid ${hot ? '#DC2626' : (isLight ? '#CBD5E1' : '#00f5ff')}`,
            borderRadius: 14,
            width: 175,
            padding: 10,
            boxShadow: isLight
              ? '0 1px 3px rgba(0,0,0,0.08)'
              : (hot ? '0 0 25px rgba(255,0,127,0.45)' : '0 0 15px rgba(0,245,255,0.18)'),
            backdropFilter: isLight ? 'none' : 'blur(12px)',
          },
        };
      }),
    [filteredTwins, isLight],
  );

  const edges: Edge[] = useMemo(
    () =>
      filteredTwins.slice(0, 28).map((n, i) => ({
        id: `e-${i}`,
        source: filteredTwins[i].node_id,
        target: filteredTwins[(i + 1) % filteredTwins.length].node_id,
        animated: Boolean(filteredTwins[i].is_compromised),
        style: {
          stroke: filteredTwins[i].is_compromised ? (isLight ? '#DC2626' : '#ff007f') : (isLight ? '#94A3B8' : '#00f5ff'),
          strokeWidth: filteredTwins[i].is_compromised ? 2 : 1.2,
          strokeOpacity: isLight ? 0.8 : 0.6,
        },
      })),
    [filteredTwins, isLight],
  );

  const handleQuarantine = (nodeId: string) => {
    setQuarantineLog(`Node ${nodeId} successfully placed into kernel-level sandbox quarantine.`);
    setTimeout(() => setQuarantineLog(null), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-[#00f5ff] animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00f5ff]">
              LIVING INFRASTRUCTURE TELEMETRY // ASSET FABRIC
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">
            Digital Twin — National Node Topology
          </h2>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search host ID or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`rounded-xl border py-2 pl-9 pr-4 font-mono text-xs outline-none transition-colors ${
                isLight
                  ? 'border-[#F472B6] bg-[#FFF5F8] text-[#0F172A] placeholder-slate-500 focus:border-[#E11D48]'
                  : 'border-white/10 bg-black/40 text-white placeholder-slate-600 focus:border-cyan-400'
              }`}
            />
          </div>

          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            className={`rounded-xl border px-4 py-2 font-mono text-xs outline-none transition-colors ${
              isLight
                ? 'border-[#F472B6] bg-[#FFF5F8] text-[#0F172A] focus:border-[#E11D48]'
                : 'border-white/10 bg-[#071326] text-white focus:border-cyan-400'
            }`}
          >
            <option value="ALL">All Sovereign Sectors</option>
            <option value="ENE">Energy Grid</option>
            <option value="FIN">Financial Core</option>
            <option value="HLT">Healthcare</option>
            <option value="DEF">Defense Net</option>
            <option value="TEL">Telecom</option>
            <option value="TRN">Transport</option>
          </select>
        </div>
      </div>

      {/* Main Interactive Flow Canvas */}
      <div className={`relative h-[600px] overflow-hidden rounded-2xl border transition-all duration-200 ${
        isLight
          ? 'border-2 border-[#F472B6] bg-gradient-to-br from-[#FDF2F8] to-[#FEF3C7] shadow-md'
          : 'border-cyan-500/30 bg-[#040a16] shadow-2xl'
      }`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          onNodeClick={(_, node) => {
            const found = enrichedTwins.find((t) => t.node_id === node.id);
            if (found) setSelected(found);
          }}
        >
          <Background color={isLight ? '#F472B6' : '#00f5ff'} gap={28} size={1} />
          <MiniMap
            pannable
            zoomable
            style={{
              background: isLight ? '#FFF0F5' : '#07111e',
              border: isLight ? '1.5px solid #F472B6' : '1px solid rgba(0,245,255,0.3)',
              borderRadius: '12px',
            }}
          />
          <Controls
            style={{
              background: isLight ? '#FFF0F5' : '#07111e',
              borderColor: isLight ? '#F472B6' : 'rgba(0,245,255,0.3)',
              borderRadius: '12px',
            }}
          />
        </ReactFlow>

        {/* Floating Hint Overlay */}
        <div className={`pointer-events-none absolute bottom-4 left-4 rounded-xl border px-4 py-2 font-mono text-[10px] ${
          isLight
            ? 'border-[#F472B6] bg-[#FFF5F8]/95 text-[#475569] shadow-sm'
            : 'border-white/10 bg-black/70 text-slate-400 backdrop-blur-md'
        }`}>
          <span>Click any node in graph to inspect telemetry & execute containment.</span>
        </div>
      </div>

      {/* Asset Inspector Side Drawer */}
      {selected && (
        <aside className="fixed bottom-0 right-0 top-0 z-50 w-[min(440px,100vw)] overflow-y-auto border-l border-cyan-400/40 bg-[#06101f]/98 p-6 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <PulseBeacon color={selected.is_compromised ? 'magenta' : 'acid'} size="sm" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#00f5ff]">
                  DEEP ASSET INSPECTOR
                </p>
              </div>
              <h3 className="mt-1 font-display text-2xl font-bold text-white">
                {selected.node_id}
              </h3>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Telemetry DL Grid */}
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <p className="text-[10px] uppercase text-slate-500">IP Identifier</p>
                <p className="mt-1 font-bold text-cyan-300">{selected.ip}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <p className="text-[10px] uppercase text-slate-500">Sovereign Sector</p>
                <p className="mt-1 font-bold text-purple-300">{selected.sector}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <p className="text-[10px] uppercase text-slate-500">CPU Workload</p>
                <p className="mt-1 font-bold text-white">{selected.cpu_load}%</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <p className="text-[10px] uppercase text-slate-500">Memory Pressure</p>
                <p className="mt-1 font-bold text-white">{selected.memory_usage}%</p>
              </div>
            </div>

            {/* Compromise Status Banner */}
            <div
              className={`rounded-xl border p-4 font-mono text-xs ${
                selected.is_compromised
                  ? 'border-pink-500/50 bg-pink-950/40 text-pink-300'
                  : 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase">
                  STATUS: {selected.is_compromised ? 'ACTIVE INTRUSION DETECTED' : 'SYSTEM NOMINAL'}
                </span>
                <span className="text-[10px]">ALERTS: {selected.alert_count}</span>
              </div>
              <p className="mt-1 text-[11px] opacity-80">
                {selected.is_compromised
                  ? 'High-entropy packet payload detected. Potential lateral movement vector.'
                  : 'All integrity hashes verified. Cryptographic keys nominal.'}
              </p>
            </div>

            {/* Open Ports Visualizer */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Listening Ports & Protocols:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.open_ports?.map((p) => (
                  <span
                    key={p}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 font-mono text-xs text-cyan-200"
                  >
                    PORT {p} // ACTIVE
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 border-t border-white/10 pt-4">
              <button
                onClick={() => handleQuarantine(selected.node_id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 py-3 font-mono text-xs font-bold uppercase text-white shadow-[0_0_20px_rgba(255,0,127,0.4)] transition hover:brightness-105"
              >
                <Lock size={15} /> Sandbox Quarantine Node
              </button>
            </div>

            {quarantineLog && (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-950/40 p-3 font-mono text-xs text-emerald-300">
                {quarantineLog}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
