/**
 * Copy `packages/edex-vite-shell/public/edex-assets` into Termix `public/edex-assets`
 * so the main Vite dev server can serve themes/CSS/fonts for the embedded eDEX Vite shell.
 * Run `npm run sync-edex-assets` first so the workspace `public/edex-assets` tree exists.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const src = path.join(repoRoot, "packages", "edex-vite-shell", "public", "edex-assets");
const dest = path.join(repoRoot, "public", "edex-assets");

if (!fs.existsSync(src)) {
  console.warn(
    `[sync-edex-vite-public] skipped: missing ${src}\n` +
      `  Run: npm run sync-edex-assets (EDEX_UI_SRC pointing at edex-ui/src) then retry.`,
  );
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[sync-edex-vite-public] copied to ${dest}`);
