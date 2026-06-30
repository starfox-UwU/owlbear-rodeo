import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve("build/src");
const allowedExtensions = [".js", ".mjs", ".cjs", ".json"];
const importPattern =
  /\b(?:import|export)\b[\s\S]*?\bfrom\s*["'](\.{1,2}\/[^"']+)["']/g;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }

  return files;
}

function hasAllowedExtension(specifier) {
  return allowedExtensions.some((extension) => specifier.endsWith(extension));
}

const offenders = [];

for (const filePath of walk(rootDir)) {
  const content = fs.readFileSync(filePath, "utf8");
  const matches = content.matchAll(importPattern);

  for (const match of matches) {
    const specifier = match[1];
    if (!hasAllowedExtension(specifier)) {
      offenders.push(`${path.relative(process.cwd(), filePath)} -> ${specifier}`);
    }
  }
}

if (offenders.length > 0) {
  console.error("Found extensionless relative ESM imports:");
  for (const offender of offenders) {
    console.error(`- ${offender}`);
  }
  process.exit(1);
}

console.log("All relative ESM imports include file extensions.");
