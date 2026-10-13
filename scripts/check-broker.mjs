#!/usr/bin/env node
/**
 * 后端连通性自检工具
 *
 * 用法：
 *   yarn check:broker                      # 读取根目录 .env 里的 VITE_BROKER_URL
 *   yarn check:broker http://192.168.1.32:9000
 *
 * 它会依次检查：
 *   1. 前端当前会用到哪个后端地址（以及这个值是从哪来的）
 *   2. 该地址的 TCP 端口通不通
 *   3. 用和 src/network/Session.ts 完全相同的参数，实测 socket.io 能否连上
 */
import net from "node:net";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import io from "socket.io-client";
import msgParser from "socket.io-msgpack-parser";

function readDotEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) {
        env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
    return env;
  } catch {
    return {};
  }
}

const dotEnv = readDotEnv();
const rawUrl =
  process.argv[2] || process.env.VITE_BROKER_URL || dotEnv.VITE_BROKER_URL;
const source = process.argv[2]
  ? "命令行参数"
  : process.env.VITE_BROKER_URL
    ? "进程环境变量 VITE_BROKER_URL"
    : dotEnv.VITE_BROKER_URL
      ? "根目录 .env 的 VITE_BROKER_URL"
      : "（未配置）";

console.log("──────────────────────────────────────────────");
if (!rawUrl) {
  console.log("✗ 没有找到后端地址，前端会直接进入「离线模式」。");
  console.log("  请在根目录 .env 中设置 VITE_BROKER_URL，例如：");
  console.log("  VITE_BROKER_URL=http://127.0.0.1:9000");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(rawUrl);
} catch {
  console.log(`✗ 地址格式不对：${rawUrl}`);
  process.exit(1);
}

const host = parsed.hostname;
const port = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));

console.log(`前端将连接：${rawUrl}`);
console.log(`来源        ：${source}`);
console.log(`目标        ：${host}:${port}`);
console.log("──────────────────────────────────────────────");

function checkTcp() {
  return new Promise((resolvePromise) => {
    const socket = net.connect({ host, port });
    const finish = (ok, detail) => {
      socket.destroy();
      resolvePromise({ ok, detail });
    };
    socket.setTimeout(4000);
    socket.on("connect", () => finish(true, "端口开放"));
    socket.on("timeout", () => finish(false, "连接超时（4000ms）"));
    socket.on("error", (error) => finish(false, error.code || error.message));
  });
}

const tcp = await checkTcp();
console.log(
  tcp.ok ? `✓ 1. TCP ${host}:${port} ${tcp.detail}` : `✗ 1. TCP ${host}:${port} 不通 —— ${tcp.detail}`
);

if (!tcp.ok) {
  console.log("");
  console.log("  端口不通意味着「连接根本没有建立」，浏览器就会报");
  console.log(`  「Firefox 无法建立到 ws://${host}:${port}/socket.io/ 服务器的连接」。`);
  console.log("");
  console.log("  请依次确认：");
  console.log("  1) 后端是否已启动：cd backend && yarn build && yarn start");
  console.log("  2) 地址是否写对：127.0.0.1 只对「和后端同一台机器上的浏览器」有效；");
  console.log("     从别的设备访问要写宿主机的局域网 IP（如 http://192.168.1.32:9000）");
  console.log("  3) 后端是否监听 0.0.0.0（本仓库默认监听全部网卡），以及防火墙是否放行 9000");
  console.log("  4) 改过 .env 后必须重启 dev server（yarn dev）或重新 yarn build");
  process.exit(1);
}

console.log("✓ 2. TCP 可达，接下来实测 socket.io 握手……");

const socket = io(rawUrl, {
  withCredentials: true,
  parser: msgParser,
  transports: ["websocket"],
});

const timer = setTimeout(() => {
  console.log("✗ 3. socket.io 握手超时（8s）");
  socket.close();
  process.exit(1);
}, 8000);

socket.on("connect", () => {
  clearTimeout(timer);
  console.log(`✓ 3. socket.io 连接成功，socket.id = ${socket.id}`);
  console.log("");
  console.log("后端一切正常。如果浏览器仍然报错，请：");
  console.log("  · 硬刷新页面（Ctrl+Shift+R），旧页面里可能还留着上一个地址");
  console.log("  · 如果你跑的是 build/ 产物，改完 .env 必须重新 yarn build");
  socket.close();
  process.exit(0);
});

socket.on("connect_error", (error) => {
  clearTimeout(timer);
  console.log(`✗ 3. socket.io 握手失败：${error.message}`);
  console.log("");
  console.log("  端口通但握手失败，通常是：");
  console.log("  · 该端口上的服务不是本仓库的后端（socket.io 版本或 parser 不一致）");
  console.log("  · 中间有反向代理没有转发 WebSocket 的 Upgrade 头");
  socket.close();
  process.exit(1);
});
