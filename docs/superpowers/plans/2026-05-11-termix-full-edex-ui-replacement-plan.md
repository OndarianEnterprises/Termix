# Termix full eDEX-UI replacement — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Termix’s **classic desktop UI** (floating `AppView`, `LeftSidebar`-centric chrome, split layouts as primary UX) with a **single eDEX-style shell** where **all** `TabContextTab` experiences render in one coherent stage—including a **tabbed module strip** analogous to eDEX-UI’s terminal/module tabs—while keeping **TabContext** and feature logic as the source of truth.

**Architecture:** One authenticated **shell root** (`EdexShell` or renamed successor) always mounts a **workspace stage** plus **global overlays** (command palette, dialogs). **No swapping** between `EdexLayout` and legacy `DesktopApp` children for “chrome” tabs: every tab type maps to a **registered surface** (full-bleed module, split cell, or slide-over) inside the same flex hierarchy. **Split-screen** remains a layout concern but is expressed with **eDEX panel chrome**, not classic resizable floating windows, unless explicitly retained as a compatibility mode.

**Tech stack:** Existing Termix (React + Vite + Tailwind + shadcn), `TabContext`, feature components (`Terminal`, `ServerStats`, `FileManager`, `TunnelManager`, `DockerManager`, `GuacamoleDisplay`, `NetworkGraphCard`, `HostManager`, `Dashboard`, `AdminSettings`, `UserProfile`). eDEX-UI remains a **reference** for visuals, motion, and information hierarchy (see existing port notes in `2026-05-12-edex-ui-port-layer-plan.md`).

**Related docs (do not duplicate work):**

- `docs/superpowers/plans/2026-05-11-edex-mode-implementation-plan.md` — first eDEX mode delivery.
- `docs/superpowers/plans/2026-05-12-edex-ui-port-layer-plan.md` — presentation-layer fidelity (themes, globe, HUD).
- `docs/superpowers/plans/2026-05-12-termix-edex-ui-vite-frontend-replacement-plan.md` — **full eDEX-derived Vite frontend**: Phase A Electron→Vite standalone, Phase B merge into Termix, Phase C parity/hardening.

**Local upstream clone (authoritative layout reference):** `E:\Personal\edex-ui` (v2.2.8). High-signal paths for “how eDEX lays out terminals + modules”:

- `src/ui.html` — loads CSS/JS for `main_shell`, `filesystem`, `keyboard`, and `mod_*` widgets.
- `src/_renderer.js` — builds the live DOM: `#main_shell` (with `#main_shell_tabs` + `#main_shell_innercontainer`), `#filesystem`, `#keyboard`, and secondary modules; loads `settings.json` / themes from Electron `userData`.
- `src/classes/terminal.class.js` — tabbed terminals inside the shell.
- `src/classes/filesystem.class.js` — filesystem panel (CWD tracking vs detached mode on Windows).
- `src/classes/modal.class.js` — modals for errors/settings-style dialogs (not a full separate SPA shell).

---

## 0. Strategic approaches (pick one before deep implementation)

| Approach | Summary | Pros | Cons |
|----------|---------|------|------|
| **A. Shell replacement (recommended)** | One tree: extend `EdexShell` + new `EdexWorkspace` router; delete `shellUi === "classic"` path once parity gates pass. | One UX, no double margins, clearest “eDEX is Termix.” | Large refactor; every tab must be registered. |
| **B. Strangler: classic behind flag** | Same as A but keep `shellUi`/env kill-switch until QA sign-off. | Safer rollout. | Temporary dual maintenance. |
| **C. Embedded upstream eDEX** | Webview / second window running eDEX-UI; Termix core as service. | Maximum visual fidelity to Electron app. | Two runtimes, IPC, auth, upgrades — out of scope unless explicitly chosen. |

**Locked decision (2026-05-11):** **Approach B** — strangler: keep **`shellUi === "classic"`** (and optional env kill-switch per Phase 4) until parity / QA sign-off, then execute removal milestone → **A**.

**Recommendation (unchanged):** ship **B → A**, not **C**.

---

## 1. Tab inventory (must map 1:1 to a surface)

Source: `TabContextTab` in `src/types/index.ts`.

| `type` | Current primary host | Target eDEX surface |
|--------|----------------------|----------------------|
| `terminal` | `EdexLayout` / `AppView` | Main module tab; optional split cell |
| `server_stats` | same | Module tab or right stack panel |
| `file_manager` | same | Module tab or right stack panel |
| `docker` | `AppView` | Module tab |
| `network_graph` | `AppView` | Module tab |
| `rdp` / `vnc` / `telnet` | `AppView` | Module tab (Guacamole) |
| `ssh_manager` | `DesktopApp` child | Full-stage or large slide-over module |
| `user_profile` | `DesktopApp` child | Module tab or settings slide-over |
| `admin` | `DesktopApp` child | Module tab (admin-only) or guarded module |
| `home` | `Dashboard` | Full-stage “console home” or first-run module |

**Tunnel:** confirm runtime tab type string in `TabContext` / `addTab` (if `tunnel` exists alongside types above, add row and tests).

---

## 2. Target UX — “eDEX tabbed terminal system”

**Conceptual model:**

1. **Global strip** (already near this: `TopNavbar` `chromeVariant="edex"`): lists **all** open `tabs` with icon + title + close; drag-reorder optional later.
2. **Active tab content** fills the stage below the strip (no `100vh` / duplicate top margin — use `h-full` chain and context already started in `edexShellFrameContext.tsx`).
3. **Workspace tabs** (`terminal` …) that today use **split layout** in `AppView` either:
   - **Option 3a:** eDEX-style **tiling inside one module** (recommended long-term), or
   - **Option 3b:** retain `ResizablePanelGroup` but with **eDEX panel chrome** only (shorter path).

**Non-goals for v1 of replacement:** Pixel-perfect clone of Electron eDEX-UI; rewriting backend; changing SSH protocol.

---

## 3. Phases

### Phase 1 — Single stage, no classic swap

**Objective:** Eliminate `showEdexWorkspace ? <EdexLayout/> : <children/>` dichotomy in `EdexShell.tsx`.

**Files:**

- Modify: `src/ui/desktop/apps/edex/EdexShell.tsx`
- Create: `src/ui/desktop/apps/edex/EdexTabStage.tsx` (or `EdexWorkspaceRouter.tsx`) — renders active tab by `type`.
- Modify: `src/ui/desktop/DesktopApp.tsx` — when `shellUi === "edex"`, **do not** mount parallel classic trees for authenticated content; pass only overlays/command palette as needed.

- [x] **Step 1.1:** Define tab routing in `EdexTabStage.tsx` + `edexWorkspaceHost.ts` (registry-style `switch` on `TabContextTab.type`).
- [x] **Step 1.2:** Route multipanel SSH tabs through `EdexLayout`; RDP/VNC/telnet/network via lazy `AppView`; chrome tabs via lazy feature modules.
- [x] **Step 1.3:** `EdexShell` always mounts `EdexTabStage` (replaces `showEdexWorkspace` / `children` swap).
- [x] **Step 1.4:** Removed duplicate `DesktopApp` edex-shell children; `stageAuth` + `rightSidebarWidth` passed into shell.
- [ ] **Step 1.5:** Manual smoke: open each tab type once (terminal, home, ssh_manager, admin, profile, RDP if available).

### Phase 2 — Integrate “chrome” tabs into the same strip

**Objective:** Host manager, profile, admin, home use **same tab strip** and **same stage** (no classic card margins).

**Files:**

- Modify: `src/ui/desktop/apps/host-manager/hosts/HostManager.tsx` (already shell-aware margins)
- Modify: `src/ui/desktop/user/UserProfile.tsx`, `src/ui/desktop/apps/admin/AdminSettings.tsx`, `src/ui/desktop/apps/dashboard/Dashboard.tsx`
- Modify: `src/ui/desktop/navigation/TopNavbar.tsx` — ensure tab list shows **all** types with correct icons and keyboard focus.

- [x] **Step 2.1:** Register `ssh_manager`, `user_profile`, `admin`, `home` in `EdexTabStage`.
- [x] **Step 2.2:** Stage-level `Suspense` + `StageFallback` (no `100vh` wrappers in `DesktopApp` for edex branch).
- [ ] **Step 2.3:** Re-verify admin-only tab entry points in `TopNavbar` / menus for non-admin users (existing rules; regression pass).

### Phase 3 — Split screen inside eDEX module

**Objective:** Replace or skin `AppView` split logic.

**Files:**

- Read/modify: `src/ui/desktop/navigation/AppView.tsx`
- Create: `src/ui/desktop/apps/edex/EdexSplitWorkspace.tsx` (optional) — wraps `ResizablePanelGroup` with eDEX chrome only.

- [x] **Step 3.1:** Document current `allSplitScreenTab` + layout nodes behavior.
- [x] **Step 3.2:** When `shellUi === "edex"`, route split rendering through `EdexSplitWorkspace` only (classic path unchanged if flag exists).
- [x] **Step 3.3:** Re-run terminal `fit`/`notifyResize` after layout changes (reuse `AppView` patterns).

### Phase 4 — Retire classic shell

**Objective:** Remove `LeftSidebar` + classic `AppView` root for default installs.

**Files:**

- Modify: `src/ui/desktop/DesktopApp.tsx`, `src/ui/desktop/navigation/LeftSidebar.tsx`, `edexSettings.ts` defaults
- Modify: `README.md` (user-facing product description only if product team wants)

- [ ] **Step 4.1:** Default `shellUi` to `"edex"` for new profiles (migration: existing `localStorage` keys).
- [x] **Step 4.2:** Gate classic behind `shellUi === "classic"` or env `VITE_TERMX_CLASSIC_UI=1` for one release.
- [ ] **Step 4.3:** Delete dead branches once metrics / dogfood pass.

### Phase 5 — Fidelity pass (ties into port-layer plan)

**Objective:** Visual/motion parity with eDEX-UI reference.

**Files:** Per `2026-05-12-edex-ui-port-layer-plan.md` (globe, HUD, theme JSON, panel chrome).

- [ ] **Step 5.1:** Component-level checklist against upstream screenshots.
- [ ] **Step 5.2:** `prefers-reduced-motion` audit on new transitions.

---

## 4. Testing and verification

- [ ] Unit: registry throws or fallback UI for unknown `type` (defensive).
- [ ] Integration (manual scripted): open 2 terminals, split, switch to profile, return — no layout collapse; terminal refit.
- [ ] `npm run type-check` on every PR touching shell.
- [ ] Optional: Playwright smoke for tab strip + one SSH connect (if suite exists).

---

## 5. Upstream eDEX-UI (research notes — GitSquared/edex-ui)

Primary source: [README](https://github.com/GitSquared/edex-ui/blob/master/README.md) and [Wiki](https://github.com/GitSquared/edex-ui/wiki) (project **archived**; treat as frozen reference).

- **Terminal:** “Fully featured … with **tabs**” — multiple shells are **terminal tabs**, not OS-level windows.
- **Filesystem:** “Directory viewer that follows the **CWD** of the terminal” — file UI is **tightly coupled** to the active terminal tab (Termix today often separates file manager as its own tab; eDEX favors **sidecar** semantics).
- **Other views:** System/network widgets, keyboard, globe, etc. are **fixed layout modules** around the shell; visibility is driven by **theme JSON** and CSS (e.g. `tron-notype` hides keyboard/filesystem rather than a separate “settings app” disabling them).
- **Customization:** Themes, keyboard layouts, optional sounds, optional CSS injections — “settings” are mostly **config + theme files**, not a large nested SPA like Termix Admin/Profile.

**Implication for Termix:** A faithful *workflow* is “**one main stage** + **terminal tab strip** + **optional docked modules** (stats, files) tied to host/session,” not “every Termix tab type is a floating window.” Termix-specific pages (SSH manager, admin, profile) still need a **module slot** or **overlay** because eDEX has no direct equivalent.

## 6. Open decisions (need your input)

1. **Split layout:** After reviewing upstream (fixed grid + terminal internal tabs), choose **3a** / **3b** / **hybrid** from Phase 3 — default recommendation remains **hybrid** unless you want tiling first.
2. **Classic fallback:** **Locked:** **B** (see §0). Remaining detail: document exact env var name in Phase 4 when added.
3. **Tunnel tab type:** Confirm exact `type` string in runtime for tunnel tabs so the registry is complete.
4. **File manager coupling:** Should eDEX-mode file browser **follow active terminal CWD** like upstream (requires PTY path integration), or stay **SSH path / tab-scoped** like today?

---

## 7. Spec handoff (brainstorming workflow)

Before large implementation, capture an approved **design spec** in:

`docs/superpowers/specs/YYYY-MM-DD-termix-edex-full-replacement-design.md`

…with wireframes or ASCII diagrams for: tab strip, stage, split, and where Host manager / Admin live. Then treat **this plan** as the execution checklist derived from that spec.
