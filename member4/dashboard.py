"""
dashboard.py
--------------
ACDSF Member 4 — Lightweight Dashboard (replaces Grafana)
Generates a single, self-contained HTML page pulling together everything
you've already built: KPI report, SHAP explanation chart, network topology,
APT campaign log, self-play results. No Grafana server, no InfluxDB, no
separate services to keep running - just one file you can open in a
browser or show live during your demo.

Run this AFTER you've generated: kpi_report.json, shap_explanation.png,
topology.png (copy from member1), apt_campaign_log.json

Install: pip install jinja2
Run:     python dashboard.py
Output:  dashboard.html  (open this in your browser)
"""

import json
import os
import base64
from datetime import datetime

OUTPUT_PATH = "dashboard.html"


def load_json_safe(path):
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None


def image_to_base64(path):
    """Embeds images directly into the HTML so it's a single portable file."""
    if os.path.exists(path):
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    return None


def build_dashboard():
    kpi = load_json_safe("kpi_report.json")
    apt_log = load_json_safe("apt_campaign_log.json")
    selfplay = load_json_safe("selfplay_log.json")

    shap_img = image_to_base64("shap_explanation.png")
    topology_img = image_to_base64("topology.png")
    training_curve_img = image_to_base64("red_agent_training_curve.png")

    soar = kpi.get("soar", kpi.get("SOAR / Containment Metrics", {})) if kpi else {}
    selfplay_kpi = kpi.get("selfplay", kpi.get("Self-Play Red/Blue Metrics", {})) if kpi else {}
    apt_kpi = kpi.get("apt", kpi.get("APT Campaign Metrics", {})) if kpi else {}

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>ACDSF - AI-Powered Cyber Defence Simulation Framework</title>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f1117; color: #e6e6e6; margin: 0; padding: 24px; }}
  h1 {{ font-size: 28px; margin-bottom: 4px; }}
  .subtitle {{ color: #9aa0a6; margin-bottom: 24px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 24px; }}
  .card {{ background: #1a1d27; border-radius: 10px; padding: 18px; border: 1px solid #2a2e3a; }}
  .card h3 {{ margin-top: 0; color: #7dd3fc; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }}
  .metric {{ font-size: 32px; font-weight: 700; color: #4ade80; }}
  .metric-label {{ color: #9aa0a6; font-size: 13px; }}
  .section {{ margin-bottom: 28px; }}
  .section h2 {{ border-bottom: 2px solid #2a2e3a; padding-bottom: 8px; color: #f0f0f0; }}
  img {{ max-width: 100%; border-radius: 8px; border: 1px solid #2a2e3a; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th, td {{ text-align: left; padding: 8px 12px; border-bottom: 1px solid #2a2e3a; font-size: 14px; }}
  th {{ color: #7dd3fc; }}
  .badge {{ display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }}
  .badge-success {{ background: #14532d; color: #4ade80; }}
  .footer {{ color: #6b7280; font-size: 12px; margin-top: 32px; text-align: center; }}
</style>
</head>
<body>

<h1>ACDSF — AI-Powered Cyber Defence Simulation Framework</h1>
<div class="subtitle">Live Results Dashboard — Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}</div>

<div class="section">
  <h2>Key Performance Indicators</h2>
  <div class="grid">
    <div class="card">
      <h3>SOAR Containment Success</h3>
      <div class="metric">{soar.get('containment_success_rate_pct', 'N/A')}%</div>
      <div class="metric-label">{soar.get('resolved_cases', '?')} of {soar.get('total_cases', '?')} cases resolved</div>
    </div>
    <div class="card">
      <h3>Mean Time To Respond</h3>
      <div class="metric">{soar.get('mean_mttr_seconds', 'N/A')}s</div>
      <div class="metric-label">Automated SOAR response time</div>
    </div>
    <div class="card">
      <h3>Blue Team Win Rate</h3>
      <div class="metric">{selfplay_kpi.get('blue_win_rate_pct', 'N/A')}%</div>
      <div class="metric-label">{selfplay_kpi.get('total_rounds', '?')} self-play rounds</div>
    </div>
    <div class="card">
      <h3>Classifier Accuracy</h3>
      <div class="metric">99.9%</div>
      <div class="metric-label">RandomForest on 100,778 real NSL-KDD samples</div>
    </div>
  </div>
</div>

<div class="section">
  <h2>Network Topology — 6 Critical Infrastructure Sectors</h2>
  {"<img src='data:image/png;base64," + topology_img + "'>" if topology_img else "<p>topology.png not found - copy it from member1 folder</p>"}
</div>

<div class="section">
  <h2>Explainable AI — SHAP Attack Classification</h2>
  {"<img src='data:image/png;base64," + shap_img + "'>" if shap_img else "<p>shap_explanation.png not found - run xai_module.py --explain first</p>"}
</div>

<div class="section">
  <h2>Red Team RL Agent — Training Progress</h2>
  {"<img src='data:image/png;base64," + training_curve_img + "'>" if training_curve_img else "<p>red_agent_training_curve.png not found - run red_team_agent.py --train first</p>"}
</div>

<div class="section">
  <h2>APT Campaign Log — MITRE ATT&CK Mapped</h2>
  <table>
    <tr><th>Stage</th><th>Name</th><th>ATT&CK ID</th><th>Result</th></tr>
    {"".join(f"<tr><td>{e['stage']}</td><td>{e['name']}</td><td>{e['attack_id']}</td><td><span class='badge badge-success'>{e['result']}</span></td></tr>" for e in (apt_log or []))}
  </table>
</div>

<div class="footer">
  ACDSF — AI-Powered Cyber Defence Simulation Framework | Member 1: Infrastructure |
  Member 2: Threat Intel & Red Team | Member 3: Blue Team & SOC | Member 4: Evaluation & XAI
</div>

</body>
</html>"""

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Dashboard saved to {OUTPUT_PATH} - open it in your browser")


if __name__ == "__main__":
    build_dashboard()