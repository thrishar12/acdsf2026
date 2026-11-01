import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../utils/theme';
import {
  Shield,
  Zap,
  Lock,
  Radio,
  Server,
  Monitor,
  Network,
  Cpu,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { ActiveAttackVisual, ActiveDefenseVisual } from '../../hooks/useSimulation';

interface TopologyBattlefieldProps {
  nodeStates: Record<string, string>;
  activeAttack: ActiveAttackVisual | null;
  activeDefense: ActiveDefenseVisual | null;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  scenario: string;
}

interface NodeCoord {
  id: string;
  name: string;
  sector: string;
  type: string;
  criticality: number;
  x: number;
  y: number;
}

// 6 sectors radially arranged around central backbone router
const SECTOR_CONFIG: Record<string, { color: string; label: string; angleDeg: number }> = {
  Finance: { color: '#00f5ff', label: 'FINANCE SECTOR', angleDeg: 0 },
  Telecom: { color: '#8b5cf6', label: 'TELECOM SECTOR', angleDeg: 60 },
  Energy: { color: '#f59e0b', label: 'ENERGY & SCADA', angleDeg: 120 },
  Government: { color: '#ec4899', label: 'GOVERNMENT', angleDeg: 180 },
  Transportation: { color: '#ef4444', label: 'TRANSPORTATION', angleDeg: 240 },
  Water: { color: '#10b981', label: 'WATER & UTILITIES', angleDeg: 300 },
};

export const TopologyBattlefield: React.FC<TopologyBattlefieldProps> = ({
  nodeStates,
  activeAttack,
  activeDefense,
  onSelectNode,
  selectedNodeId,
  scenario,
}) => {
  const { isLight } = useTheme();
  const [zoom, setZoom] = useState(1);
  const [activeSectorFilter, setActiveSectorFilter] = useState<string | null>(null);

  // Generate node coordinates dynamically for the 43 nodes
  const { nodes, edges } = useMemo(() => {
    const coords: Record<string, NodeCoord> = {};
    const edgeList: Array<{ source: string; target: string; sector?: string }> = [];

    const centerX = 500;
    const centerY = 360;

    // Central Backbone Router
    coords['NBR-01'] = {
      id: 'NBR-01',
      name: 'NBR-01 (Backbone)',
      sector: 'Backbone',
      type: 'backbone_router',
      criticality: 10,
      x: centerX,
      y: centerY,
    };

    const sectorPrefixes: Record<string, string> = {
      Government: 'GOVE',
      Energy: 'ENER',
      Finance: 'FINA',
      Telecom: 'TELE',
      Transportation: 'TRAN',
      Water: 'WATE',
    };

    Object.entries(SECTOR_CONFIG).forEach(([sectorName, secCfg]) => {
      const pfx = sectorPrefixes[sectorName] || sectorName.substring(0, 4).toUpperCase();
      const angleRad = (secCfg.angleDeg * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);

      // Perpendicular vector for spread in sector fan
      const perpCos = -sinA;
      const perpSin = cosA;

      // 1. Core Router
      const rId = `${pfx}-CORE-R1`;
      const rDist = 120;
      coords[rId] = {
        id: rId,
        name: `${sectorName} Core Router`,
        sector: sectorName,
        type: 'router',
        criticality: 9,
        x: centerX + cosA * rDist,
        y: centerY + sinA * rDist,
      };
      edgeList.push({ source: 'NBR-01', target: rId, sector: sectorName });

      // 2. Firewall
      const fwId = `${pfx}-FW1`;
      const fwDist = 185;
      coords[fwId] = {
        id: fwId,
        name: `${sectorName} Gateway FW`,
        sector: sectorName,
        type: 'firewall',
        criticality: 9,
        x: centerX + cosA * fwDist,
        y: centerY + sinA * fwDist,
      };
      edgeList.push({ source: rId, target: fwId, sector: sectorName });

      // 3. Switch
      const swId = `${pfx}-SW1`;
      const swDist = 250;
      coords[swId] = {
        id: swId,
        name: `${sectorName} Distro Switch`,
        sector: sectorName,
        type: 'switch',
        criticality: 7,
        x: centerX + cosA * swDist,
        y: centerY + sinA * swDist,
      };
      edgeList.push({ source: fwId, target: swId, sector: sectorName });

      // 4. Server 1
      const srv1Id = `${pfx}-SRV1`;
      const srvDist = 320;
      coords[srv1Id] = {
        id: srv1Id,
        name: `${sectorName} Production SRV-1`,
        sector: sectorName,
        type: 'server',
        criticality: 10,
        x: centerX + cosA * srvDist + perpCos * -45,
        y: centerY + sinA * srvDist + perpSin * -45,
      };
      edgeList.push({ source: swId, target: srv1Id, sector: sectorName });

      // 5. Server 2
      const srv2Id = `${pfx}-SRV2`;
      coords[srv2Id] = {
        id: srv2Id,
        name: `${sectorName} Backup/DB SRV-2`,
        sector: sectorName,
        type: 'server',
        criticality: 9,
        x: centerX + cosA * (srvDist + 15) + perpCos * -15,
        y: centerY + sinA * (srvDist + 15) + perpSin * -15,
      };
      edgeList.push({ source: swId, target: srv2Id, sector: sectorName });

      // 6. Endpoint PC1
      const pc1Id = `${pfx}-PC1`;
      coords[pc1Id] = {
        id: pc1Id,
        name: `${sectorName} Workstation PC-1`,
        sector: sectorName,
        type: 'endpoint',
        criticality: 4,
        x: centerX + cosA * (srvDist + 15) + perpCos * 20,
        y: centerY + sinA * (srvDist + 15) + perpSin * 20,
      };
      edgeList.push({ source: swId, target: pc1Id, sector: sectorName });

      // 7. Endpoint PC2
      const pc2Id = `${pfx}-PC2`;
      coords[pc2Id] = {
        id: pc2Id,
        name: `${sectorName} Admin Terminal PC-2`,
        sector: sectorName,
        type: 'endpoint',
        criticality: 5,
        x: centerX + cosA * srvDist + perpCos * 50,
        y: centerY + sinA * srvDist + perpSin * 50,
      };
      edgeList.push({ source: swId, target: pc2Id, sector: sectorName });
    });

    return { nodes: Object.values(coords), edges: edgeList };
  }, []);

  const getNodeStatus = (nodeId: string) => {
    return nodeStates[nodeId] || 'healthy';
  };

  const getNodeColor = (nodeId: string, sector: string) => {
    const status = getNodeStatus(nodeId);
    if (status === 'compromised') return '#ff0055'; // neon red/pink
    if (status === 'under_attack') return '#f97316'; // warning orange
    if (status === 'scanned') return '#eab308'; // recon yellow
    if (status === 'blocked' || status === 'isolated') return '#f59e0b'; // amber lock
    if (status === 'restored' || status === 'patched') return '#10b981'; // emerald
    if (nodeId === 'NBR-01') return '#a855f7'; // central violet
    return SECTOR_CONFIG[sector]?.color || '#00f5ff';
  };

  const getNodeIcon = (type: string, status: string) => {
    if (status === 'compromised') return <Flame size={14} className="text-white animate-pulse" />;
    if (status === 'blocked' || status === 'isolated') return <Lock size={12} className="text-amber-200" />;
    if (status === 'restored' || status === 'patched') return <CheckCircle2 size={12} className="text-emerald-200" />;

    switch (type) {
      case 'backbone_router':
        return <Network size={16} className="text-purple-300" />;
      case 'router':
        return <Radio size={13} className="text-cyan-300" />;
      case 'firewall':
        return <Shield size={13} className="text-pink-300" />;
      case 'switch':
        return <Cpu size={12} className="text-slate-200" />;
      case 'server':
        return <Server size={13} className="text-blue-300" />;
      case 'endpoint':
      default:
        return <Monitor size={12} className="text-slate-300" />;
    }
  };

  // Attacker & Target coords for laser animation
  const attackCoords = useMemo(() => {
    if (!activeAttack || !activeAttack.target) return null;
    const tgt = nodes.find(n => n.id === activeAttack.target);
    if (!tgt) return null;
    const src = nodes.find(n => n.id === activeAttack.source) || nodes.find(n => n.id === 'NBR-01') || { x: 500, y: 100 };
    return {
      srcX: src.x,
      srcY: src.y,
      tgtX: tgt.x,
      tgtY: tgt.y,
      success: activeAttack.success,
      technique: activeAttack.technique,
      mitreId: activeAttack.mitreId,
    };
  }, [activeAttack, nodes]);

  // Defense target coords for shield ripple animation
  const defenseCoords = useMemo(() => {
    if (!activeDefense || !activeDefense.target) return null;
    const tgt = nodes.find(n => n.id === activeDefense.target);
    if (!tgt) return null;
    return {
      x: tgt.x,
      y: tgt.y,
      action: activeDefense.action,
      success: activeDefense.success,
    };
  }, [activeDefense, nodes]);

  return (
    <div className={`relative w-full rounded-2xl border p-4 overflow-hidden transition-all duration-200 ${
      isLight
        ? 'border-2 border-[#F472B6] bg-gradient-to-br from-[#FFF0F5] via-[#FFFBEB] to-[#FCE7F3] shadow-md'
        : 'border-cyan-500/30 bg-[#060a12] shadow-[0_0_40px_rgba(0,0,0,0.8)]'
    }`}>
      {/* Background Cyber Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: isLight
            ? 'linear-gradient(to right, rgba(244,63,94,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,158,11,0.18) 1px, transparent 1px)'
            : 'linear-gradient(to right, rgba(0,245,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,245,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top Overlay HUD Bar */}
      <div className={`relative z-10 mb-2 flex flex-wrap items-center justify-between gap-3 border-b-2 pb-3 ${
        isLight ? 'border-[#F472B6]' : 'border-white/10'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border-2 ${
            isLight ? 'border-[#F472B6] bg-[#FFF5F8]' : 'border-cyan-500/30 bg-black/60'
          }`}>
            <Radio size={14} className={isLight ? 'text-[#E11D48]' : 'text-cyan-400 animate-pulse'} />
            <span className={`font-mono text-xs font-bold tracking-wider ${
              isLight ? 'text-[#0F172A]' : 'text-white'
            }`}>
              43-NODE DIGITAL TWIN TOPOLOGY
            </span>
            <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
              isLight ? 'bg-[#FFE4E6] text-[#BE123C]' : 'bg-cyan-950 text-cyan-300'
            }`}>
              6 SECTORS
            </span>
          </div>

          {/* Sector Filter Chips */}
          <div className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveSectorFilter(null)}
              className={`px-2 py-1 rounded text-[10px] font-mono transition ${
                activeSectorFilter === null
                  ? isLight
                    ? 'bg-[#E11D48] text-white border border-[#E11D48] shadow-sm font-bold'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : isLight
                  ? 'text-[#78350F] bg-[#FEF3C7] border border-[#FDE68A] hover:bg-[#FDE68A] hover:text-[#0F172A]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL
            </button>
            {Object.keys(SECTOR_CONFIG).map(sec => (
              <button
                key={sec}
                onClick={() => setActiveSectorFilter(activeSectorFilter === sec ? null : sec)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition ${
                  activeSectorFilter === sec
                    ? isLight
                      ? 'bg-[#E11D48] text-white border border-[#E11D48] shadow-sm font-bold'
                      : 'bg-pink-500/20 text-pink-300 border border-pink-500/50'
                    : isLight
                    ? 'text-[#78350F] bg-[#FEF3C7] border border-[#FDE68A] hover:bg-[#FDE68A] hover:text-[#0F172A]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom & Reset Controls */}
        <div className={`flex items-center gap-1 rounded-lg p-1 border ${
          isLight ? 'border-[#FECDD3] bg-[#FFF5F7]' : 'border-white/10 bg-black/50'
        }`}>
          <button
            onClick={() => setZoom(prev => Math.max(0.7, prev - 0.15))}
            className={`p-1.5 rounded transition ${
              isLight ? 'text-[#881337] hover:text-[#0F172A] hover:bg-[#FFE4E6]' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className={`px-1.5 font-mono text-[11px] font-bold ${
            isLight ? 'text-[#E11D48]' : 'text-cyan-400'
          }`}>{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(1.6, prev + 0.15))}
            className={`p-1.5 rounded transition ${
              isLight ? 'text-[#881337] hover:text-[#0F172A] hover:bg-[#FFE4E6]' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className={`p-1.5 rounded transition ${
              isLight ? 'text-[#881337] hover:text-[#0F172A] hover:bg-[#FFE4E6]' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Reset Zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Main SVG Battlefield Canvas */}
      <div className="relative overflow-hidden flex items-center justify-center min-h-[540px] select-none">
        <svg
          viewBox="0 0 1000 720"
          className="w-full h-auto max-h-[620px] transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          <defs>
            {/* Sector Glow Filters */}
            <filter id="neonGlowRed" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlowCyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Attack laser gradient */}
            <linearGradient id="attackLaserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff0055" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ff00aa" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
            </linearGradient>

            {/* Defense shield gradient */}
            <linearGradient id="defenseShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Sector Boundary Background Pods */}
          {Object.entries(SECTOR_CONFIG).map(([secName, secCfg]) => {
            const angleRad = (secCfg.angleDeg * Math.PI) / 180;
            const podX = 500 + Math.cos(angleRad) * 230;
            const podY = 360 + Math.sin(angleRad) * 230;
            const isFocussed = !activeSectorFilter || activeSectorFilter === secName;

            return (
              <g key={`pod-${secName}`} opacity={isFocussed ? (isLight ? 0.7 : 0.35) : (isLight ? 0.2 : 0.08)} className="transition-opacity">
                <circle
                  cx={podX}
                  cy={podY}
                  r="130"
                  fill="none"
                  stroke={isLight ? '#CBD5E1' : secCfg.color}
                  strokeWidth="1"
                  strokeDasharray="4 6"
                />
                {/* Sector Name Banner */}
                <text
                  x={500 + Math.cos(angleRad) * 350}
                  y={360 + Math.sin(angleRad) * 350 + (secCfg.angleDeg > 90 && secCfg.angleDeg < 270 ? 15 : -5)}
                  fill={isLight ? '#475569' : secCfg.color}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                  letterSpacing="1"
                >
                  {secCfg.label}
                </text>
              </g>
            );
          })}

          {/* Network Links (Edges) */}
          <g className="edges">
            {edges.map((edge, idx) => {
              const src = nodes.find(n => n.id === edge.source);
              const tgt = nodes.find(n => n.id === edge.target);
              if (!src || !tgt) return null;

              const isEdgeCompromised =
                getNodeStatus(edge.source) === 'compromised' && getNodeStatus(edge.target) === 'compromised';
              const isTargetIsolated =
                getNodeStatus(edge.target) === 'blocked' || getNodeStatus(edge.target) === 'isolated';

              return (
                <line
                  key={`edge-${idx}`}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={
                    isTargetIsolated
                      ? (isLight ? '#94A3B8' : '#475569')
                      : isEdgeCompromised
                      ? (isLight ? '#DC2626' : '#ff0055')
                      : (isLight ? '#CBD5E1' : 'rgba(0, 245, 255, 0.25)')
                  }
                  strokeWidth={isEdgeCompromised ? 2.5 : isTargetIsolated ? 1 : 1.5}
                  strokeDasharray={isTargetIsolated ? '3 3' : undefined}
                  className="transition-colors duration-500"
                />
              );
            })}
          </g>

          {/* Dynamic Attack Laser Beam Animation */}
          {attackCoords && (
            <g className="attack-laser">
              <line
                x1={attackCoords.srcX}
                y1={attackCoords.srcY}
                x2={attackCoords.tgtX}
                y2={attackCoords.tgtY}
                stroke="url(#attackLaserGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#neonGlowRed)"
              />
              <circle
                cx={attackCoords.tgtX}
                cy={attackCoords.tgtY}
                r="24"
                fill="none"
                stroke="#ff0055"
                strokeWidth="2"
                className="animate-ping"
              />
            </g>
          )}

          {/* Dynamic Defense Shield Ripple */}
          {defenseCoords && (
            <g className="defense-shield">
              <circle
                cx={defenseCoords.x}
                cy={defenseCoords.y}
                r="30"
                fill="none"
                stroke="#00f5ff"
                strokeWidth="3"
                className="animate-pulse"
                filter="url(#neonGlowCyan)"
              />
              <circle
                cx={defenseCoords.x}
                cy={defenseCoords.y}
                r="40"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
            </g>
          )}

          {/* Network Nodes (43 nodes) */}
          <g className="nodes">
            {nodes.map(node => {
              const status = getNodeStatus(node.id);
              const color = getNodeColor(node.id, node.sector);
              const isSelected = selectedNodeId === node.id;
              const isBackbone = node.id === 'NBR-01';
              const radius = isBackbone ? 22 : node.type === 'router' ? 17 : node.type === 'server' ? 15 : 13;
              const isCompromised = status === 'compromised';
              const isIsolated = status === 'blocked' || status === 'isolated';

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => onSelectNode(node.id)}
                  className="cursor-pointer transition-transform hover:brightness-110"
                >
                  {/* Outer Pulsing Halo for Compromised or Selected Nodes */}
                  {(isCompromised || isSelected) && (
                    <circle
                      r={radius + 8}
                      fill="none"
                      stroke={isCompromised ? '#ff0055' : '#00f5ff'}
                      strokeWidth={isSelected ? 2 : 1.5}
                      className={isCompromised ? 'animate-ping' : ''}
                      opacity={isCompromised ? 0.7 : 0.9}
                    />
                  )}

                  {/* Isolated Dashed Border */}
                  {isIsolated && (
                    <circle
                      r={radius + 6}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      className="animate-spin"
                      style={{ animationDuration: '8s' }}
                    />
                  )}

                  {/* Main Node Hexagon/Circle Body */}
                  <circle
                    r={radius}
                    fill={
                      isLight
                        ? (isCompromised ? '#FEE2E2' : isIsolated ? '#FEF3C7' : '#FFFFFF')
                        : (isCompromised ? '#330514' : isIsolated ? '#241400' : '#0a1424')
                    }
                    stroke={
                      isLight
                        ? (isCompromised ? '#DC2626' : isIsolated ? '#D97706' : isSelected ? '#0284C7' : '#16A34A')
                        : color
                    }
                    strokeWidth={isSelected ? 3 : 2}
                    filter={isLight ? undefined : (isCompromised ? 'url(#neonGlowRed)' : 'url(#neonGlowCyan)')}
                  />

                  {/* Node Center Icon / Indicator */}
                  <foreignObject
                    x={-radius}
                    y={-radius}
                    width={radius * 2}
                    height={radius * 2}
                    className="pointer-events-none"
                  >
                    <div className="flex h-full w-full items-center justify-center">
                      {getNodeIcon(node.type, status)}
                    </div>
                  </foreignObject>

                  {/* Node Label Below */}
                  <text
                    y={radius + 13}
                    fill={
                      isLight
                        ? (isCompromised ? '#DC2626' : '#0F172A')
                        : (isCompromised ? '#ff6699' : isSelected ? '#ffffff' : '#94a3b8')
                    }
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {node.id}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Bottom Interactive Legend Strip */}
      <div className={`mt-2 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-[11px] font-mono ${
        isLight ? 'border-[#E2E8F0] text-[#475569]' : 'border-white/10 text-slate-400'
      }`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${isLight ? 'bg-[#16A34A]' : 'bg-[#00f5ff] shadow-[0_0_8px_#00f5ff]'}`} />
            <span>Healthy Twin</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${isLight ? 'bg-[#D97706]' : 'bg-[#eab308] shadow-[0_0_8px_#eab308]'}`} />
            <span>Scanned (Recon)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${isLight ? 'bg-[#EA580C]' : 'bg-[#f97316] animate-pulse'}`} />
            <span>Under Attack</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${isLight ? 'bg-[#DC2626]' : 'bg-[#ff0055] shadow-[0_0_12px_#ff0055] animate-ping'}`} />
            <span className={isLight ? 'text-[#DC2626] font-bold' : 'text-pink-400 font-bold'}>Compromised</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full border ${isLight ? 'border-[#D97706] bg-[#FEF3C7]' : 'border-amber-400 bg-amber-950'}`} />
            <span className={isLight ? 'text-[#D97706] font-semibold' : 'text-amber-300'}>SDN Isolated</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${isLight ? 'bg-[#16A34A]' : 'bg-[#10b981] shadow-[0_0_8px_#10b981]'}`} />
            <span className={isLight ? 'text-[#16A34A] font-semibold' : 'text-emerald-300'}>Patched / Restored</span>
          </span>
        </div>

        <div className={`text-[10px] italic ${isLight ? 'text-[#64748B]' : 'text-slate-500'}`}>
          Click any node to view real-time digital twin telemetry & attack history
        </div>
      </div>
    </div>
  );
};
