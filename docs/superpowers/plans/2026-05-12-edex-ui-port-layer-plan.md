# eDEX-UI → Termix “Presentation Layer” Port Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` task-by-task. Checkboxes track progress.

**Goal:** Reproduce **eDEX-UI’s look, motion, and signature widgets** as a **Termix UI layer** that wraps existing Termix systems (tabs, SSH, tunnels, files, stats, auth). **Classic Termix UI remains** via `ui.edex.shellUi === "classic"` (already in Termix).

**Fidelity target (locked):** **As close as possible** to the upstream **GitSquared/eDEX-UI** program (layout, typography, grid/glow language, module chrome, keyboard HUD, boot/splash behavior, globe visualization, theme JSON semantics). Where the **web/Electron platform** cannot match 1:1 (e.g. Node `os` module shape), match **visual and informational** parity using Termix data.

**Non-goals (unchanged engineering boundaries):**

- Rewriting Termix backend, SSH engine, or session protocols “to match eDEX.”
- Replacing Termix’s tab model; eDEX is a **skin + layout + accessory HUD** over `useTabs`.

**Architecture (target end state):**

```text
┌─────────────────────────────────────────────────────────────┐
│  eDEX presentation layer (shell, HUD, themes, animations)   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Termix domain: TabProvider, hosts, Terminal, FM, …     │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Tech stack:** Termix (React + Vite + Tailwind + shadcn). eDEX-UI reference (Electron + custom UI). Port is **CSS + React components + asset pipeline**, not a second app runtime.

---

## 1. Inventory — what eDEX-UI is “special” for

Upstream highlights (see [eDEX-UI README](https://github.com/GitSquared/edex-ui), [Themes wiki](https://github.com/GitSquared/edex-ui/wiki/Themes)):

| Area | eDEX-UI behavior | Termix mapping idea |
|------|------------------|---------------------|
| **Full-screen sci-fi shell** | Single immersive stage; panels as “modules” | `EdexShell` + scoped theme (`data-termix-shell`, `edexShellTheme.css`) — extend, don’t fork auth. |
| **Theme system** | JSON themes: colors, fonts, terminal cursor, “dots/globe” accents | Map JSON → **CSS variables** + optional **font-face** loads; store under `ui.edex` or separate `ui.edexTheme` blob. |
| **Terminal** | xterm-based tabbed terminal, sci-fi chrome | Keep **Termix `Terminal`**; strip/replace **outer chrome** in `chromeMode="edex"` (panel frame only). |
| **Filesystem view** | Visual file browser / “filesystem module” | Align with **Termix `FileManager`** + eDEX-styled **container** (icons, path breadcrumb HUD). |
| **System monitoring** | CPU/RAM/etc. widgets, graphs | Align with **`ServerStats`** + shared metric polling already in Termix. |
| **Globe / network viz** | 3D-ish globe, markers | **Required for max fidelity:** port or reimplement globe module (WebGL/Three.js or upstream-equivalent), fed by Termix host/link data; fall back only if perf budget exceeded on low-end devices (feature flag). |
| **Keyboard HUD** | On-screen keyboard / layout highlight | Port as **pure React** overlay; bind to last focused terminal + layout from settings. |
| **Boot / load ritual** | Splash, sound (optional), staged reveal | Map to **shell toggle** + `Suspense` boundaries; respect `prefers-reduced-motion`. |
| **Touch / kiosk** | Large hit targets | Reuse Termix mobile hooks; eDEX mobile layout already started in `EdexLayout`. |
| **Settings inside fiction** | Settings as “console” | Optional: reskin **Admin / Profile** routes later; not required for MVP layer. |

---

## 2. Current Termix baseline (already done)

- `ui.edex.shellUi`: `"classic"` | `"edex"` with **Classic** control in shell.
- `EdexShell` + `SidebarProvider` + `TopNavbar.chromeVariant="edex"`.
- `EdexLayout` embeds **real** `Terminal`, `ServerStats`, `FileManager` with host context.
- `edexShellTheme.css` + `data-termix-shell` for **shell chrome** (grid, neon tab strip).
- Legacy `"edex"` tab type removed; persistence migration in `TabContext`.

**Gap:** Inner feature UIs still look **Termix-default** inside eDEX frames — the next large tranche of work.

---

## 3. Phased port strategy (recommended)

### Phase A — “Stage + tokens” (low risk, high recognition)

- [x] **Theme JSON bridge (baseline):** `edexThemeJson.ts` — `EdexUpstreamThemeJson`, `normalizeEdexThemeJson()`, `applyEdexImportedThemeCssVars()` / `clearEdexImportedThemeCssVars()` (`--edex-shell-theme-*`); `ui.edex.shellThemeImportJson` persists pasted JSON; `EdexShellQuickSettings` pastes from clipboard or clears; `edexShellTheme.css` consumes accent/border/background fallbacks. *(Neon grid tokens still from `edexThemeBridge` + `ui.edex`; full upstream parity / xterm mirror TBD.)*
- [x] **Font pipeline:** `shellUiFont` + `edexFontLoader` injects Google Fonts CSS when preset is not `system`; `--edex-shell-ui-font` drives shell typography.
- [x] **Motion contract:** `prefers-reduced-motion` CSS under `data-termix-shell="edex"`; `EdexShell` intro class gated with `usePrefersReducedMotion`.

### Phase B — “Module chrome” (medium effort)

- [x] **Terminal chrome pass:** `Terminal` accepts `chromeAppearance="edex" | "termix"` (wired from `EdexLayout`); root uses `termix-terminal-chrome--edex` for flat panel fit.
- [x] **File manager chrome pass:** `FileManager` accepts `chromeAppearance`; `FileManagerInner` now forwards all props (fixes `className` / `allowBodyHorizontalScroll`); `termix-file-manager--edex-chrome` clears duplicate canvas.
- [x] **Server stats chrome pass (baseline):** `ServerStats` `chromeAppearance` + compact header class under embedded eDEX; further card/widget styling can follow screenshots.

### Phase C — “Signature widgets” (required for max fidelity)

- [x] **Keyboard HUD (baseline):** `EdexKeyboardHud` + `ui.edex.showKeyboardOverlay` + `keyboardHudLayout` (`us` | `iso` badge; Q-row + modifiers; live key highlight). Upstream-accurate full layouts / locale matrices still TBD.
- [x] **Boot / mode transition (baseline):** `EdexShellBootSplash` on eDEX shell mount when `shellBootSplash` is true; **Skip** + **Escape** + auto-dismiss; skipped when `prefers-reduced-motion: reduce` or `shellBootSplash` is false. `shellBootSplashOncePerSession` + `sessionStorage` skips repeat splashes in the same tab; `edex` strings merged into translated locales (`npm run merge-edex-locales`).
- [x] **Globe / network module (CSS baseline):** `EdexGlobeBackdrop` + `globeEnabled` + `globeShowHostMarkers`; host markers from `getSSHHosts` (deterministic pseudo positions, status tint); orb tints follow imported theme accent when set (`edexShellTheme.css`). **Optional:** WebGL + real geo / `network_graph`.

### Phase D — “Fiction-complete” (polish backlog)

- [x] **Fiction layer (baseline shipped):** `EdexShellSystemMenu` (`SYSTEM` monospace routing: profile, admin, hosts overlay, host matrix). `shellBootSoundEnabled` (default **off**) + `shellBootSoundVolume` + Web Audio chime in `edexBootSound.ts` / `EdexShellBootSplash` (skipped under `prefers-reduced-motion`). `shellBootQuipEnabled` (default **off**) + random line from `edex.bootQuips` in `en.json`. Gear menu exposes chime / quips / volume sub-slider. *(Upstream “full” sound design / deep Easter-eggs still optional.)*

### Phase A2 — Upstream reference workflow (max fidelity)

- [x] **Upstream reference workflow (doc):** [`edex-upstream-reference.md`](../specs/edex-upstream-reference.md) — local `vendor/edex-ui-reference/` clone (gitignored), GPL-3.0 notes, diff targets. *(Optional later: git submodule if the project chooses to track a pin in-repo.)*
- [x] Maintain a **screenshot / screen-recording checklist** per module — see [`docs/superpowers/specs/edex-screenshot-checklist.md`](../specs/edex-screenshot-checklist.md) (sign-off before closing a phase remains manual).

---

## 4. Engineering conventions (how to keep it maintainable)

1. **Single source of truth:** all remote actions stay in existing Termix modules; eDEX components **never** duplicate host APIs.
2. **Strict CSS scoping:** shell styles live under `data-termix-shell="edex"` and `chromeVariant` classes — avoid leaking into classic UI.
3. **Feature flags:** use `ui.edex.*` for **gradual rollout** (e.g. disable globe on weak GPUs), not to permanently omit parity features. Defaults should trend **on** once each module reaches screenshot parity with upstream.
4. **Testing:** `npm run type-check` every task; add **Playwright or RTL** smoke for “toggle shell → terminal still types” when harness exists.
5. **Upstream reference:** keep a **vendor fork or pinned clone** of `GitSquared/edex-ui` only for **asset + JSON theme** extraction, not runtime coupling.

---

## 5. Resolved defaults (fidelity: max)

| Topic | Decision |
|-------|----------|
| **Fidelity** | As close as possible to eDEX-UI; upstream repo is the visual source of truth. |
| **Globe** | Ship a real globe module (WebGL preferred); gate only via perf / `ui.edex.globeEnabled`. |
| **Themes** | While `shellUi === "edex"`, **eDEX theme JSON drives shell + module chrome**; Termix global theme continues to apply in classic mode. Optional: mirror eDEX terminal cursor/font into xterm when in edex workspace. |
| **Web vs Electron** | Same React shell in browser and Electron; any native-only enhancement is additive, not required for parity. |

---

## 6. Suggested next artifact

Short **design spec** (1–2 pages) with **screenshots** of target states: *Shell home*, *SSH workspace*, *Classic return path*. Checklist for capture passes: [`edex-screenshot-checklist.md`](../specs/edex-screenshot-checklist.md). Local upstream clone / GPL notes: [`edex-upstream-reference.md`](../specs/edex-upstream-reference.md).

---

## 7. Verification (per phase)

- Shell toggle never loses session; `npm run type-check` clean.
- Lighthouse / a11y: keyboard HUD does not trap focus; `Escape` closes overlays.
- Performance: no permanent `requestAnimationFrame` loops; cap globe FPS if added.
