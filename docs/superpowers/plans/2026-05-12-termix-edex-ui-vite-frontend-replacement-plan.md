# Termix frontend replacement with eDEX-UI (Electron → Vite → Termix)

> **For agentic workers:** Track with checkbox steps. **Phase A** must reach a **standalone Vite app** that runs in a browser before **Phase B** merges into Termix. Do not skip the Vite isolation step: it de-risks Electron API coupling.

**Goal:** Replace Termix’s React desktop shell with a **web-native frontend** derived from **eDEX-UI** (upstream reference: `GitSquared/edex-ui`, GPL-3.0), while **Termix backend** (REST, WebSocket terminal, auth, RBAC, file APIs, etc.) remains the system of record.

**Non-goals (initial phases):** Pixel-perfect clone of archived Electron builds; local `node-pty` in the browser; silent arbitrary access to the user’s laptop filesystem.

**Related docs:**

- `2026-05-11-termix-full-edex-ui-replacement-plan.md` — strangler shell work already in Termix.
- `2026-05-12-edex-ui-port-layer-plan.md` — presentation fidelity notes.
- `2026-05-12-edex-ui-vite-port-inventory.md` — **what to clone vs rewrite** (CSS, assets, classes, npm deps).
- Local upstream clone (layout/CSS/JS reference): `E:\Personal\edex-ui` (or your path).

---

## 0. Constraints and decisions (lock before build)

- [ ] **License:** eDEX-UI is **GPL-3.0**. Confirm Termix distribution model (single binary, web bundle, dual-license contributions) with maintainers; document compliance (source offer, combined work rules).
- [ ] **Target stack:** **Vite + React + TypeScript** inside the existing Termix monorepo/workspace (not Next.js unless you explicitly change Termix’s build).
- [ ] **Semantic rules for “system” widgets:** Data = **active remote host** (tab context) **or** **Termix server** — never “browser laptop” unless you later add an optional local agent (out of scope unless specified).
- [ ] **Terminal:** Browser **xterm** + existing Termix **WebSocket** (or current transport); no `node-pty` in client.
- [ ] **Files / media / PDF:** **Termix file APIs + existing preview**; no Electron `fs` paths from UI.

---

## Phase A — Translate eDEX-UI from Electron to Vite (standalone)

**Objective:** A **separate** Vite app (e.g. `packages/edex-shell` or `apps/edex-web`) that **renders and themes** like eDEX, runs on `vite dev` / static `dist`, and uses **shims + adapters** instead of Electron. No Termix auth merge yet beyond optional mock API.

### A.1 Inventory and boundaries

- [ ] List all **renderer entrypoints**: `src/ui.html`, `src/_renderer.js`, `src/classes/*.class.js`, `src/assets/css/*.css`, themes/fonts (from `ui.html` and `_renderer.js`).
- [ ] Classify each module: **pure UI**, **Electron-only**, **needs network**, **needs local FS** (rewrite target).
- [ ] Map Electron APIs used (`@electron/remote`, `ipcRenderer`, `fs`, `path`, `shell`, `dialog`, etc.) to a single **`electronShim.ts`** interface (throws in dev until implemented).

### A.2 Vite project scaffold

- [x] **Scaffold:** Workspace `packages/edex-vite-shell` (Vite + React + TS), `electronShim` stubs, `augmented-ui` CSS entry (full upstream chain commented in `edex-entry.css` until `sync-edex-assets`), root scripts `edex:vite:*`, asset sync `scripts/sync-edex-ui-assets.mjs`.
- [x] Port global styles: uncomment `edex-entry.css` imports after sync + verify load order matches `ui.html`.
- [ ] Establish **CSS strategy**: (1) keep legacy CSS files with minimal edits, or (2) incrementally move to CSS modules / one Tailwind layer — pick one and stick to it for Phase A.

### A.3 Runtime shims (Electron → Web)

Implement **narrow** shims used by ported code; prefer **injecting adapters** over copying `require("electron")` patterns.

- [ ] **`userData` / paths:** Replace with `import.meta.env` + static `public/` or fetch to backend later; for Phase A use **in-memory** or `localStorage` for `settings.json` shape.
- [ ] **IPC:** Replace with **typed event bus** in-app (`EventTarget` or tiny pub/sub); reserve names for future Termix bridge (`termix:*`).
- [ ] **Window state:** `sessionStorage` / optional API later.
- [ ] **Shell open external:** no-op or `window.open` with allowlist.

### A.4 Incremental module port (recommended order)

Port **leaf widgets first**, then shell composition.

1. [x] **Boot / intro** — React component + CSS from `boot_screen.css`; respect `prefers-reduced-motion`.
2. [x] **Main shell frame** — DOM structure from `_renderer.js` + `main_shell.css` as layout components.
3. [x] **Keyboard HUD** — mostly CSS + small JS → React (`EdexOnScreenKeyboard`: upstream `kb_layouts` JSON, row/key DOM, physical key highlight; `prefers-reduced-motion` skips blink).
4. [x] **Globe** — `EdexGlobeModule`: loads `/edex-assets/vendor/encom-globe.js` + `misc/grid.json`, ENCOM `Globe` + mock lat/lon; `VITE_EDEX_SKIP_GLOBE`, reduced-motion stub.
5. [x] **Terminal surface** — `EdexTerminalSurface`: xterm + FitAddon + mock line editor (`help` / `echo` / …); optional `VITE_EDEX_TERMINAL_WS` JSON wire (no full SSH handshake).
6. [x] **Filesystem panel** — `EdexFilesystemPanel` + `mockFsData.ts`: upstream DOM/CSS, mock `/mock/...` tree, list/grid + dotfiles toggles, mock disk view + space bar.
7. [x] **System modules** — `EdexModColumnLeft` + `contracts/hostMetrics.ts` + `mock/mockHostMetrics.ts` (clock, sysinfo, hardware, CPU canvases, RAM 440pt grid, netstat, top list; `RemoteMetricsSnapshot`).
8. [x] **Modal / fuzzy finder / audio FX** — `EdexShellOverlays` + `EdexModalPopup` (draggable `modal_popup`), fuzzy finder (`mod_fuzzyFinder.css` IDs), `EdexMediaPlayerStub`, `audio/edexAudioPlaceholder.ts` (`VITE_EDEX_AUDIO=1`); Termix version panel replaces GitHub update checker (session auto-tip + `Ctrl+Shift+B`).

### A.5 Data contracts (freeze before Termix merge)

- [x] Define **TypeScript types** in `packages/edex-vite-shell/src/contracts/`: `hostMetrics.ts` (`RemoteMetricsSnapshot` + slices), `hostContext.ts` (`HostContext`), `terminalSession.ts` (`TerminalSession`), `fileNode.ts` (`FileNode`), `themeManifest.ts` (`ThemeManifest`), `keyboardLayout.ts` (`KeyboardLayoutDocument`), re-exported from `contracts/index.ts`.
- [x] Document **REST + WS** endpoints the UI will call (Phase A mocks): `packages/edex-vite-shell/docs/termix-bridge-api.md`.

### A.6 Quality gates for Phase A

- [x] `vite build` produces static assets; no `require("electron")` in client bundle — `npm run edex:vite:verify` (`scripts/edex-vite-verify-bundle.mjs`) plus ESLint `no-restricted-imports` on `packages/edex-vite-shell/**`.
- [x] Lighthouse / manual: checklist for 1080p and ultrawide in `packages/edex-vite-shell/docs/termix-bridge-api.md` (Phase A.6 — Manual layout QA).
- [x] **E2E smoke (Playwright):** `packages/edex-vite-shell/e2e/smoke.spec.ts` — shell visible, about modal shortcut, terminal focus (`npm run edex:vite:e2e` after `npm run e2e:install --workspace=@termix/edex-vite-shell`).

---

## Phase B — Merge Vite eDEX shell into Termix

**Objective:** One app, one auth session, one router: Termix loads the new shell instead of `DesktopApp` / `EdexShell` strangler path.

### B.1 Monorepo wiring

- [x] **Workspace package** `packages/edex-vite-shell` + root `dependencies["@termix/edex-vite-shell": "workspace:*"]` + `exports["./app"]` for embedded `App`. Asset bridge: `npm run sync-edex-vite-public` copies `packages/edex-vite-shell/public/edex-assets` → `public/edex-assets` (gitignored).
- [ ] Shared **env** (`VITE_API_HOST`, etc.) and **axios instance** from Termix `main-axios.ts` (or thin wrapper).

### B.2 Auth and routing

- [x] Mount embedded Vite shell **only when authenticated** (`DesktopApp` + `shellUi === "edex-vite"`); exit control returns to classic desktop.
- [ ] Pass `token`, user, admin flag into embedded shell context; map **TabContext** to eDEX modules.
- [ ] Replace or gate **`shellUi`**: deprecate integrated `edex` once `edex-vite` reaches parity (`shellUi` already supports `classic` | `edex` | `edex-vite`).

### B.3 Wire real backends

- [ ] **Terminal:** connect xterm to **production** Termix WS path; resize, copy/paste, themes.
- [ ] **Files:** Termix file manager APIs behind filesystem panel actions.
- [ ] **Metrics:** Server stats / host agent endpoints for RAM/CPU/netstat/process list per **semantic rules (§0)**.
- [ ] **Command palette / global shortcuts:** align with Termix existing palette or unify.

### B.4 Decommission legacy UI

- [ ] Feature flag rollout; collect issues; then remove unused components (`LeftSidebar` classic path, old `EdexShell` if fully superseded).
- [ ] Update user-facing docs and migration notes.

---

## Phase C — Parity, performance, hardening

- [ ] **Parity checklist** against upstream screenshots (per module).
- [ ] **Accessibility:** focus order, keyboard, ARIA on ported widgets.
- [ ] **Security:** CSP, sanitize any HTML/CSS from theme JSON imports.
- [ ] **i18n:** Termix locale system vs eDEX strings — decide merge strategy.
- [ ] **Mobile / narrow viewports:** explicit unsupported or responsive rules.

---

## Risks (watch continuously)

| Risk | Mitigation |
|------|------------|
| GPL interaction with Termix license | Decide early with legal/maintainers; document. |
| Hidden `electron` imports in transitive code | ESLint + bundle analyzer + CI grep. |
| Theme JSON executing unsafe CSS | Sanitize / allowlist CSS keys; no raw `innerHTML` from theme. |
| Tab/session model mismatch | Routing table + explicit state machine for “active host.” |
| Long parallel UI (old + new) | Time-box Phase A standalone; avoid duplicating business logic in two shells for months. |

---

## Deliverables summary

| Phase | Outcome |
|-------|---------|
| **A** | **Standalone Vite+React** eDEX-like shell, mocks + shims, no Electron in bundle. |
| **B** | Shell **inside Termix**, real APIs, feature flag, path to remove legacy UI. |
| **C** | Parity, security, perf, cleanup. |

---

## First sprint (suggested, 1–2 weeks for a focused dev)

1. Scaffold Vite package + import ordered global CSS + empty shell layout.
2. Implement `electronShim` stubs + settings in `localStorage`.
3. Port boot screen + main shell chrome (no terminal yet).
4. Add xterm + mock WS; then swap to dev Termix WS.

When Phase A’s first sprint is green, schedule **B.1–B.3** behind a **`VITE_TERMX_EDEX_VITE=1`** (or `ui.edex.frontend: "vite-edex"`) flag before deleting old UI.
