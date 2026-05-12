# eDEX presentation layer — screenshot checklist

Use when closing a port phase; capture **light + dark** Termix themes where relevant.

Linked plan: [eDEX UI port layer plan](../plans/2026-05-12-edex-ui-port-layer-plan.md).

## Shell

- [ ] Classic desktop → switch to **eDEX shell** (sidebar or `ui.edex.shellUi`).
- [ ] **Boot splash** visible on first entry (or skipped when reduced-motion / session flag).
- [ ] **Globe** visible behind chrome; markers (if hosts exist) and **focus/visibility** refresh.
- [ ] **Shell options** (gear): toggles persist in `localStorage` `ui.edex`.
- [ ] **SYSTEM** menu: profile / admin / hosts overlay / host matrix actions match the regular header controls.
- [ ] **Boot chime** (optional): enable in gear, splash plays once; **volume** sub-menu adjusts; disabled by default.
- [ ] **Boot quips** (optional): enable in gear; random line from `edex.bootQuips`; disabled by default.
- [ ] **Theme import:** paste valid eDEX-style JSON with `colors` from clipboard; header / tab strip / **globe orb** / **boot overlay** / **HUD active key** pick up `--edex-shell-theme-*`; **Clear imported theme** resets.

## Workspace (`EdexLayout`)

- [ ] SSH workspace: **terminal** + optional **stats** / **files** per settings.
- [ ] **Keyboard HUD** when enabled (modifier + Q row, highlight on keypress).
- [ ] **Mobile** stacked vs tabs layout.

## Module chrome

- [ ] **Terminal** / **File manager** / **Server stats** inside eDEX panels (no double canvas).

## Return path

- [ ] **Classic UI** from shell header restores classic chrome; sessions intact.

## Regression

- [ ] Toggle shell repeatedly; **type in terminal** after each switch.
