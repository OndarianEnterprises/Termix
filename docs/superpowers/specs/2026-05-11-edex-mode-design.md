## eDEX Mode Inside Termix – Design Spec

### 1. Goal

Create an **eDEX-style UI mode** inside the existing Termix desktop UI that:
- Reuses Termix’s **terminal, stats, file manager, and host/session** systems.
- Replicates eDEX-UI’s **look and behavior** (fullscreen terminal, panels, widgets, keyboard overlay).
- Works on **desktop and mobile**, with Termix as the **single source of truth** for config plus a small `edex` sub-config for visual/layout preferences.

This replaces the current Termix web UI as your primary “Termix server web UI” while keeping the Termix backend and features intact.

### 2. High-Level Architecture

- **Backend**: Existing Termix backend and websockets remain unchanged.
- **Frontend stack**: Existing React + Vite + Tailwind + shadcn/ui Termix app.
- **New pieces**:
  - `EdexLayout` desktop view (new React component) that replaces `AppView` for the eDEX route.
  - A small **eDEX config subtree** under Termix’s main config (e.g. `termixConfig.ui.edex`).
  - Optional settings UI to toggle eDEX mode and tweak its visual/layout options.

The eDEX mode is a **new view** inside Termix, not a separate app.

### 3. Routing & Integration Points

- **Desktop route**:
  - Add a new route/view for **eDEX Mode**, e.g. `/desktop/edex`.
  - Entry point from existing desktop navigation (new menu item / button).
- **Shell integration**:
  - Termix’s global shell (auth, sidebars, top bar, host selection, theme) stays the same.
  - When the route is `/desktop/edex`, the central content area renders `EdexLayout` instead of `AppView`.
- **Host selection**:
  - eDEX mode uses the same host-selection mechanisms as existing desktop features:
    - Either wraps `EdexLayout` in a `FullScreenAppWrapper` style component.
    - Or expects the active host/session context from existing navigation.

### 4. EdexLayout Component (Desktop)

**File (planned)**: `src/ui/desktop/apps/edex/EdexLayout.tsx`

**Responsibilities**:
- Render the eDEX-style **2x2 dashboard**:
  - Main terminal pane.
  - System stats panel.
  - File browser panel.
  - Optional widgets panel (network graph, connection log, etc.).
- Manage **desktop vs mobile** layout differences.
- Wire in **keyboard overlay** and small info widgets (clock, hostname, uptime).
- Respect `termixConfig.ui.edex` visual/layout preferences.

**Desktop layout (conceptual)**:

- Use a CSS grid (or nested flex/grid) for a layout similar to:
  - Top-left: **Terminal panel** (primary focus).
  - Bottom-left: **File browser panel** (embedded file manager).
  - Top-right: **System stats panel** (server stats widgets).
  - Bottom-right: **optional widgets** (network graph, connection log, etc.).
- Surround entire content area with eDEX-style **neon frame and grid background**:
  - Reuse Termix theme colors but add CSS for grid lines, glow, and panel chrome.

**Mobile layout (conceptual)**:

- Primary: **terminal fullscreen**.
- Secondary views via a **tab bar or segmented control**:
  - Tabs: Terminal, Stats, Files, Keyboard, More.
- Visually consistent (colors, glow), but arranged vertically/stacked for narrow screens.

### 5. Terminal Behavior and Sessions

- **Engine**:
  - Reuse existing Termix `Terminal` component and underlying session handling.
  - No new terminal protocol or socket layer; eDEX mode is purely presentation.
- **Single vs multiple terminals**:
  - **Phase 1**:
    - Support one active terminal session in the main eDEX layout.
    - Allow switching between Termix sessions or hosts using an eDEX-styled top bar / tabs inside the terminal panel.
  - **Phase 2** (optional):
    - Integrate eDEX layout with existing Termix **split-screen** logic used by `AppView` (the `SPLIT_LAYOUTS` model).
    - Present split layouts in eDEX aesthetics.
- **Tab/session integration**:
  - Reuse Termix `useTabs` or equivalent context where possible.
  - EDEX terminal panel becomes another consumer of Termix’s tab/session infrastructure, with an eDEX-specific rendering.

### 6. Panels and Data Sources

#### 6.1 Terminal Panel

- Uses existing `Terminal` component with props:
  - `hostConfig` from the currently selected host.
  - `isVisible` controlled by layout.
  - `title` derived from host or session.
  - Callbacks for closing/opening file manager, etc., wired into eDEX layout actions instead of classic tabs.
- Visual:
  - eDEX-style border, header bar, and status strip (e.g. host name, latency, connection state).
  - Grid background and glow adapted from eDEX-UI.

#### 6.2 System Stats Panel

- Data:
  - Reuse existing **Server Stats** APIs Termix already calls (no new backend).
- Components:
  - Compose existing widgets (`SystemWidget`, `UptimeWidget`, `LoginStatsWidget`, etc.) into an eDEX-style dashboard.
- Visual:
  - Multi-card layout with neon/glow styling and compact typography.
  - Optional mini charts (reusing `recharts` where appropriate) in an eDEX skin.

#### 6.3 File Browser Panel

- Data and behavior:
  - Embed existing `FileManager` component in an “embedded mode” tied to the current host.
  - Reuse all file operations: browse, view, edit, upload, download.
- Visual:
  - EDEX-style header bar (current path, host), with neon frame and darker background.

#### 6.4 Widget Panel (Optional)

- Candidates:
  - Network graph (`NetworkGraphCard`).
  - Connection log preview.
  - Active tunnels summary.
- Controlled by config:
  - `termixConfig.ui.edex.showNetworkGraph`, etc.
- Layout:
  - A flexible “widget grid” where widgets can be toggled on/off from settings.

### 7. Keyboard Overlay

- Use existing **keyboard/virtual input** tooling:
  - Termix already uses `react-simple-keyboard` and has a `TerminalKeyboard` implementation for mobile.
- Behavior:
  - Overlay panel toggled via button (e.g. icon near terminal title or a global control).
  - On desktop: bottom-floating overlay aligned with terminal pane.
  - On mobile: slide-up sheet or dedicated “Keyboard” tab.
- Wiring:
  - Sends keystrokes to the active `Terminal` instance via a shared ref or callback API.
- Config:
  - `termixConfig.ui.edex.showKeyboardOverlay` and possibly layout/size preferences.

### 8. Info Widgets (Clock, Host Info, System Info)

- **Clock & date**:
  - Use client-side time by default; optionally sync with server time if needed.
- **Host/OS info**:
  - Derived from host metadata and server stats.
- **Uptime**:
  - From existing server stats endpoints.
- Placement:
  - Small widgets in corners/top bar in the eDEX layout, styled to match original eDEX-UI behavior.

### 9. Config Model (`termixConfig.ui.edex`)

Add a new subtree under the existing Termix UI config, stored with other UI preferences:

Conceptual shape (final type will follow existing config patterns):

```ts
termixConfig.ui.edex = {
  enabled: boolean;               // can be used to show/hide the eDEX route
  defaultView: boolean;           // whether eDEX is the default desktop view

  theme: string;                  // e.g. "edex-neon", mapped to terminal and panel theme presets

  showFileBrowser: boolean;       // toggle file panel
  showSystemStats: boolean;       // toggle stats panel
  showKeyboardOverlay: boolean;   // toggle keyboard overlay availability

  gridIntensity: number;          // 0–1 scale for background grid strength

  layout: {
    desktop: "2x2" | "stacked";   // primary desktop layout preset
    mobile: "stacked" | "tabs";   // primary mobile layout strategy
  };
};
```

Notes:
- All **connection/auth/host/session/tunnel** settings remain in the existing Termix config structures.
- EDEX config concerns **only visual/layout/theming** configuration specific to this mode.

### 10. Desktop vs Mobile Behavior

#### Desktop

- Default to full eDEX layout:
  - 2x2 grid with all panels visible when enabled by config.
- Terminal is always visible and primary.
- Panels can be toggled via small controls or settings, but layout stays eDEX-styled.

#### Mobile

- Focus on **terminal-first**:
  - Terminal tab is default on enter.
- Other views (stats, files, keyboard, widgets) are accessible via a bottom tab bar or segmented control.
- Use simplified visuals but keep color/theme cohesion with desktop eDEX mode.

### 11. Interaction with Existing Termix Features

- **Host manager & credentials**:
  - eDEX mode uses whichever host is selected in the existing Termix desktop UX.
  - “Quick connect” and saved hosts remain managed by Termix; eDEX doesn’t introduce a new host model.
- **Tunnels, Docker, RDP/VNC/Telnet**:
  - Initial eDEX version focuses on **terminal + stats + files + keyboard + core widgets**.
  - Later iterations may surface tunnel/Docker status or RDP/VNC shortcuts in the widget panel.
- **Permissions / RBAC**:
  - eDEX mode respects the same role-based access control; panels and actions hidden or disabled where the user lacks permission.

### 12. Non-Goals (v1)

- Not creating a separate standalone eDEX-only frontend that runs without Termix.
- Not re-implementing all Termix desktop apps as eDEX-style panels (only the key ones initially).
- Not changing Termix’s backend APIs or authentication model.

### 13. Open Questions / Future Enhancements

- How deeply to integrate **split-screen** layouts from `AppView` into eDEX mode (phase 2).
- Whether to allow eDEX mode to be used as a **default landing experience** for all users vs per-user preference only.
- Animations and performance tuning for lower-powered devices when all panels are active.

