# eDEX-UI upstream reference (local workflow)

Use this when diffing **GitSquared/eDEX-UI** against Termix’s presentation layer (themes, keyboard HUD, globe, module chrome).

## Clone (not committed)

Upstream is **GPL-3.0**. Do **not** vendor the full tree into Termix without license review and an explicit decision to ship third-party sources.

Recommended local clone (ignored by git):

```bash
git clone --depth 1 https://github.com/GitSquared/edex-ui.git vendor/edex-ui-reference
```

Path `vendor/edex-ui-reference/` is listed in the repo **`.gitignore`** so it stays on your machine only.

## What to compare

| Upstream (typical paths) | Termix |
|--------------------------|--------|
| Theme JSON (`colors`, fonts) | `edexThemeJson.ts`, `shellThemeImportJson`, `edexShellTheme.css` |
| Keyboard / HUD | `EdexKeyboardHud.tsx`, `edexShellTheme.css` |
| Globe / network viz | `EdexGlobeBackdrop.tsx`, `edexGlobeMarkers.ts`, `edexShellTheme.css` |
| Boot / splash | `EdexShellBootSplash.tsx` |
| Shell layout | `EdexShell.tsx`, `EdexLayout.tsx` |

## License

- Upstream: see [eDEX-UI LICENSE](https://github.com/GitSquared/edex-ui/blob/master/LICENSE) (GPL-3.0).
- Termix may only **reuse ideas, color tokens, and small snippets** that comply with GPL obligations if those snippets are copied verbatim into this repo; prefer **clean-room** ports and documented inspiration.

## Links

- [eDEX-UI repository](https://github.com/GitSquared/edex-ui)
- [Themes wiki](https://github.com/GitSquared/edex-ui/wiki/Themes)
- Port plan: [2026-05-12-edex-ui-port-layer-plan.md](../plans/2026-05-12-edex-ui-port-layer-plan.md)
