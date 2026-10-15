// Temporary helper: find UI files likely to contain user-facing English copy.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src";
const SKIP =
  /(\.test\.|\.d\.ts$|[\\/]docs[\\/]|[\\/]icons[\\/]|[\\/]polyfills[\\/]|[\\/]workers[\\/]|[\\/]i18n[\\/]|[\\/]resources[\\/]|[\\/]ml[\\/])/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const patterns = [
  />\s*[A-Z][A-Za-z][^<>{}\n]{2,60}\s*</, // JSX 文本
  /\b(title|label|placeholder|aria-label|alt|confirmText|cancelText|tooltip)=["'][A-Z]/,
  /["'`][A-Z][a-z]+ [a-z][^"'`]{3,}["'`]/, // 句子形态的字符串
];

const rows = [];
for (const file of walk(ROOT)) {
  const rel = relative(".", file).replaceAll("\\", "/");
  if (SKIP.test(rel)) continue;
  const src = readFileSync(file, "utf8");
  const hits = [];
  src.split("\n").forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    if (line.includes("from \"../i18n\"") || line.includes('t("')) return;
    if (patterns.some((re) => re.test(line))) hits.push(i + 1);
  });
  if (hits.length) rows.push([hits.length, rel, hits.slice(0, 6).join(",")]);
}
rows.sort((a, b) => b[0] - a[0]);
for (const [n, f, lines] of rows) console.log(String(n).padStart(4), f, "|", lines);
console.log("--- files:", rows.length);
