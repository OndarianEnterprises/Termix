## eDEX Mode Implementation Plan

### Objective

Implement a usable eDEX-style mode inside Termix (desktop + mobile capable) by reusing existing Termix terminal, stats, and file manager systems, with Termix as source of truth plus an `edex` visual sub-config.

### Scope for this execution

Deliver a working first implementation that includes:
- Route and navigation entry for eDEX mode.
- `EdexLayout` with terminal, stats, and file manager embedded.
- Basic eDEX visual styling and responsive behavior.
- Initial `ui.edex` config shape/defaults used by the UI.
- Root README update documenting what was added and what remains.

### Task 1: Add eDEX route/nav entry and EdexLayout skeleton

Implement:
- Add a new desktop route or view switch entry to open eDEX mode.
- Add a navigation trigger (button/menu item) to access eDEX mode.
- Create `EdexLayout` component file with placeholders and container structure:
  - Terminal panel area placeholder.
  - Stats panel area placeholder.
  - File manager panel area placeholder.
  - Widget/info area placeholder.
- Ensure this compiles and can be rendered without runtime errors.

Acceptance:
- User can navigate to eDEX mode in app UI.
- New component renders a visible skeleton layout.

### Task 2: Wire terminal, server stats, and file manager into EdexLayout

Implement:
- Replace placeholders by embedding existing Termix feature components:
  - Existing `Terminal` component for primary panel.
  - Existing server stats view/widgets for stats panel.
  - Existing `FileManager` in embedded mode for file panel.
- Reuse existing host/session context patterns used by full screen apps.
- Keep behavior read/write equivalent to existing features (no API changes).

Acceptance:
- Terminal is functional in eDEX mode against selected host.
- Stats panel loads real stats.
- File manager panel loads and operates for same host.

### Task 3: Add `ui.edex` config schema/defaults and basic settings hooks

Implement:
- Add initial `ui.edex` config model and defaults in existing config structures.
- Include keys for:
  - `enabled`
  - `defaultView`
  - `theme`
  - `showFileBrowser`
  - `showSystemStats`
  - `showKeyboardOverlay`
  - `gridIntensity`
  - `layout.desktop`
  - `layout.mobile`
- Read these values inside eDEX layout to toggle panel visibility and visual behavior.
- If full settings UI integration is too broad for this pass, add internal plumbing and TODO markers where settings screens should bind.

Acceptance:
- eDEX layout behavior responds to config defaults.
- Type checks pass for new config fields.

### Task 4: Add base eDEX styling/theme tokens and responsive mobile behavior

Implement:
- Add base styles for:
  - Neon frame/border.
  - Grid background.
  - Panel chrome headers.
  - Compact info strip (time + host metadata area).
- Implement responsive behavior:
  - Desktop: multi-panel layout.
  - Mobile: terminal-first with tabbed/stacked secondary panels.
- Preserve existing app theming compatibility while applying eDEX style layer.

Acceptance:
- eDEX view has recognizable eDEX visual identity.
- Mobile viewport remains usable and not visually broken.

### Task 5: Update root README for this work

Implement:
- Update root `README.md` with a concise section describing:
  - New eDEX mode availability.
  - Current capabilities in eDEX mode.
  - Known limitations and next planned enhancements.
- Keep existing README content intact; append/edit minimally.

Acceptance:
- README accurately reflects new feature status.

### Verification checklist (after implementation)

- Run targeted checks:
  - `npm run type-check`
  - `npm run lint` (or scoped lint if full lint is too heavy)
  - Build sanity check if feasible: `npm run build`
- Manually verify:
  - eDEX route opens.
  - Terminal connects.
  - Stats render.
  - File manager renders and basic operation works.
  - Mobile layout usable.

