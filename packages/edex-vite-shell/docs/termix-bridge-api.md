# Termix bridge (Phase A placeholders)

This document lists **REST** and **WebSocket** surfaces the eDEX Vite shell is expected to use once merged into Termix (`Phase B` in `docs/superpowers/plans/2026-05-12-termix-edex-ui-vite-frontend-replacement-plan.md`). The standalone package does **not** call these endpoints yet except optional **terminal** JSON over a user-supplied WS URL.

## Conventions

- **Auth:** Termix session cookie or `Authorization` bearer after merge; Phase A mock UI has no auth.
- **Paths:** Remote paths are POSIX-style strings; mock data lives under `/mock/...` in `mockFsData.ts`.
- **Errors:** JSON error bodies TBD; UI should surface `message` + HTTP status in Phase B.

## REST (illustrative)

| Area | Method | Path (illustrative) | Notes |
|------|--------|---------------------|--------|
| Host metrics | `GET` | `/api/hosts/:hostId/metrics` | Returns `RemoteMetricsSnapshot` (see `src/contracts/hostMetrics.ts`). |
| File list | `GET` | `/api/hosts/:hostId/files` | Query: `path`, optional `showHidden`. Returns `FileNode[]` (`src/contracts/fileNode.ts`). |
| File metadata | `GET` | `/api/hosts/:hostId/files/stat` | Query: `path`. |
| Theme | `GET` / `PUT` | `/api/user/ui-theme` or Termix `ui.edex` | `ThemeManifest` (`src/contracts/themeManifest.ts`) or server-side settings blob. |

Exact paths must match the Termix OpenAPI bundle when integrated (`npm run generate:openapi` on the main app).

## WebSocket — terminal (`ws_json`)

Framing matches the existing **JSON** messages used by `EdexTerminalSurface` when `VITE_EDEX_TERMINAL_WS` is set:

- Client to server: `{ "type": "input", "data": "<raw terminal input>" }`
- Server to client: `{ "type": "data", "data": "<raw terminal output>" }`

Phase A **does not** send `connectToHost` or host handshakes when run standalone.

**Phase B (embedded):** When Termix loads the shell with `EdexTermixBridgeProvider`, `EdexTermixHostProvider` may supply `embeddedTerminal`: the real `Terminal` component from the main app is mounted in `#terminal0` (same host as the bridge, `chromeAppearance="edex"`). In that mode `EdexTerminalSurface` does not open its own xterm or WebSocket. If `embeddedTerminal` is omitted, `EdexTerminalSurface` opens the same `/ssh/websocket/` URL as `Terminal.tsx`, sends `connectToHost` (or `attachSession` when session persistence is enabled), then exchanges `input` / `data`, `resize`, `ping` / `pong`, and `disconnect` on teardown. The host comes from the current or first **terminal** tab (`type: "terminal"` + `hostConfig`). Interactive auth prompts (TOTP, passphrase, etc.) are not handled in the thin eDEX xterm path yet; use the native `Terminal` embed or switch back to Termix desktop for those steps.

## WebSocket — metrics (optional future)

A possible push channel (not implemented in Phase A):

- Server: periodic `RemoteMetricsSnapshot` or deltas keyed by `hostId`.

## Local Phase A wiring

- **Mock FS:** `EdexMockFsProvider` + `useEdexMockFs()` keep `cwd` in sync between `EdexFilesystemPanel` and the fuzzy finder modal.
- **SFX:** `VITE_EDEX_AUDIO=1` enables `audio/edexAudioPlaceholder.ts` stubs.

## Phase A.6 — Manual layout QA (not automated)

Run `npm run edex:vite:preview` after a build, then spot-check in Chromium:

- **1080p:** `#main_shell`, left column, filesystem strip, and keyboard HUD visible without horizontal overflow; modals stay draggable within the viewport.
- **Ultrawide (~21:9):** Globe column and main shell share width sensibly; no clipped `mod_column` titles.

## Phase A.6 — Automation (repo scripts)

- **ESLint:** `electron` and `@electron/*` imports are forbidden under `packages/edex-vite-shell/` (see root `eslint.config.js`).
- **Bundle scan:** `npm run edex:vite:verify` runs typecheck, `vite build`, then `scripts/edex-vite-verify-bundle.mjs` on `packages/edex-vite-shell/dist`.
- **E2E:** From repo root, `npm install` then `npm run edex:vite:e2e` (first time: `npm run e2e:install --workspace=@termix/edex-vite-shell` for Chromium). Tests live in `packages/edex-vite-shell/e2e/` and start `vite preview` with `VITE_EDEX_SKIP_BOOT=1` via Playwright `webServer`.

## Embedding in Termix (Phase B)

When `shellUi === "edex-vite"`, Termix wraps the lazy `App` with `EdexTermixBridgeProvider` (SSH WebSocket + session) and `EdexTermixHostProvider` (username, tab strip sync, actions for modals, **optional tool overlays**: command palette, File Manager, Server Stats, Tunnel / Docker managers, Guacamole remote session when a matching tab exists, plus `embeddedTerminal` for the native `Terminal`). When the host context supplies `sshHosts`, `EdexMainShellLayout` renders `EdexHostsPanel` to the left of the terminal stack; row selection calls `onOpenHostFromPanel` (Termix opens or focuses the correct tab; `onRefreshSshHostList` / Manage wire to the same flows as the classic host manager). The filesystem strip sits **under** the terminal column inside `#main_shell`; CPU/RAM/network/top processes modules sit **under** the globe, driven by `remoteHostMetrics` when Termix polls `GET /metrics/:id`, else Phase A mocks. `globeHostMarkers` / `globeFocusedHostId` / `globeOpenHostIds` drive one ENCOM satellite per host IP (approximate lat/lon) with emphasis for the focused and open-tab hosts. See `@termix/edex-vite-shell/host`. Runtime requests under `/edex-assets/...` are served from the main app `public/edex-assets/`: run `npm run sync-edex-assets` then `npm run sync-edex-vite-public` from the Termix repo root (see root `README.md`).
