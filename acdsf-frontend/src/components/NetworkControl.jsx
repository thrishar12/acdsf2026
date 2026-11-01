import { useEffect, useState } from "react";
import { api } from "../api";

export default function NetworkControl() {
  const [nodes, setNodes] = useState([]);
  const [target, setTarget] = useState("ENER-SRV1");
  const [source, setSource] = useState("GOVE-PC1");
  const [pathResult, setPathResult] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getTopology().then((data) => {
      if (data.nodes) {
        setNodes(data.nodes.map((n) => n.id).sort());
      }
    });
  }, []);

  const log = (msg) => setActionLog((prev) => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 8));

  const checkPath = async () => {
    setLoading(true);
    const result = await api.getPath(source, target);
    setPathResult(result);
    log(`Checked path ${source} -> ${target}: reachable=${result.reachable}`);
    setLoading(false);
  };

  const blockHost = async () => {
    setLoading(true);
    const result = await api.blockHost(target);
    log(`Blocked ${target}: ${result.edges_removed ?? 0} edges removed`);
    await checkPath();
    setLoading(false);
  };

  const restoreHost = async () => {
    setLoading(true);
    const result = await api.restoreHost(target);
    log(`Restored ${target}: ${result?.edges_restored ?? result?.status ?? 'done'}`);
    await checkPath();
    setLoading(false);
  };

  return (
    <div className="section">
      <h2>Live SDN Network Control</h2>
      <p className="hint">
        This calls your real sdn_controller.py running on localhost:8000 -
        blocking here actually removes edges from the live topology graph.
      </p>

      <div className="control-row">
        <label>
          Source:
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {nodes.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Target:
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {nodes.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button onClick={checkPath} disabled={loading}>Check Path</button>
        <button onClick={blockHost} disabled={loading} className="btn-danger">Block Host</button>
        <button onClick={restoreHost} disabled={loading} className="btn-success">Restore Host</button>
      </div>

      {pathResult && (
        <div className={`path-result ${pathResult.reachable ? "reachable" : "blocked"}`}>
          {pathResult.reachable
            ? `Reachable - latency ${pathResult.latency_ms}ms, path: ${pathResult.path?.join(" -> ")}`
            : `NOT reachable - ${pathResult.reason || "host may be blocked"}`}
        </div>
      )}

      <div className="action-log">
        {actionLog.map((entry, i) => (
          <div key={i} className="log-line">
            <span className="log-time">{entry.time}</span> {entry.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
