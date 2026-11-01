import {
  Radio,
  Search,
  Flame,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { HoloCard } from '../components/ui/HoloCard';
import { KnowledgeGraph } from '../components/viz/KnowledgeGraph';
import { useDefence } from '../hooks/useDefence';
import { CyberBadge } from '../components/ui/CyberBadge';
import { PulseBeacon } from '../components/ui/CyberIcons';

const adversaryDossiers = [
  {
    name: 'APT28 (Fancy Bear)',
    origin: 'State-Sponsored Actor',
    target: 'Defense & Energy Grids',
    ttps: ['Spearphishing', 'Credential Harvesting', 'Zero-Day RCE'],
    threatLevel: 'CRITICAL',
    glow: 'magenta' as const,
  },
  {
    name: 'APT29 (Cozy Bear)',
    origin: 'Advanced Stealth Group',
    target: 'Government & Financial Nodes',
    ttps: ['Supply Chain Injection', 'Cloud Token Hijack', 'C2 Tunneling'],
    threatLevel: 'CRITICAL',
    glow: 'magenta' as const,
  },
  {
    name: 'Volt Typhoon',
    origin: 'Critical Infrastructure Cell',
    target: 'Telecom, Transport & Water SCADA',
    ttps: ['Living off the Land (LotL)', 'WMI Exploitation', 'Router Compromise'],
    threatLevel: 'ELEVATED',
    glow: 'violet' as const,
  },
  {
    name: 'Lazarus Group',
    origin: 'Financial Cyber Threat',
    target: 'SWIFT Banking & Crypto Vaults',
    ttps: ['Cross-Platform Malware', 'Phishing Attachment', 'Ransomware Deploy'],
    threatLevel: 'HIGH',
    glow: 'cyan' as const,
  },
];

export function ThreatIntel() {
  const { iocs } = useDefence();
  const [copiedIoc, setCopiedIoc] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const copyToClipboard = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedIoc(val);
    setTimeout(() => setCopiedIoc(null), 2000);
  };

  const filteredIocs = (iocs.length ? iocs : []).filter(
    (ioc) =>
      ioc.value.toLowerCase().includes(search.toLowerCase()) ||
      ioc.threat_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-purple-400 animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-purple-300">
              ADVERSARY FUSION CELL // THREAT FEEDS
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">
            Threat Intelligence & Adversary Fusion
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Real-time correlation of adversary TTPs, active MITRE ATT&CK killchain techniques, and IOC observables.
          </p>
        </div>
        <CyberBadge label="IOC FEEDS SYNCED" tone="acid" />
      </div>

      {/* Adversary Threat Actor Dossiers */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {adversaryDossiers.map((actor) => (
          <HoloCard key={actor.name} glowColor={actor.glow} className="p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-mono text-[10px] uppercase text-pink-400 font-bold">
                {actor.threatLevel}
              </span>
              <Flame size={15} className="text-pink-400" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold text-white">{actor.name}</h3>
            <p className="font-mono text-[10px] text-slate-400">{actor.origin}</p>

            <div className="mt-4 space-y-1 font-mono text-[11px]">
              <p className="text-slate-500 uppercase text-[9px]">Primary Target</p>
              <p className="text-cyan-200">{actor.target}</p>
            </div>

            <div className="mt-3">
              <p className="text-slate-500 uppercase font-mono text-[9px]">Observed TTPs</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {actor.ttps.map((ttp) => (
                  <span
                    key={ttp}
                    className="rounded bg-white/5 px-2 py-0.5 font-mono text-[9px] text-slate-300 border border-white/5"
                  >
                    {ttp}
                  </span>
                ))}
              </div>
            </div>
          </HoloCard>
        ))}
      </div>

      {/* Centerpiece Knowledge Graph */}
      <HoloCard glowColor="multi" className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PulseBeacon color="magenta" size="sm" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-purple-300">
                MITRE ATT&CK KNOWLEDGE GRAPH
              </p>
            </div>
            <h3 className="mt-1 font-display text-xl font-bold text-white">
              Actor → Attack Technique → Target Asset Mapping
            </h3>
          </div>
          <span className="font-mono text-xs text-slate-400">REAL-TIME MULTI-HOP GRAPH</span>
        </div>

        <KnowledgeGraph />
      </HoloCard>

      {/* Latest Threat Indicators (IOCs) Table */}
      <HoloCard glowColor="cyan" className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-white">
              Live Indicators of Compromise (IOCs)
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Cryptographic hashes, malicious IP relays, and C2 domain markers flagged across sovereign sectors.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Filter IOC value or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 py-2 pl-9 pr-4 font-mono text-xs text-white placeholder-slate-600 outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-white/10 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="pb-3">Indicator Value / Hash</th>
                <th className="pb-3">IOC Type</th>
                <th className="pb-3">Threat Category</th>
                <th className="pb-3">Targeted Asset</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredIocs.map((ioc) => (
                <tr key={ioc.value} className="hover:bg-white/5 transition">
                  <td className="py-3 text-cyan-300 font-bold">{ioc.value}</td>
                  <td className="py-3 text-purple-300">{ioc.ioc_type}</td>
                  <td className="py-3 text-pink-400">{ioc.threat_type}</td>
                  <td className="py-3 text-slate-300">{ioc.fetched_at ? new Date(ioc.fetched_at).toLocaleDateString() : 'Multi-Sector'}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => copyToClipboard(ioc.value)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-950/40 px-2.5 py-1 text-[10px] text-cyan-200 hover:bg-cyan-400/20"
                    >
                      {copiedIoc === ioc.value ? (
                        <>
                          <Check size={11} className="text-[#00ff9d]" /> COPIED
                        </>
                      ) : (
                        <>
                          <Copy size={11} /> COPY HASH
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HoloCard>
    </div>
  );
}
