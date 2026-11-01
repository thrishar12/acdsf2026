import { useEffect, useState } from "react";
import { api } from "../api";

export default function TopologyView() {
  const [twins, setTwins] = useState([]);

  useEffect(() => {
    const load = () => api.getAllTwins().then((data) => Array.isArray(data) && setTwins(data));
    load();
    const interval = setInterval(load, 5000); // live refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const compromised = twins.filter((t) => t.is_compromised);
  const bySector = twins.reduce((acc, t) => {
    acc[t.sector] = acc[t.sector] || [];
    acc[t.sector].push(t);
    return acc;
  }, {});

  return (
    <div className="section">
      <h2>Network Topology</h2>
      <img src="/topology.png" alt="Network topology" className="topology-img" />

      <h3>Live Node Status ({twins.length} nodes, {compromised.length} compromised)</h3>
      {twins.length === 0 ? (
        <p className="hint">No data - copy digital_twin.py's twins into public/, or check it's running on localhost:5000.</p>
      ) : (
        <div className="sector-grid">
          {Object.entries(bySector).map(([sector, nodes]) => (
            <div key={sector} className="sector-card">
              <h4>{sector}</h4>
              <div className="node-list">
                {nodes.map((n) => (
                  <span
                    key={n.node_id}
                    className={`node-pill ${n.is_compromised ? "compromised" : "healthy"}`}
                    title={`${n.node_type} - alerts: ${n.alert_count}`}
                  >
                    {n.node_id}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
