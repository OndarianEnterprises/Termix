/**
 * URL for static files under `dist/edex-assets/` (synced from the workspace package `public/` tree).
 * Uses Vite `base` so paths stay correct when the app is not served from `/`.
 */
export function edexAssetsUrl(pathWithinEdexAssets: string): string {
  const rel = pathWithinEdexAssets.replace(/^\/+/, "");
  const base = String(import.meta.env.BASE_URL ?? "/");

  if (base === "/" || base === "") {
    return `/edex-assets/${rel}`.replace(/\/+/g, "/");
  }

  if (base.startsWith(".")) {
    if (!globalThis.window) {
      return `/edex-assets/${rel}`.replace(/\/+/g, "/");
    }
    const resolved = new URL(
      `edex-assets/${rel}`,
      new URL(base, document.baseURI),
    );
    return `${resolved.pathname}${resolved.search}`;
  }

  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${prefix}/edex-assets/${rel}`.replace(/\/+/g, "/");
}
