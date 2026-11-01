import { useEffect, useState } from "react";
import { api } from "../api";

export default function KpiCards() {
  const [kpi, setKpi] = useState(null);

  useEffect(() => {
    api.getKpiReport().then(setKpi);
  }, []);

  if (!kpi) return <div className="card">Loading KPIs...</div>;
  if (kpi.error) {
    return (
      <div className="card warning">
        kpi_report.json not found in public/ folder. Copy it from your
        member4 folder into frontend/public/.
      </div>
    );
  }

  const soar = kpi.soar || {};
  const selfplay = kpi.selfplay || {};

  const cards = [
    {
      label: "SOAR Containment Success",
      value: `${soar.containment_success_rate_pct ?? "N/A"}%`,
      sub: `${soar.resolved_cases ?? "?"} of ${soar.total_cases ?? "?"} cases`,
    },
    {
      label: "Mean Time To Respond",
      value: `${soar.mean_mttr_seconds ?? "N/A"}s`,
      sub: "Automated SOAR response",
    },
    {
      label: "Blue Team Win Rate",
      value: `${selfplay.blue_win_rate_pct ?? "N/A"}%`,
      sub: `${selfplay.total_rounds ?? "?"} self-play rounds`,
    },
    {
      label: "Classifier Accuracy",
      value: "99.9%",
      sub: "RandomForest, real NSL-KDD data",
    },
  ];

  return (
    <div className="grid">
      {cards.map((c) => (
        <div className="card" key={c.label}>
          <h3>{c.label}</h3>
          <div className="metric">{c.value}</div>
          <div className="metric-label">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
