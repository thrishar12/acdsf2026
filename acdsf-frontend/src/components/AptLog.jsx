import { useEffect, useState } from "react";
import { api } from "../api";

export default function AptLog() {
  const [log, setLog] = useState(null);

  useEffect(() => {
    api.getAptLog().then((data) => setLog(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div className="section">
      <h2>APT Campaign Log — MITRE ATT&CK Mapped</h2>
      {!log ? (
        <p>Loading...</p>
      ) : log.length === 0 ? (
        <p className="hint">apt_campaign_log.json not found in public/. Copy it from your member2 folder, or run apt_campaign.py --run first.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Stage</th><th>Name</th><th>ATT&CK ID</th><th>Technique</th><th>Result</th></tr>
          </thead>
          <tbody>
            {log.map((entry, i) => (
              <tr key={i}>
                <td>{entry.stage}</td>
                <td>{entry.name}</td>
                <td>{entry.attack_id}</td>
                <td>{entry.technique_name}</td>
                <td>
                  <span className={`badge ${entry.result?.includes("success") ? "badge-success" : "badge-neutral"}`}>
                    {entry.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
