import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Clock, Zap, Radio, AlertTriangle, CheckCircle2, Activity,
  Download, RefreshCw, ChevronRight, Shield, Target, Brain, Layers
} from 'lucide-react';
import { HoloCard } from '../components/ui/HoloCard';
import { CyberBadge } from '../components/ui/CyberBadge';
import { apiClient } from '../services/apiClient';

interface Incident {
  incident_id: string;
  attack_type?: string;
  source?: string;
  target?: string;
  status?: string;
  final_status?: string;
  severity?: string;
  risk_score?: number;
  risk_level?: string;
  confidence_score?: number;
  attack_started_at?: string;
  attack_detected_at?: string;
  attack_ended_at?: string;
  duration_seconds?: number;
  duration_formatted?: string;
  mitre_tactic?: string;
  mitre_technique_id?: string;
  mitre_technique_name?: string;
  key_indicators?: Record<string, number> | string;
  blue_team_response?: string;
  notification_status?: Record<string, string> | string;
  created_at?: string;
}

interface EvaluationData {
  dataset?: string;
  model?: string;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  total_predictions?: number;
  [key: string]: unknown;
}

function fmtTime(iso?: string): string {
  if (!iso) return 'N/A';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function fmtTimeShort(iso?: string): string {
  if (!iso) return 'N/A';
  try { return new Date(iso).toLocaleTimeString(); } catch { return iso; }
}

function severityClass(s?: string) {
  switch (s?.toUpperCase()) {
    case 'CRITICAL': return 'text-pink-400 border-pink-500/40 bg-pink-950/30';
    case 'HIGH': return 'text-orange-400 border-orange-500/40 bg-orange-950/30';
    case 'MEDIUM': return 'text-yellow-400 border-yellow-500/40 bg-yellow-950/30';
    default: return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30';
  }
}

function severityGlowClass(s?: string): string {
  switch (s?.toUpperCase()) {
    case 'CRITICAL': return 'shadow-[0_0_30px_rgba(236,72,153,0.25)]';
    case 'HIGH': return 'shadow-[0_0_30px_rgba(249,115,22,0.2)]';
    case 'MEDIUM': return 'shadow-[0_0_30px_rgba(234,179,8,0.15)]';
    default: return 'shadow-[0_0_30px_rgba(16,185,129,0.15)]';
  }
}

function statusClass(s?: string) {
  if (s?.includes('CONTAINED')) return 'text-emerald-400';
  if (s?.includes('STOPPED')) return 'text-slate-400';
  if (s === 'DETECTED') return 'text-pink-400';
  if (s === 'RESPONDING') return 'text-yellow-400';
  if (s === 'ACTIVE') return 'text-orange-400';
  return 'text-slate-400';
}

function notifIcon(status?: string): string {
  if (status === 'SENT') return '✓';
  if (status?.startsWith('SIMULATED')) return '✓';
  if (status?.startsWith('FAILED')) return '✗';
  return '○';
}

function notifClass(status?: string): string {
  if (status === 'SENT') return 'text-emerald-400';
  if (status?.startsWith('SIMULATED')) return 'text-cyan-400';
  if (status?.startsWith('FAILED')) return 'text-rose-400';
  return 'text-slate-500';
}

/* ——— HTML Report Generator ——— */
function generateReportHTML(incident: Incident, evaluation: EvaluationData | null, allIncidents: Incident[]): string {
  const now = new Date().toLocaleString();
  const notifStatus = (typeof incident.notification_status === 'object' ? incident.notification_status : {}) as Record<string, string>;
  const keyIndicators = (typeof incident.key_indicators === 'object' ? incident.key_indicators : {}) as Record<string, number>;

  const severityColor = (s?: string) => {
    switch (s?.toUpperCase()) {
      case 'CRITICAL': return '#ec4899';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#eab308';
      default: return '#10b981';
    }
  };

  const statusColor = (s?: string) => {
    if (s?.includes('CONTAINED')) return '#10b981';
    if (s?.includes('STOPPED')) return '#94a3b8';
    if (s === 'DETECTED') return '#ec4899';
    if (s === 'RESPONDING') return '#eab308';
    if (s === 'ACTIVE') return '#f97316';
    return '#94a3b8';
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ACDSF Attack Report — ${incident.incident_id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #07090e 0%, #0b1528 40%, #060e1d 100%);
      color: #e2e8f0;
      min-height: 100vh;
      padding: 40px;
    }
    
    .report-container {
      max-width: 900px;
      margin: 0 auto;
    }
    
    .report-header {
      text-align: center;
      padding: 40px 30px;
      border: 1px solid rgba(0, 245, 255, 0.3);
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(11,21,40,0.9), rgba(6,14,29,0.95));
      margin-bottom: 30px;
      position: relative;
      overflow: hidden;
    }
    
    .report-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #00f5ff, #a855f7, #ec4899, #00f5ff);
    }
    
    .report-header .logo { font-family: 'Inter', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: 0.3em; color: #00f5ff; text-shadow: 0 0 20px rgba(0,245,255,0.4); }
    .report-header .subtitle { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.25em; color: #64748b; margin-top: 6px; text-transform: uppercase; }
    .report-header .title { font-size: 22px; font-weight: 700; color: #fff; margin-top: 18px; }
    .report-header .meta { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #64748b; margin-top: 12px; }
    .report-header .meta span { color: #00f5ff; }
    
    .severity-banner {
      display: inline-block;
      padding: 6px 22px;
      border-radius: 100px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-top: 16px;
      border: 1px solid;
    }
    
    .section {
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      background: rgba(11,21,40,0.6);
      padding: 28px;
      margin-bottom: 24px;
      backdrop-filter: blur(10px);
    }
    
    .section-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #00f5ff;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(0,245,255,0.15);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-title::before {
      content: '◆';
      font-size: 8px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    
    .info-box {
      background: rgba(0,0,0,0.35);
      border-radius: 10px;
      padding: 14px 16px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    
    .info-box .label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
    }
    
    .info-box .value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 600;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(0,0,0,0.25);
      margin-bottom: 6px;
      font-size: 13px;
    }
    
    .detail-row .label { color: #94a3b8; font-size: 12px; }
    .detail-row .value { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 12px; }
    
    .indicator-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    
    .indicator-box {
      background: rgba(0,0,0,0.35);
      border-radius: 8px;
      padding: 10px 12px;
    }
    
    .indicator-box .name {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .indicator-box .val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      color: #00f5ff;
      margin-top: 4px;
    }
    
    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    
    .history-table th {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #64748b;
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .history-table td {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      color: #cbd5e1;
    }
    
    .history-table tr:hover td { background: rgba(0,245,255,0.03); }
    
    .eval-metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 14px;
      border-radius: 8px;
      background: rgba(0,0,0,0.25);
      margin-bottom: 6px;
    }
    
    .eval-metric .label { color: #94a3b8; font-size: 12px; }
    .eval-metric .value { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #a78bfa; font-size: 13px; }
    
    .eval-bar-container {
      flex: 1;
      margin: 0 16px;
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 100px;
      overflow: hidden;
    }
    
    .eval-bar {
      height: 100%;
      background: linear-gradient(90deg, #a78bfa, #7c3aed);
      border-radius: 100px;
    }
    
    .footer {
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #475569;
      padding: 30px 0;
      border-top: 1px solid rgba(255,255,255,0.06);
      margin-top: 20px;
    }
    
    .footer .brand { color: #00f5ff; font-weight: 700; }
    
    .notif-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 14px;
      border-radius: 8px;
      background: rgba(0,0,0,0.2);
      margin-bottom: 5px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }
    
    .notif-channel { color: #cbd5e1; text-transform: capitalize; }
    
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 100px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 700;
    }
    
    @media print {
      body { background: #07090e; padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Report Header -->
    <div class="report-header">
      <div class="logo">ACDSF</div>
      <div class="subtitle">Autonomous Cyber Defence Sovereign Fabric // Incident Report</div>
      <div class="title">Attack Incident Report — ${incident.attack_type || 'Unknown Attack'}</div>
      <div class="meta">
        Report Generated: <span>${now}</span> &nbsp;|&nbsp; Incident: <span>${incident.incident_id}</span>
      </div>
      <div class="severity-banner" style="color: ${severityColor(incident.severity)}; border-color: ${severityColor(incident.severity)}40; background: ${severityColor(incident.severity)}15;">
        ${incident.severity || 'UNKNOWN'} SEVERITY
      </div>
    </div>

    <!-- Executive Summary -->
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.7;">
        On <strong style="color: #e2e8f0;">${fmtTime(incident.attack_started_at)}</strong>, the ACDSF autonomous defence fabric detected a
        <strong style="color: ${severityColor(incident.severity)};">${(incident.severity || 'UNKNOWN').toUpperCase()}</strong> severity
        <strong style="color: #e2e8f0;">${incident.attack_type || 'Unknown'}</strong> attack originating from
        <strong style="color: #ec4899;">${incident.source || 'Red Team'}</strong> targeting
        <strong style="color: #a78bfa;">${incident.target || 'N/A'}</strong>.
        The AI detection engine identified this threat with a confidence score of <strong style="color: #10b981;">${incident.confidence_score || 0}%</strong>
        and assigned a risk score of <strong style="color: #f97316;">${incident.risk_score || 0}/100</strong>
        (${incident.risk_level || 'N/A'}).
        The incident${incident.duration_formatted ? ` lasted ${incident.duration_formatted}` : ''} and the final status is
        <strong style="color: ${statusColor(incident.final_status)};">${incident.final_status || incident.status || 'N/A'}</strong>.
        ${incident.blue_team_response ? `Blue Team response: <strong style="color: #10b981;">${incident.blue_team_response}</strong>.` : ''}
      </p>
    </div>

    <!-- Attack Timeline -->
    <div class="section">
      <div class="section-title">Attack Timeline</div>
      <div class="info-grid">
        <div class="info-box">
          <div class="label">⚡ Attack Started</div>
          <div class="value" style="color: #f472b6;">${fmtTime(incident.attack_started_at)}</div>
        </div>
        <div class="info-box">
          <div class="label">🔍 Detection Time</div>
          <div class="value" style="color: #facc15;">${fmtTime(incident.attack_detected_at)}</div>
        </div>
        <div class="info-box">
          <div class="label">✅ Attack Ended</div>
          <div class="value" style="color: #34d399;">${fmtTime(incident.attack_ended_at)}</div>
        </div>
        <div class="info-box">
          <div class="label">⏱ Duration</div>
          <div class="value" style="color: #fb923c;">${incident.duration_formatted || `${incident.duration_seconds || 0}s`}</div>
        </div>
      </div>
    </div>

    <!-- Incident Details -->
    <div class="section">
      <div class="section-title">Incident Details</div>
      <div class="detail-row">
        <span class="label">Incident ID</span>
        <span class="value" style="color: #22d3ee;">${incident.incident_id}</span>
      </div>
      <div class="detail-row">
        <span class="label">Attack Type</span>
        <span class="value" style="color: #fff;">${incident.attack_type || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="label">Source</span>
        <span class="value" style="color: #f472b6;">${incident.source || 'Red Team'}</span>
      </div>
      <div class="detail-row">
        <span class="label">Target</span>
        <span class="value" style="color: #c084fc;">${incident.target || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="label">Risk Score</span>
        <span class="value" style="color: #fb923c;">${incident.risk_score || 0}/100 (${incident.risk_level || 'N/A'})</span>
      </div>
      <div class="detail-row">
        <span class="label">AI Confidence</span>
        <span class="value" style="color: #34d399;">${incident.confidence_score || 0}%</span>
      </div>
      <div class="detail-row">
        <span class="label">Blue Team Response</span>
        <span class="value" style="color: #34d399;">${incident.blue_team_response || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="label">Final Status</span>
        <span class="value" style="color: ${statusColor(incident.final_status)}; font-weight: 800;">${incident.final_status || incident.status || 'N/A'}</span>
      </div>
    </div>

    <!-- MITRE ATT&CK Mapping -->
    <div class="section">
      <div class="section-title">MITRE ATT&CK Mapping</div>
      <div class="info-grid">
        <div class="info-box">
          <div class="label">Tactic</div>
          <div class="value" style="color: #22d3ee;">${incident.mitre_tactic || 'N/A'}</div>
        </div>
        <div class="info-box">
          <div class="label">Technique ID</div>
          <div class="value" style="color: #c084fc;">${incident.mitre_technique_id || 'N/A'}</div>
        </div>
      </div>
      <div style="margin-top: 14px;">
        <div class="detail-row">
          <span class="label">Technique Name</span>
          <span class="value" style="color: #c084fc;">${incident.mitre_technique_name || 'N/A'}</span>
        </div>
      </div>
    </div>

    <!-- Key Traffic Indicators -->
    ${Object.keys(keyIndicators).length > 0 ? `
    <div class="section">
      <div class="section-title">Key Traffic Indicators (CICIDS2017)</div>
      <div class="indicator-grid">
        ${Object.entries(keyIndicators).map(([k, v]) => `
        <div class="indicator-box">
          <div class="name">${k}</div>
          <div class="val">${typeof v === 'number' ? v.toFixed(2) : v}</div>
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Notification Logs -->
    <div class="section">
      <div class="section-title">Notification Logs</div>
      ${Object.keys(notifStatus).length > 0
        ? Object.entries(notifStatus).map(([channel, status]) => `
        <div class="notif-row">
          <span class="notif-channel">${channel.replace(/_/g, ' ')}</span>
          <span class="status-badge" style="color: ${status === 'SENT' || status.startsWith('SIMULATED') ? '#10b981' : status.startsWith('FAILED') ? '#f43f5e' : '#64748b'}; background: ${status === 'SENT' || status.startsWith('SIMULATED') ? 'rgba(16,185,129,0.12)' : status.startsWith('FAILED') ? 'rgba(244,63,94,0.12)' : 'rgba(100,116,139,0.12)'};">
            ${status}
          </span>
        </div>
        `).join('')
        : '<p style="color: #64748b; font-size: 12px;">No notifications recorded</p>'
      }
    </div>

    <!-- AI Model Evaluation -->
    ${evaluation ? `
    <div class="section">
      <div class="section-title">AI Model Evaluation</div>
      <p style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #64748b; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.1em;">
        ${evaluation.dataset || 'N/A'} / ${evaluation.model || 'N/A'}
      </p>
      ${[
        ['Accuracy', evaluation.accuracy],
        ['Precision', evaluation.precision],
        ['Recall', evaluation.recall],
        ['F1-Score', evaluation.f1_score],
      ].map(([label, value]) => `
      <div class="eval-metric">
        <span class="label" style="min-width: 90px;">${label}</span>
        <div class="eval-bar-container">
          <div class="eval-bar" style="width: ${value || 0}%;"></div>
        </div>
        <span class="value">${value || 0}%</span>
      </div>
      `).join('')}
      <div class="eval-metric" style="margin-top: 4px;">
        <span class="label">Total Predictions</span>
        <span class="value">${evaluation.total_predictions || 'N/A'}</span>
      </div>
    </div>
    ` : ''}

    <!-- Attack History Summary -->
    ${allIncidents.length > 0 ? `
    <div class="section">
      <div class="section-title">Full Attack History (${allIncidents.length} incidents)</div>
      <table class="history-table">
        <thead>
          <tr>
            <th>Incident ID</th>
            <th>Attack Type</th>
            <th>Target</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${allIncidents.map(inc => `
          <tr>
            <td style="color: #22d3ee;">${inc.incident_id}</td>
            <td>${inc.attack_type || 'N/A'}</td>
            <td>${inc.target || 'N/A'}</td>
            <td><span style="color: ${severityColor(inc.severity)}; font-weight: 700;">${inc.severity || 'N/A'}</span></td>
            <td><span style="color: ${statusColor(inc.final_status || inc.status)};">${inc.final_status || inc.status || 'N/A'}</span></td>
            <td style="color: #64748b;">${fmtTime(inc.created_at)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>This report was auto-generated by the <span class="brand">ACDSF</span> (Autonomous Cyber Defence Sovereign Fabric)</p>
      <p style="margin-top: 6px;">Generated on ${now} &nbsp;|&nbsp; Classification: INTERNAL &nbsp;|&nbsp; Report ID: RPT-${incident.incident_id}</p>
      <p style="margin-top: 12px; color: #334155;">© ${new Date().getFullYear()} ACDSF Sovereign Defence Platform. All data sourced from live telemetry.</p>
    </div>
  </div>
</body>
</html>`;
}

/* ——— PDF Download helper ——— */
async function downloadReport(incident: Incident, evaluation: EvaluationData | null, allIncidents: Incident[]) {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const html = generateReportHTML(incident, evaluation, allIncidents);

  // Mount a hidden iframe so the report CSS renders correctly
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:960px;height:1px;border:none;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow!.document;
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for fonts + images inside the iframe
  await new Promise<void>(resolve => {
    const onLoad = () => resolve();
    if (iframe.contentDocument?.readyState === 'complete') {
      setTimeout(resolve, 800);
    } else {
      iframe.addEventListener('load', onLoad, { once: true });
      setTimeout(resolve, 2500); // safety timeout
    }
  });
  await new Promise(r => setTimeout(r, 600)); // extra paint settle

  const reportEl = iframeDoc.querySelector('.report-container') as HTMLElement | null;
  if (!reportEl) { document.body.removeChild(iframe); return; }

  // Resize iframe height to content
  iframe.style.height = reportEl.scrollHeight + 'px';
  await new Promise(r => setTimeout(r, 200));

  const canvas = await html2canvas(reportEl, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#07090e',
    width: reportEl.scrollWidth,
    height: reportEl.scrollHeight,
    windowWidth: 960,
    logging: false,
  });

  document.body.removeChild(iframe);

  const A4_W = 210; // mm
  const A4_H = 297; // mm
  const PDF_DPI = 96;
  const MM_PER_PX = 25.4 / PDF_DPI;

  const imgWidthMm = A4_W;
  const pxToMm = imgWidthMm / canvas.width;
  const imgHeightMm = canvas.height * pxToMm;

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const totalPages = Math.ceil(imgHeightMm / A4_H);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    const srcY = page * A4_H / pxToMm;          // px offset in canvas
    const sliceHeightPx = Math.min(A4_H / pxToMm, canvas.height - srcY);

    // Slice the canvas into a per-page sub-canvas
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceHeightPx;
    const ctx = slice.getContext('2d')!;
    ctx.drawImage(canvas, 0, srcY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    const sliceDataUrl = slice.toDataURL('image/jpeg', 0.92);
    const sliceHeightMm = sliceHeightPx * pxToMm;
    pdf.addImage(sliceDataUrl, 'JPEG', 0, 0, imgWidthMm, sliceHeightMm);

    // Page number footer
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      `ACDSF Incident Report — ${incident.incident_id}   |   Page ${page + 1} of ${totalPages}   |   INTERNAL`,
      A4_W / 2, A4_H - 4,
      { align: 'center' }
    );
  }

  pdf.save(`ACDSF_Attack_Report_${incident.incident_id}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ——— Component ——— */
export function AttackReport() {
  const [report, setReport] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    const [lastRes, histRes, evalRes] = await Promise.all([
      apiClient.getLastReport(),
      apiClient.getIncidents(),
      apiClient.getAiEvaluation(),
    ]);

    if (lastRes.ok && lastRes.data) setReport(lastRes.data as Incident);
    if (histRes.ok && Array.isArray(histRes.data)) setHistory(histRes.data as Incident[]);
    if (evalRes.ok && evalRes.data) setEvaluation(evalRes.data as EvaluationData);
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const loadIncident = async (id: string) => {
    setSelectedId(id);
    const res = await apiClient.getIncident(id);
    if (res.ok && res.data) setSelectedIncident(res.data as Incident);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleDownload = async () => {
    if (!displayReport) return;
    setDownloading(true);
    try {
      await downloadReport(displayReport, evaluation, history);
    } finally {
      setDownloading(false);
    }
  };

  const displayReport = selectedIncident || report;
  const notifStatus = (typeof displayReport?.notification_status === 'object'
    ? displayReport?.notification_status
    : {}) as Record<string, string>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[#00f5ff] animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00f5ff]">
              INCIDENT REPORT // FULL LIFECYCLE RECORD
            </p>
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">Attack Report</h2>
          <p className="font-mono text-[10px] text-slate-500 mt-1">
            Last refreshed: {lastRefresh.toLocaleTimeString()} • Auto-refresh every 3s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="group flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-slate-300 transition-all duration-200 hover:border-cyan-400/50 hover:text-cyan-300 hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] disabled:opacity-50"
          >
            <RefreshCw size={14} className={`transition-transform duration-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-90'}`} />
            {refreshing ? 'REFRESHING...' : 'REFRESH'}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={!displayReport || downloading}
            className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-emerald-300 transition-all duration-300 hover:border-emerald-400/70 hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:from-emerald-950/80 hover:to-emerald-900/60 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {/* Animated shimmer */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <Download size={15} className={`relative z-10 transition-transform duration-300 ${downloading ? 'animate-bounce' : 'group-hover:-translate-y-0.5'}`} />
            <span className="relative z-10">{downloading ? 'GENERATING PDF...' : 'DOWNLOAD PDF'}</span>
          </button>

          <CyberBadge label={report ? 'REPORT AVAILABLE' : 'AWAITING ATTACK'} tone={report ? 'acid' : 'cyan'} />
        </div>
      </div>

      {loading && (
        <HoloCard glowColor="cyan" className="p-8 text-center">
          <p className="font-mono text-sm text-slate-400 animate-pulse">Loading incident data...</p>
        </HoloCard>
      )}

      {!loading && !displayReport && (
        <HoloCard glowColor="cyan" className="p-8 text-center">
          <AlertTriangle size={32} className="mx-auto text-slate-600 mb-4" />
          <p className="font-mono text-sm text-slate-400">No completed incidents yet.</p>
          <p className="font-mono text-xs text-slate-600 mt-1">Run an attack from the Live Simulation page to generate a report.</p>
        </HoloCard>
      )}

      {displayReport && (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          {/* Main Report Card */}
          <div className="space-y-6">
            {/* Summary Card */}
            <HoloCard glowColor="multi" className={`p-6 ${severityGlowClass(displayReport.severity)}`}>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {selectedIncident ? `INCIDENT ${selectedIncident.incident_id}` : 'LAST ATTACK REPORT'}
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-bold text-white">{displayReport.attack_type || 'N/A'}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase ${severityClass(displayReport.severity)}`}>
                    {displayReport.severity || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Incident ID Banner */}
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-3 mb-4">
                <p className="font-mono text-[10px] uppercase text-slate-500">Incident ID</p>
                <p className="font-mono text-lg font-bold text-cyan-300 mt-0.5">{displayReport.incident_id}</p>
              </div>

              {/* Timeline Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-black/40 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock size={11} className="text-pink-400" />
                    <p className="font-mono text-[10px] uppercase text-slate-500">Attack Start</p>
                  </div>
                  <p className="font-mono text-xs text-pink-300 font-bold">{fmtTime(displayReport.attack_started_at)}</p>
                </div>
                <div className="rounded-lg bg-black/40 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={11} className="text-yellow-400" />
                    <p className="font-mono text-[10px] uppercase text-slate-500">Detection Time</p>
                  </div>
                  <p className="font-mono text-xs text-yellow-300 font-bold">{fmtTime(displayReport.attack_detected_at)}</p>
                </div>
                <div className="rounded-lg bg-black/40 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 size={11} className="text-emerald-400" />
                    <p className="font-mono text-[10px] uppercase text-slate-500">Attack End</p>
                  </div>
                  <p className="font-mono text-xs text-emerald-300 font-bold">{fmtTime(displayReport.attack_ended_at)}</p>
                </div>
                <div className="rounded-lg bg-black/40 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Activity size={11} className="text-orange-400" />
                    <p className="font-mono text-[10px] uppercase text-slate-500">Duration</p>
                  </div>
                  <p className="font-mono text-xs text-orange-300 font-bold">
                    {displayReport.duration_formatted || `${displayReport.duration_seconds || 0}s`}
                  </p>
                </div>
              </div>

              {/* Details Table */}
              <div className="space-y-2 font-mono text-xs">
                {[
                  ['Source', displayReport.source || 'Red Team', 'text-pink-300'],
                  ['Target', displayReport.target || 'N/A', 'text-purple-300'],
                  ['Risk Score', `${displayReport.risk_score || 0}/100 (${displayReport.risk_level || 'N/A'})`, 'text-orange-300'],
                  ['AI Confidence', `${displayReport.confidence_score || 0}%`, 'text-emerald-300'],
                  ['MITRE Tactic', displayReport.mitre_tactic || 'N/A', 'text-cyan-300'],
                  ['MITRE Technique', `${displayReport.mitre_technique_id || ''} — ${displayReport.mitre_technique_name || 'N/A'}`, 'text-purple-300'],
                  ['Blue Team Response', displayReport.blue_team_response || 'N/A', 'text-emerald-300'],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
                    <span className="text-slate-400">{label}</span>
                    <span className={color}>{value}</span>
                  </div>
                ))}

                {/* Final Status */}
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                  <span className="text-slate-400">Final Status</span>
                  <span className={`font-bold ${statusClass(displayReport.final_status)}`}>
                    {displayReport.final_status || displayReport.status || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Key Traffic Indicators */}
              {displayReport.key_indicators && typeof displayReport.key_indicators === 'object' && (
                <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-950/10 p-4">
                  <p className="font-mono text-[10px] uppercase text-cyan-400 mb-3">Key Traffic Indicators (CICIDS2017)</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(displayReport.key_indicators as Record<string, number>).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-black/40 px-2.5 py-1.5">
                        <p className="font-mono text-[9px] text-slate-500 truncate">{k}</p>
                        <p className="font-mono text-xs font-bold text-[#00f5ff]">{typeof v === 'number' ? v.toFixed(2) : v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notifications */}
              <div className="mt-4 rounded-xl border border-purple-400/20 bg-purple-950/10 p-4">
                <p className="font-mono text-[10px] uppercase text-purple-400 mb-3">Notification Logs</p>
                <div className="space-y-2">
                  {Object.keys(notifStatus).length > 0 ? (
                    Object.entries(notifStatus).map(([channel, status]) => (
                      <div key={channel} className="flex items-center justify-between font-mono text-xs">
                        <span className="capitalize text-slate-300">{channel.replace(/_/g, ' ')}</span>
                        <span className={`font-bold ${notifClass(status)}`}>
                          {notifIcon(status)} {status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="font-mono text-xs text-slate-500">No notifications recorded</p>
                  )}
                </div>
              </div>
            </HoloCard>

            {/* Download CTA Card */}
            <HoloCard glowColor="acid" className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-950/40">
                    <FileText size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-mono text-xs font-bold text-white">Download Complete Report</p>
                    <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                      Full HTML report with all live data • {history.length} incidents • Generated in real-time
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="group flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-emerald-300 transition-all duration-300 hover:border-emerald-400/70 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:from-emerald-600/30 hover:to-emerald-500/20 disabled:opacity-40"
                >
                  <Download size={14} className={downloading ? 'animate-bounce' : 'group-hover:-translate-y-0.5 transition-transform'} />
                  <span>{downloading ? 'GENERATING...' : 'DOWNLOAD'}</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </HoloCard>
          </div>

          {/* Right Panel: History + AI Evaluation */}
          <div className="space-y-4">
            {/* AI Evaluation */}
            {evaluation && (
              <HoloCard glowColor="violet" className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={16} className="text-purple-400" />
                  <h4 className="font-mono text-xs font-bold uppercase text-white">AI Model Evaluation</h4>
                </div>
                <p className="font-mono text-[9px] text-slate-500 mb-3 uppercase">{evaluation.dataset as string} / {evaluation.model as string}</p>
                <div className="space-y-2">
                  {[
                    ['Accuracy', `${evaluation.accuracy}%`],
                    ['Precision', `${evaluation.precision}%`],
                    ['Recall', `${evaluation.recall}%`],
                    ['F1-Score', `${evaluation.f1_score}%`],
                    ['Total Predictions', String(evaluation.total_predictions)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between font-mono text-xs">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-purple-300 font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </HoloCard>
            )}

            {/* Quick Stats */}
            <HoloCard glowColor="magenta" className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Layers size={16} className="text-pink-400" />
                <h4 className="font-mono text-xs font-bold uppercase text-white">Report Stats</h4>
              </div>
              <div className="space-y-2">
                {[
                  ['Total Incidents', String(history.length), 'text-cyan-300'],
                  ['Current Report', displayReport.incident_id, 'text-emerald-300'],
                  ['Report Type', 'Live / Real-time', 'text-purple-300'],
                  ['Data Source', 'Backend API', 'text-orange-300'],
                  ['Last Updated', fmtTimeShort(lastRefresh.toISOString()), 'text-pink-300'],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex justify-between font-mono text-xs">
                    <span className="text-slate-400">{label}</span>
                    <span className={`font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </HoloCard>

            {/* Attack History */}
            <HoloCard glowColor="cyan" className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Radio size={16} className="text-cyan-400" />
                <h4 className="font-mono text-xs font-bold uppercase text-white">Attack History</h4>
                <span className="ml-auto font-mono text-[10px] text-slate-500">{history.length} TOTAL</span>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {history.length === 0 && (
                  <p className="font-mono text-xs text-slate-500 text-center py-4">No incidents recorded</p>
                )}
                {history.map((inc) => (
                  <button
                    key={inc.incident_id}
                    onClick={() => loadIncident(inc.incident_id)}
                    className={`w-full rounded-xl border p-3 text-left font-mono text-xs transition hover:border-cyan-400/40 ${
                      selectedId === inc.incident_id
                        ? 'border-cyan-400/60 bg-cyan-950/40'
                        : 'border-white/5 bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-cyan-300 text-[10px]">{inc.incident_id}</p>
                        <p className="text-white truncate mt-0.5">{inc.attack_type}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">{inc.target}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${severityClass(inc.severity)}`}>
                          {inc.severity}
                        </span>
                        <p className={`text-[10px] font-bold mt-1 ${statusClass(inc.final_status || inc.status)}`}>
                          {(inc.final_status || inc.status || '').slice(0, 12)}...
                        </p>
                      </div>
                    </div>
                    <p className="text-slate-600 text-[9px] mt-1.5">{fmtTime(inc.created_at)}</p>
                  </button>
                ))}
              </div>
            </HoloCard>
          </div>
        </div>
      )}
    </div>
  );
}
