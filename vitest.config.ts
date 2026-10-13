import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf-8")
) as { version: string };

export default defineConfig({
  plugins: [react()],
  // TensorFlow 权重文件由模型模块直接 import，需要让 Vite 当作静态资源处理，
  // 否则测试套件在解析 .bin 时会报 "invalid JS syntax"。
  assetsInclude: ["**/*.bin"],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    clearMocks: true,
  },
});
