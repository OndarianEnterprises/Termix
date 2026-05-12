# eDEX-UI → Vite port inventory (what to clone and what to replace)

Use this as a **checklist** when cloning [GitSquared/edex-ui](https://github.com/GitSquared/edex-ui) (GPL-3.0) into a **standalone Vite** package before Termix merge. Paths are relative to the **eDEX-UI repo root**; your local clone may be `E:\Personal\edex-ui`.

---

## 1. Do not “port” as browser code (keep as reference or delete)

| Path | Role |
|------|------|
| `src/_boot.js` | Electron **main** process: `BrowserWindow`, IPC, `node-pty`, paths. **Not** bundled in Vite client. |
| `src/_multithread.js` | Main-side helper; same. |
| Root `package.json` | `electron`, `electron-builder`, `electron-rebuild`, build scripts — **not** used by Vite SPA. |

---

## 2. Copy verbatim (or nearly) — static assets

These are **safe** to place under Vite `public/` or import as static URLs.

### 2.1 CSS (order matters; match `src/ui.html`)

From **`src/ui.html`** link order:

1. `node_modules/augmented-ui/augmented.css` → install **`augmented-ui`** in Vite project and `@import` or copy vendored CSS.
2. `src/assets/css/main.css`
3. `src/assets/css/modal.css`
4. `src/assets/css/boot_screen.css`
5. `src/assets/css/media_player.css`
6. `src/assets/css/main_shell.css`
7. `src/assets/css/filesystem.css`
8. `src/assets/css/keyboard.css`
9. `src/assets/css/mod_column.css`
10. `src/assets/css/mod_clock.css`
11. `src/assets/css/mod_sysinfo.css`
12. `src/assets/css/mod_hardwareInspector.css`
13. `src/assets/css/mod_cpuinfo.css`
14. `src/assets/css/mod_netstat.css`
15. `src/assets/css/mod_conninfo.css`
16. `src/assets/css/mod_globe.css`
17. `src/assets/css/mod_ramwatcher.css`
18. `src/assets/css/mod_toplist.css`
19. `src/assets/css/mod_fuzzyFinder.css`
20. `src/assets/css/mod_processlist.css` *(styles process table used by `toplist.class.js`)*
21. `src/assets/css/extra_ratios.css`

### 2.2 Themes, keyboards, fonts, audio, misc, icons

| Directory | Contents |
|-----------|----------|
| `src/assets/themes/` | `*.json` theme definitions (large JSON; load as `fetch` or `import`). |
| `src/assets/kb_layouts/` | `*.json` keyboard layouts. |
| `src/assets/fonts/` | `*.woff2` (e.g. Fira, United Sans). |
| `src/assets/audio/` | `*.wav` SFX. |
| `src/assets/misc/` | `boot_log.txt`, `grid.json`, `file-icons-match.js`, etc. |
| `src/assets/icons/` | `file-icons.json`, binary icons — note **git submodule** for full file-icons upstream (`package.json` scripts `init-file-icons`). |
| `src/assets/vendor/encom-globe.js` | Globe logic (legacy global script; wrap or rewrite as ES module). |

---

## 3. Port / rewrite — JavaScript (renderer)

### 3.1 Orchestrator (largest dependency graph)

| File | Notes |
|------|--------|
| **`src/_renderer.js`** | Builds `#main_shell`, filesystem, keyboard, secondary modules; loads themes/fonts; heavy **`electron` / `@electron/remote` / `fs` / `path` / `ipcRenderer`**. **Rewrite** into React + hooks, or split into modules behind `electronShim`. |

### 3.2 Class modules (loaded by `src/ui.html` in order)

| `src/classes/*.class.js` | Typical concern for Vite |
|--------------------------|---------------------------|
| `modal.class.js` | DOM + events → React modal/dialog. |
| `terminal.class.js` | **`node-pty`**, xterm, IPC → **Termix WebSocket + `@xterm/xterm`** (or keep xterm 4.x if you match versions). |
| `docReader.class.js` | **PDF** via `pdfjs-dist` — OK in Vite with **worker** config; file source = API not `fs`. |
| `mediaPlayer.class.js` | Local paths + Electron → URLs / Termix file stream. |
| `filesystem.class.js` | Local `fs` + CWD → **Termix remote file API** + same panel CSS. |
| `keyboard.class.js` | Mostly DOM + kb JSON → React. |
| `updateChecker.class.js` | eDEX updates → **remove** or **Termix version** endpoint. |
| `clock.class.js` | Timers + DOM → trivial React. |
| `sysinfo.class.js` | **`systeminformation`** (Node) → **Termix metrics API** (host or server). |
| `hardwareInspector.class.js` | Same as sysinfo path. |
| `cpuinfo.class.js` | Same. |
| `netstat.class.js` | Same. |
| `conninfo.class.js` | Same. |
| `locationGlobe.class.js` | **`maxmind` / `geolite2`** (Node) + vendor globe JS → **browser fetch** to your backend for GeoIP, or static demo data in Phase A. |
| `ramwatcher.class.js` | Node metrics → API. |
| `toplist.class.js` | Includes **process list** UI (`#processList`); pairs with **`mod_processlist.css`**. |
| `fuzzyFinder.class.js` | DOM finder → React + keyboard; data from Termix or local index. |
| `audiofx.class.js` | **`howler`** — fine in browser; wire to user gesture for autoplay policies. |

**Note:** There is **no** `processlist.class.js`; process list lives inside **`toplist.class.js`**.

---

## 4. npm dependencies — `src/package.json` (renderer)

Map each dependency for **Vite browser** use:

| Dependency | Vite / browser |
|--------------|----------------|
| `augmented-ui` | **Yes** (CSS). |
| `xterm`, `xterm-addon-*` | **Yes** (align version with Termix or upgrade both). |
| `pdfjs-dist` | **Yes** (configure worker in Vite). |
| `howler` | **Yes**. |
| `color`, `nanoid`, `pretty-bytes`, `mime-types`, `smoothie` | **Yes** (verify tree-shaking). |
| `@electron/remote` | **No** — delete; use shims. |
| `node-pty` | **No** — delete; Termix terminal transport. |
| `systeminformation` | **No** (Node native) — Termix APIs. |
| `maxmind`, `geolite2-redist` | **No** in client — server-side or drop in Phase A. |
| `ws` | **No** — use `WebSocket` in browser. |
| `tail`, `shell-env`, `which`, `username` | **No** — Node-only; replace with APIs or remove. |
| `signale` | **No** in client — dev logging only. |

Root `package.json` also pulls **Electron toolchain** — not part of the Vite app bundle.

---

## 5. HTML entry

| File | Vite equivalent |
|------|-----------------|
| `src/ui.html` | `index.html` + **`main.tsx`** importing CSS in the same order as above; no inline Electron CSP. |

---

## 6. Suggested “clone into repo” layout (Termix or standalone)

Option A — **git submodule** `vendor/edex-ui` and copy assets in build script.  
Option B — **copy** `src/assets/**` into `packages/edex-vite-shell/public/edex-assets/` once (track provenance + GPL).

Either way, keep a **`THIRD_PARTY_NOTICES.md`** (or similar) listing eDEX-UI version and license.

---

## 7. Minimal first clone set (smallest vertical slice)

If you only want to **explore design** before full port:

1. `src/assets/css/main.css` + `main_shell.css` + `boot_screen.css`
2. `src/assets/themes/tron.json` (or one theme) + matching fonts from `src/assets/fonts/`
3. `augmented-ui` CSS
4. A stub `index.html` that applies `body` classes and a static `#main_shell` skeleton

Then add `_renderer.js` behavior incrementally as React components.

---

## Related plan

Full phased plan: `2026-05-12-termix-edex-ui-vite-frontend-replacement-plan.md`.
