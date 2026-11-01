/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_METRICS_URL?: string;
  readonly VITE_SDN_URL?: string;
  readonly VITE_KG_URL?: string;
  readonly VITE_TTP_URL?: string;
  readonly VITE_SOAR_URL?: string;
  readonly VITE_THREAT_INTEL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
