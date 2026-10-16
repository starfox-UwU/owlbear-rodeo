/**
 * 构建 character-card 子应用并把产物复制到本项目的 `public/card/`。
 *
 * 角色卡是 React 19 + Vite 的独立应用，与主项目（React 17）不能共用依赖，
 * 因此以「子应用 + iframe 嵌入 + postMessage 桥接」的方式集成。
 * 详见 docs/CHARACTER-CARD.md。
 *
 * 用法：
 *   node scripts/build-card.mjs            # 有变化才重建
 *   node scripts/build-card.mjs --force    # 强制重建
 *   node scripts/build-card.mjs --soft     # 失败时不阻断（供 predev/prebuild 使用）
 */
import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cardDir = join(root, "character-card");
const sourceDir = join(cardDir, "dist-standalone");
const targetDir = join(root, "public", "card");

const force = process.argv.includes("--force");
const soft = process.argv.includes("--soft");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function fail(message) {
  if (soft) {
    console.warn(`[build-card] ${message}`);
    console.warn("[build-card] 跳过角色卡构建；/card 页面会提示未构建。");
    process.exit(0);
  }
  console.error(`[build-card] ${message}`);
  process.exit(1);
}

function runCli(cli, args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: cardDir,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    fail(`命令失败：node ${cli} ${args.join(" ")}`);
  }
}

/** 只在这条冷启动路径上用到 npm（Windows 上是 npm.cmd，需要 shell）。 */
function runNpm(args) {
  const result = spawnSync(npm, args, {
    cwd: cardDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    fail(`命令失败：npm ${args.join(" ")}`);
  }
}

/** 收集子应用里所有会影响产物的源文件时间戳。 */
function newestSourceMtime() {
  let newest = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist-standalone") continue;
        walk(path);
        continue;
      }
      const mtime = statSync(path).mtimeMs;
      if (mtime > newest) newest = mtime;
    }
  };
  for (const tree of ["src", "public", "tools"]) {
    const dir = join(cardDir, tree);
    if (existsSync(dir)) walk(dir);
  }
  for (const file of ["index.html", "package.json", "vite.config.ts"]) {
    const path = join(cardDir, file);
    if (existsSync(path)) {
      const mtime = statSync(path).mtimeMs;
      if (mtime > newest) newest = mtime;
    }
  }
  return newest;
}

if (!existsSync(cardDir)) {
  fail("找不到 character-card 子应用目录。");
}

const marker = join(targetDir, "index.html");
if (!force && existsSync(marker)) {
  const builtAt = statSync(marker).mtimeMs;
  if (builtAt >= newestSourceMtime()) {
    console.log("[build-card] 角色卡产物已是最新，跳过构建。");
    process.exit(0);
  }
}

if (!existsSync(join(cardDir, "node_modules"))) {
  console.log("[build-card] 安装角色卡子应用依赖…");
  runNpm(["ci", "--no-audit", "--no-fund"]);
}

console.log("[build-card] 构建角色卡单机版…");
// 直接调用子应用自己的 tsc / vite，避免 spawn npm.cmd 在 Windows 上的批处理限制。
runCli(join(cardDir, "node_modules", "typescript", "bin", "tsc"), ["-b"]);
runCli(join(cardDir, "node_modules", "vite", "bin", "vite.js"), [
  "build",
  "--mode",
  "standalone",
]);

if (!existsSync(join(sourceDir, "index.html"))) {
  fail("构建产物缺少 index.html。");
}

rmSync(targetDir, { recursive: true, force: true });
cpSync(sourceDir, targetDir, { recursive: true });
console.log(`[build-card] 已输出到 ${targetDir}`);
