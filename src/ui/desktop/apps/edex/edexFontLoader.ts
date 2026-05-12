import type { EdexShellUiFont } from "@/ui/desktop/apps/edex/edexSettings.ts";

const FONT_STYLESHEET_LINK_ID = "termix-edex-google-font";

const GOOGLE_FONT_CSS: Record<Exclude<EdexShellUiFont, "system">, string> = {
  exo2:
    "https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600&display=swap",
  rajdhani:
    "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600&display=swap",
  "share-tech-mono":
    "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap",
};

export function edexShellFontStack(preset: EdexShellUiFont): string {
  switch (preset) {
    case "exo2":
      return '"Exo 2", ui-sans-serif, system-ui, sans-serif';
    case "rajdhani":
      return '"Rajdhani", ui-sans-serif, system-ui, sans-serif';
    case "share-tech-mono":
      return '"Share Tech Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    default:
      return "ui-sans-serif, system-ui, sans-serif";
  }
}

export function clearEdexShellFontLink(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.getElementById(FONT_STYLESHEET_LINK_ID)?.remove();
}

/**
 * Ensures a Google Fonts stylesheet is present when a non-system preset is selected.
 * Uses a single `<link>` whose `href` updates when the preset changes.
 */
export function syncEdexShellFontLink(preset: EdexShellUiFont): void {
  if (typeof document === "undefined") {
    return;
  }
  if (preset === "system") {
    clearEdexShellFontLink();
    return;
  }
  const href = GOOGLE_FONT_CSS[preset];
  let link = document.getElementById(FONT_STYLESHEET_LINK_ID) as
    | HTMLLinkElement
    | null;
  if (!link) {
    link = document.createElement("link");
    link.id = FONT_STYLESHEET_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) {
    link.setAttribute("href", href);
  }
}
