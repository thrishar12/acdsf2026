import React from 'react';
import { Activity, AlertTriangle, ArrowUpRight, Cpu, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { useSimulationData } from '../hooks/useSimulationData';

const Metric = ({ icon: Icon, label, value, detail, tone }) => (
  <article className="metric-card">
    <div className={`metric-icon ${tone}`}><Icon size={18} /></div>
    <p>{label}</p>
    <strong>{value}</strong>
    <span>{detail}</span>
  </article>
);

function Dashboard() {
  const { twins, loading, error, lastUpdate, isOnline, fetchData, getStats, getNodesBySector } = useSimulationData();
  const stats = getStats();
  const sectors = getNodesBySector();
  const topNodes = [...twins].sort((a, b) => (b.cpu_load || 0) - (a.cpu_load || 0)).slice(0, 5);
  const recentNodes = twins.slice(0, 8);

  return (
    <div className="operator-dashboard">
      <header className="dashboard-topbar">
        <div>
          <p className="eyebrow">Command dashboard</p>
          <h1>Network posture</h1>
          <p className="dashboard-subtitle">A live operational view of your connected defence environment.</p>
        </div>
        <div className="dashboard-actions">
          <span className={isOnline ? 'connection-pill online' : 'connection-pill'}><i /> {isOnline ? 'API connected' : 'API offline'}</span>
          <span className="update-time">{lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Waiting for telemetry'}</span>
          <button className="refresh-control" onClick={fetchData} title="Refresh data"><RefreshCw size={16} /></button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="metric-grid">
          <Metric icon={Server} label="Monitored assets" value={stats.total} detail={`${Object.keys(sectors).length} sectors connected`} tone="teal" />
          <Metric icon={ShieldCheck} label="Secure posture" value={`${stats.total ? Math.round((stats.secure / stats.total) * 100) : 0}%`} detail={`${stats.secure} of ${stats.total} nodes secure`} tone="green" />
          <Metric icon={Cpu} label="Average CPU load" value={`${stats.avgCpu.toFixed(1)}%`} detail={stats.avgCpu > 70 ? 'Review elevated load' : 'Within normal range'} tone="slate" />
          <Metric icon={AlertTriangle} label="Open alerts" value={stats.totalAlerts} detail={stats.totalAlerts ? 'Response required' : 'No active incidents'} tone="amber" />
        </section>

        <section className="dashboard-grid">
          <article className="panel posture-panel">
            <div className="panel-title"><div><p className="eyebrow">Environment health</p><h2>All systems operational</h2></div><span className="panel-arrow"><ArrowUpRight size={17} /></span></div>
            <div className="posture-ring"><div><strong>{stats.total ? Math.round((stats.secure / stats.total) * 100) : 0}%</strong><span>secure</span></div></div>
            <div className="posture-copy"><span><i className="legend secure" /> Secure <strong>{stats.secure}</strong></span><span><i className="legend risk" /> At risk <strong>{stats.compromised}</strong></span></div>
            <div className="sector-bars">{Object.entries(sectors).slice(0, 4).map(([sector, nodes]) => { const safe = nodes.filter((node) => !node.is_compromised).length; return <div className="sector-bar" key={sector}><span>{sector}</span><div><i style={{ width: `${nodes.length ? (safe / nodes.length) * 100 : 0}%` }} /></div><strong>{safe}/{nodes.length}</strong></div>; })}</div>
          </article>

          <article className="panel activity-panel">
            <div className="panel-title"><div><p className="eyebrow">Resource watch</p><h2>Highest CPU usage</h2></div><Activity size={18} /></div>
            {topNodes.length ? topNodes.map((node) => <div className="resource-row" key={node.node_id}><span>{node.node_id}</span><div className="resource-track"><i style={{ width: `${Math.min(node.cpu_load || 0, 100)}%` }} /></div><strong>{node.cpu_load || 0}%</strong></div>) : <p className="empty-state">{loading ? 'Loading telemetry...' : 'No telemetry available.'}</p>}
          </article>
        </section>

        <section className="panel nodes-panel">
          <div className="panel-title"><div><p className="eyebrow">Live inventory</p><h2>Network nodes</h2></div><span className="node-count">{twins.length} assets</span></div>
          {error ? <div className="api-alert">Unable to fetch telemetry: {error}. Check the backend on port 3001.</div> : <div className="node-list-grid">{recentNodes.map((node) => <div className="node-row" key={node.node_id}><span className={node.is_compromised ? 'node-state compromised' : 'node-state'} /><div><strong>{node.node_id}</strong><small>{node.sector || 'Unassigned'}</small></div><span className="node-cpu">{node.cpu_load || 0}% CPU</span><span className={node.is_compromised ? 'status-text compromised-text' : 'status-text'}>{node.is_compromised ? 'Compromised' : 'Secure'}</span></div>)}</div>}
          {!error && twins.length > 8 && <p className="inventory-note">Showing 8 of {twins.length} assets. Use Network simulations for deeper controls.</p>}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
