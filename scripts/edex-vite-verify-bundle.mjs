/**
 * Phase A.6: fail if the edex-vite-shell production bundle references Electron.
 * Run after `npm run edex:vite:build` (or `vite build` in the workspace).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "packages", "edex-vite-shell", "dist");

const checks = [
  { re: /require\s*\(\s*["']electron["']\s*\)/, label: 'require("electron")' },
  { re: /from\s+["']electron["']/, label: 'import from "electron"' },
  { re: /import\s*\(\s*["']electron["']\s*\)/, label: 'import("electron")' },
  { re: /@electron\/remote/, label: "@electron/remote" },
];

function collectJsFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`[edex-vite-verify-bundle] dist missing: ${dir}`);
    process.exit(1);
  }
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...collectJsFiles(p));
    else if (ent.isFile() && ent.name.endsWith(".js")) out.push(p);
  }
  return out;
}

let failed = false;
const files = collectJsFiles(distDir);
if (files.length === 0) {
  console.error("[edex-vite-verify-bundle] no .js files under dist");
  process.exit(1);
}

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const { re, label } of checks) {
    if (re.test(text)) {
      console.error(`[edex-vite-verify-bundle] forbidden ${label} in ${path.relative(process.cwd(), file)}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`[edex-vite-verify-bundle] ok (${files.length} js file(s) under dist)`);
