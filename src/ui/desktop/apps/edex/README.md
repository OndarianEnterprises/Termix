# eDEX App

This folder contains the eDEX workspace layout view and its local UI settings plumbing.

## What is here
- `EdexLayout.tsx`: renders the eDEX multi-panel desktop layout.
- `EdexTabStage.tsx`: authenticated eDEX shell **tab router** — maps each `TabContextTab` to `EdexLayout`, `AppView`, or full-page surfaces (dashboard, host manager, admin, profile).
- `EdexSplitWorkspace.tsx`: when `AppView` runs inside the eDEX stage and split-screen is active, the `ResizablePanelGroup` tree is wrapped here for eDEX-scoped panel chrome (`edexShellTheme.css`); classic `AppView` keeps the legacy absolute root.
- `edexWorkspaceHost.ts`: shared helpers for workspace host resolution and tab-type classification.
- `edexSettings.ts`: schema/defaults + local storage hook for `ui.edex` config.

## Updated in Task 3
- Added `ui.edex` config shape with defaults for:
  - `enabled`
  - `defaultView`
  - `theme`
  - `showFileBrowser`
  - `showSystemStats`
  - `showKeyboardOverlay`
  - `gridIntensity`
  - `layout.desktop`
  - `layout.mobile`
- Wired `EdexLayout` to consume settings and control:
  - stats panel visibility
  - file browser panel visibility
  - grid visual intensity
  - optional keyboard overlay
- **`defaultView` (desktop):** Chooses which panel is primary (large left column): terminal (classic grid), file manager first, or stats first; status line shows effective default when panels are hidden.
- **`layout.mobile`:** On narrow viewports (`useIsMobile`), `stacked` shows all panels in a vertical scroll with default view first; `tabs` shows a tab strip and one panel at a time (initial tab follows `defaultView`).
- **Settings store:** `useEdexSettings` uses `useSyncExternalStore` with in-memory listeners so same-tab updates propagate immediately; `storage` events still sync other tabs. Use `updateConfig` for partial updates (always normalized). Use exported `replaceEdexSettings(unknown)` for a full normalized replace.

## Updated in Task 4
- Added explicit eDEX style token layer in `edexLayout.css` for:
  - neon frame and glow treatment
  - grid cadence and line color
  - panel border/chrome/body accents
  - compact info strip sizing
- Kept theme compatibility by binding tokenized visuals to app palette variables (`--color-*`) and switching neon accents through light/dark eDEX shell classes.
- Ensured the compact info strip always surfaces useful metadata:
  - current time/date
  - active host display + identity
  - resolved default view and current mobile/desktop layout state
- Hardened mobile terminal-first behavior:
  - `layout.mobile = "tabs"` keeps terminal as entry tab and uses tabs for secondary panels
  - `layout.mobile = "stacked"` keeps terminal first, then configured secondary panels in order
  - mobile tab state now self-recovers to terminal if stats/files panels are disabled at runtime
- Added mode-specific shell/main classes so desktop and mobile layouts are styleable and maintainable without changing app-level themes.

## Updated in Task 4
- Added `edexLayout.css` as a maintainable styling layer for eDEX visual tokens:
  - neon shell and panel framing
  - panel chrome headers
  - compact info-strip pills
  - mobile tab button styling
- Refined `EdexLayout.tsx` to use eDEX-specific classes instead of only utility-style panel framing.
- Added a compact info strip that surfaces:
  - current local time/date
  - host metadata (`name`, `username@ip`)
  - active default view and layout context (desktop vs mobile mode)
  - terminal-first hinting on mobile
- Enforced terminal-first mobile behavior while still honoring `ui.edex.layout.mobile`:
  - `tabs`: starts on Terminal with Stats/Files as secondary tabs
  - `stacked`: Terminal renders first, then secondary panels
- Desktop behavior remains multi-panel and continues to respect `defaultView`, `showSystemStats`, `showFileBrowser`, and `layout.desktop`.
- Styling keeps compatibility with existing app themes by deriving colors from shared CSS variables (`--color-*`) and only layering eDEX-specific accents.

## Needs future updates
- Add a user-facing settings screen that edits `ui.edex` (including `enabled`).
