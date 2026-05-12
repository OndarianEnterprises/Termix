/**
 * Merges `edex` from `src/locales/en.json` into every `src/locales/translated/*.json`.
 *
 * 1. Files without `edex`: inserts the full English `edex` block before top-level `theme` when possible.
 * 2. Files with `edex`: deep-merges missing keys only (never overwrites existing translated strings).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const enPath = path.join(root, "src", "locales", "en.json");
const translatedDir = path.join(root, "src", "locales", "translated");

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
if (!en.edex) {
  console.error("en.json missing edex section");
  process.exit(1);
}

/**
 * @param {unknown} target
 * @param {unknown} source
 * @returns {unknown}
 */
function mergeMissingDeep(target, source) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return target !== undefined ? target : source;
  }
  const base =
    target !== null && typeof target === "object" && !Array.isArray(target)
      ? { ...target }
      : {};
  for (const [k, v] of Object.entries(source)) {
    if (!(k in base)) {
      base[k] = v;
    } else {
      base[k] = mergeMissingDeep(base[k], v);
    }
  }
  return base;
}

let updated = 0;
let skipped = 0;
for (const name of fs.readdirSync(translatedDir)) {
  if (!name.endsWith(".json")) continue;
  const p = path.join(translatedDir, name);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));

  if (!j.edex) {
    const next = {};
    let inserted = false;
    for (const [k, v] of Object.entries(j)) {
      if (!inserted && k === "theme") {
        next.edex = en.edex;
        inserted = true;
      }
      next[k] = v;
    }
    if (!inserted) {
      next.edex = en.edex;
    }
    fs.writeFileSync(p, `${JSON.stringify(next, null, 2)}\n`);
    updated += 1;
    continue;
  }

  const mergedEdex = mergeMissingDeep(j.edex, en.edex);
  if (JSON.stringify(mergedEdex) === JSON.stringify(j.edex)) {
    skipped += 1;
    continue;
  }
  const next = { ...j, edex: mergedEdex };
  fs.writeFileSync(p, `${JSON.stringify(next, null, 2)}\n`);
  updated += 1;
}
console.log(`merge-edex-locales: updated ${updated}, skipped ${skipped}`);
