// src/api.js
// -----------------------------------------------------------------------
// Talks to your live backend. Once deployed to PythonAnywhere, change
// BACKEND_URL below to your real URL, e.g.:
//   const BACKEND_URL = "https://yourusername.pythonanywhere.com";
// Until then, it defaults to localhost for local testing.
// -----------------------------------------------------------------------

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:3001";

async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { error: err.message, offline: true };
  }
}

export const api = {
  // Digital twin
  getAllTwins: () => safeFetch(`${BACKEND_URL}/twins`),
  getTwin: (nodeId) => safeFetch(`${BACKEND_URL}/twins/${nodeId}`),

  // SDN controller (Corrected paths to match Flask routes)
  getTopology: () => safeFetch(`${BACKEND_URL}/sdn/topology`),
  blockHost: (nodeId) =>
    safeFetch(`${BACKEND_URL}/block-host`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ node_id: nodeId }),
    }),
  restoreHost: (nodeId) =>
    safeFetch(`${BACKEND_URL}/restore-host`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ node_id: nodeId }),
    }),
  getPath: (src, dst) =>
    safeFetch(`${BACKEND_URL}/path?src=${src}&dst=${dst}`),

  // Knowledge graph
  getAttackPaths: (sector) => safeFetch(`${BACKEND_URL}/kg/attack-paths/${sector}`),
  getAssetRisk: (hostname) => safeFetch(`${BACKEND_URL}/kg/asset-risk/${hostname}`),
  getActorTechniques: (name) => safeFetch(`${BACKEND_URL}/kg/actor/${name}/techniques`),

  // Static files - stay in public/ folder, served by Vercel/Netlify directly
  getKpiReport: () => safeFetch(`/kpi_report.json`),
  getAptLog: () => safeFetch(`/apt_campaign_log.json`),
};