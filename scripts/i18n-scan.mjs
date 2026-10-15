// Temporary helper: list source files that contain likely user-facing English strings.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src";
const SKIP = /(\.test\.|\.d\.ts$|docs\/|icons\/|polyfills\/|workers\/)/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const STRING = />\s*[A-Z][A-Za-z][^<>{}\n]{0,60}\s*</;
const ATTR =
  /\b(title|label|placeholder|aria-label|alt|description|confirmText|cancelText|tooltip|heading)=(["'])[^"']{2,}\2/;
const STRCONST = /["'`][A-Z][a-z]+ [a-z][^"'`]{3,}["'`]/;

const rows = [];
for (const file of walk(ROOT)) {
  const rel = relative(".", file).replaceAll("\\", "/");
  if (SKIP.test(rel)) continue;
  const src = readFileSync(file, "utf8");
  let hits = 0;
  for (const line of src.split("\n")) {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
    if (STRING.test(line) || ATTR.test(line) || STRCONST.test(line)) hits++;
  }
  if (hits > 0) rows.push([hits, rel]);
}
rows.sort((a, b) => b[0] - a[0]);
let total = 0;
for (const [n, f] of rows) {
  total += n;
  console.log(String(n).padStart(4), f);
}
console.log("---");
console.log("files:", rows.length, "lines:", total);
