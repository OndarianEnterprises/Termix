# `@termix/edex-vite-shell`

Standalone **Vite + React** shell for Phase A of the eDEX-UI → Termix port (no Electron in this bundle).

## Commands (from Termix repo root)

- `npm run edex:vite:dev` — dev server (default port **5174**)
- `npm run edex:vite:build` — production build to `packages/edex-vite-shell/dist`
- `npm run edex:vite:typecheck` — TypeScript for this package only
- `npm run sync-edex-assets` — copy `css`, `themes`, `fonts`, `kb_layouts`, `audio`, `misc`, `icons`, `vendor` from an eDEX-UI clone into `public/edex-assets/`

## Sync upstream assets

Set `EDEX_UI_SRC` to the **`src` directory** inside your eDEX-UI clone (contains `assets/` and `classes/`). Example (Windows PowerShell):

```powershell
$env:EDEX_UI_SRC = "E:\Personal\edex-ui\src"
npm run sync-edex-assets
```

Then uncomment the `/edex-assets/css/...` imports in `src/styles/edex-entry.css` and reload dev.

## License

Upstream eDEX-UI is GPL-3.0. This package is intended to track that lineage; confirm distribution with Termix maintainers before shipping.
