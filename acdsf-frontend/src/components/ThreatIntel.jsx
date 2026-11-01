import { useState } from "react";
import { api } from "../api";

const SECTORS = ["Government", "Energy", "Finance", "Telecom", "Water", "Transport"];

export default function ThreatIntel() {
  const [sector, setSector] = useState("Government");
  const [paths, setPaths] = useState(null);
  const [actorName, setActorName] = useState("APT41");
  const [techniques, setTechniques] = useState(null);
  const [loading, setLoading] = useState(false);

  const queryPaths = async () => {
    setLoading(true);
    const result = await api.getAttackPaths(sector);
    setPaths(Array.isArray(result) ? result : []);
    setLoading(false);
  };

  const queryActor = async () => {
    setLoading(true);
    const result = await api.getActorTechniques(actorName);
    setTechniques(Array.isArray(result) ? result : []);
    setLoading(false);
  };

  return (
    <div className="section">
      <h2>Threat Intelligence — Real MITRE ATT&CK Knowledge Graph</h2>
      <p className="hint">Queries your live kg_api.py (localhost:8002), backed by real MITRE ATT&CK data.</p>

      <div className="control-row">
        <label>
          Sector:
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <button onClick={queryPaths} disabled={loading}>Get Attack Paths</button>
      </div>

      {paths && (
        <table className="data-table">
          <thead>
            <tr><th>Threat Actor</th><th>Technique</th><th>Tactic</th></tr>
          </thead>
          <tbody>
            {paths.length === 0 ? (
              <tr><td colSpan="3">No linked techniques for this sector yet - add assets via knowledge_graph.py</td></tr>
            ) : (
              paths.map((p, i) => (
                <tr key={i}>
                  <td>{p.actor}</td>
                  <td>{p.technique_id} {p.technique_name}</td>
                  <td>{p.tactic}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <div className="control-row" style={{ marginTop: "20px" }}>
        <label>
          Threat Actor:
          <input value={actorName} onChange={(e) => setActorName(e.target.value)} placeholder="e.g. APT41" />
        </label>
        <button onClick={queryActor} disabled={loading}>Get Techniques Used</button>
      </div>

      {techniques && (
        <table className="data-table">
          <thead><tr><th>ATT&CK ID</th><th>Technique Name</th></tr></thead>
          <tbody>
            {techniques.length === 0 ? (
              <tr><td colSpan="2">No techniques found for this actor name (check exact spelling from MITRE)</td></tr>
            ) : (
              techniques.map((t, i) => (
                <tr key={i}><td>{t.attack_id}</td><td>{t.name}</td></tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
