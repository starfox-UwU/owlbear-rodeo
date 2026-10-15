/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

/**
 * Build-time global injected by `define` in vite.config.ts.
 * Mirrors the version field of package.json.
 */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Broker (backend) base URL, e.g. `http://localhost:9000`. */
  readonly VITE_BROKER_URL?: string;
  /** Set to `"true"` to put the client into maintenance/offline mode. */
  readonly VITE_MAINTENANCE?: string;
  /** Optional deploy base path, defaults to `/`. */
  readonly VITE_BASE?: string;
  /** Vite 内置：开发模式为 true，生产构建为 false。 */
  readonly DEV: boolean;
  /** Vite 内置：当前模式，例如 `development` / `production`。 */
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
