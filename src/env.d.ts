/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * URL van de Cloudflare Worker die de VMM-databank bevraagt.
   * Niet gezet tijdens ontwikkeling: dan bedient de dev-middleware
   * uit vite.config.ts hetzelfde pad.
   */
  readonly VITE_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
