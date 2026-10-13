import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf-8")
) as { version: string };

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Keeps file watching working inside Docker on Windows/macOS bind mounts.
  const usePolling = env.CHOKIDAR_USEPOLLING === "true";

  return {
    base: env.VITE_BASE || "/",
    plugins: [react()],
    define: {
      // Replaces the old CRA `REACT_APP_VERSION=$npm_package_version` trick:
      // Vite does not shell-expand variables inside .env files.
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: [
        // Node built-ins referenced by browser-targeted dependencies.
        // CRA's webpack 4 setup polyfilled these automatically; Vite does not.
        // `events` is used directly by the keyboard/session emitters and by
        // tiny-typed-emitter; `path` is pulled in by react-markdown 4's
        // vfile/replace-ext chain. `events/events.js` is spelled out so the
        // specifier no longer matches the Node built-in name.
        { find: /^events$/, replacement: "events/events.js" },
        { find: /^path$/, replacement: "path-browserify" },
      ],
    },
    // CRA loaded unknown binary extensions through file-loader; Vite only
    // treats them as assets when they are listed here.
    assetsInclude: ["**/*.glb", "**/*.dds", "**/*.bin"],
    server: {
      host: true,
      port: 3000,
      strictPort: false,
      watch: usePolling ? { usePolling: true } : undefined,
    },
    preview: {
      host: true,
      port: 3000,
    },
    build: {
      // Keep CRA's output directory name so Docker/CI/deploy configs keep working.
      outDir: "build",
      emptyOutDir: true,
      sourcemap: true,
      target: "es2020",
      // Babylon.js + TensorFlow.js make this bundle inherently large.
      chunkSizeWarningLimit: 8000,
    },
    // Allows Rollup to code-split the Comlink database worker if needed.
    worker: {
      format: "es",
    },
  };
});
