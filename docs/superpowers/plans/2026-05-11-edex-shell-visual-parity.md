# eDEX Shell Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When `ui.edex.shellUi === "edex"`, the desktop is visually unmistakable as **eDEX-style chrome** (grid, neon frame, monospace HUD), not merely a different panel grid inside Termix chrome.

**Architecture:** Keep `useTabs` and feature components unchanged; add a **shell-level theme layer** (`edexShellTheme.css` + `documentElement` marker) and a **`TopNavbar` chrome variant** so global chrome matches `EdexLayout` aesthetics. Follow with optional embed flattening in a later plan.

**Tech stack:** React, Tailwind, existing CSS variables from `index.css`, `EdexLayout` / `edexLayout.css` as reference for cyan/grid language.

**Workspace:** Working copy on `main` at repo root (no extra worktree requested).

---

### Task 1: Shell backdrop + document marker

**Files:**

- Create: `src/ui/desktop/apps/edex/edexShellTheme.css`
- Modify: `src/ui/desktop/DesktopApp.tsx` (import CSS + `useEffect` sets `data-termix-shell` on `<html>`)
- Modify: `src/ui/desktop/apps/edex/EdexShell.tsx` (apply `edex-app-shell` classes; remove generic `bg-background` where replaced by theme CSS)

- [x] **Step 1:** Add `edexShellTheme.css` with `.edex-app-shell` grid/radial background and `html[data-termix-shell="edex"]` optional token nudges (keep changes conservative if theme is `light`).
- [x] **Step 2:** In `DesktopApp` `AppContent`, `useEffect` toggles `document.documentElement` attribute `data-termix-shell="edex"` only when authenticated and `edexUiConfig.shellUi === "edex"`; cleanup on unmount / classic.
- [x] **Step 3:** Import `edexShellTheme.css` from `DesktopApp.tsx` once.
- [x] **Step 4:** Run `npm run type-check`.

**Acceptance:** Shell background reads as eDEX-like; toggling classic removes `data-termix-shell`; no TS errors.

---

### Task 2: Top tab strip chrome variant

**Files:**

- Modify: `src/ui/desktop/navigation/TopNavbar.tsx`
- Modify: `src/ui/desktop/apps/edex/EdexShell.tsx` (pass `chromeVariant="edex"`)

- [x] **Step 1:** Extend `TopNavbarProps` with optional `chromeVariant?: "classic" | "edex"` (default `"classic"`).
- [x] **Step 2:** When `chromeVariant === "edex"`, apply `termix-top-navbar--edex` to the main bar and the collapsed “re-open” strip; omit solid `var(--bg-base)` fill so CSS gradient shows.
- [x] **Step 3:** Define `.termix-top-navbar--edex` rules in `edexShellTheme.css` (border glow, mono font, border-color overrides for nested `border-edge`).
- [x] **Step 4:** Run `npm run type-check`.

**Acceptance:** Tab bar in eDEX shell matches neon HUD language; classic `TopNavbar` unchanged.

---

### Task 3: Docs + verification

**Files:**

- Modify: `README.md` (Development Notes: visual parity layer)

- [x] **Step 1:** Note `data-termix-shell` + `chromeVariant` in README.
- [x] **Step 2:** Run `npm run type-check`.

**Acceptance:** README matches behavior; type-check passes.

---

## Spec compliance checklist (for reviewers)

- [x] eDEX shell mode has distinct **full-viewport** background (grid / glow), not only `EdexLayout` interior.
- [x] **Classic** mode unchanged (no `data-termix-shell`, default `TopNavbar` chrome).
- [x] No new tab type; `shellUi` remains source of truth.

## Code quality checklist

- [x] No `any` added; minimal surface area.
- [x] Effects clean up correctly (logout / shell toggle).
