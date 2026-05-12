/**
 * Copy eDEX-UI `src/assets` subsets into `packages/edex-vite-shell/public/edex-assets/`
 * so Vite can serve them at `/edex-assets/...`.
 *
 * Usage (repo root):
 *   EDEX_UI_SRC="E:/path/to/edex-ui/src" npm run sync-edex-assets
 *
 * Default on Windows: E:\Personal\edex-ui\src (override with EDEX_UI_SRC).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const destRoot = path.join(
  repoRoot,
  "packages",
  "edex-vite-shell",
  "public",
  "edex-assets",
);

const defaultEdexSrc =
  process.platform === "win32"
    ? "E:\\Personal\\edex-ui\\src"
    : path.join(process.env.HOME || "", "Personal/edex-ui/src");

const edexSrc = process.env.EDEX_UI_SRC || defaultEdexSrc;
const assetsSrc = path.join(edexSrc, "assets");

function copyDir(rel) {
  const from = path.join(assetsSrc, rel);
  const to = path.join(destRoot, rel);
  if (!fs.existsSync(from)) {
    console.warn(`[sync-edex-assets] Skip missing: ${from}`);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`[sync-edex-assets] ${rel} -> ${to}`);
}

if (!fs.existsSync(assetsSrc)) {
  console.error(
    `[sync-edex-assets] Assets not found: ${assetsSrc}\nSet EDEX_UI_SRC to your edex-ui/src directory.`,
  );
  process.exit(1);
}

fs.mkdirSync(destRoot, { recursive: true });

for (const rel of [
  "css",
  "themes",
  "fonts",
  "kb_layouts",
  "audio",
  "misc",
  "icons",
  "vendor",
]) {
  copyDir(rel);
}

console.log("[sync-edex-assets] Done. Uncomment CSS imports in packages/edex-vite-shell/src/styles/edex-entry.css");
