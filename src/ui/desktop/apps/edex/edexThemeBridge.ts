import type { EdexConfig, EdexThemeMode } from "@/ui/desktop/apps/edex/edexSettings.ts";
import { normalizeRgbTriplet } from "@/ui/desktop/apps/edex/edexRgbTriplet.ts";
import {
  clearEdexShellFontLink,
  edexShellFontStack,
  syncEdexShellFontLink,
} from "@/ui/desktop/apps/edex/edexFontLoader.ts";
import {
  applyEdexImportedThemeCssVars,
  clearEdexImportedThemeCssVars,
  parseShellThemeImportJson,
} from "@/ui/desktop/apps/edex/edexThemeJson.ts";

export type EdexShellSurface = "dark" | "light";

/** Inline style keys we own on `document.documentElement` while eDEX shell is active. */
export const EDEX_SHELL_THEME_VAR_KEYS = [
  "--edex-shell-neon-rgb",
  "--edex-shell-grid-alpha",
  "--edex-shell-radial-alpha",
  "--edex-shell-frame-alpha",
  "--edex-shell-ui-font",
] as const;

export function resolveEdexShellSurface(
  edexTheme: EdexThemeMode,
  appIsDark: boolean,
): EdexShellSurface {
  if (edexTheme === "light") {
    return "light";
  }
  if (edexTheme === "dark") {
    return "dark";
  }
  return appIsDark ? "dark" : "light";
}

function gridAlphaFromIntensity(intensity: number): number {
  const g = Math.max(0, Math.min(100, intensity));
  return 0.02 + (g / 100) * 0.12;
}

export function clearEdexShellThemeVars(root: HTMLElement): void {
  clearEdexShellFontLink();
  clearEdexImportedThemeCssVars(root);
  for (const key of EDEX_SHELL_THEME_VAR_KEYS) {
    root.style.removeProperty(key);
  }
}

/**
 * Pushes eDEX shell visual tokens to the document root so `edexShellTheme.css`
 * can stay declarative while still following `ui.edex` settings.
 */
export function applyEdexShellThemeVars(
  root: HTMLElement,
  config: EdexConfig,
  surface: EdexShellSurface,
): void {
  const neon =
    surface === "light"
      ? normalizeRgbTriplet(config.shellNeonRgbLight, "8 145 178")
      : normalizeRgbTriplet(config.shellNeonRgb, "34 211 238");

  const gridAlpha = gridAlphaFromIntensity(config.gridIntensity);
  const radialAlpha = surface === "light" ? 0.1 : 0.14;
  const frameAlpha = surface === "light" ? 0.09 : 0.12;

  syncEdexShellFontLink(config.shellUiFont);
  root.style.setProperty("--edex-shell-ui-font", edexShellFontStack(config.shellUiFont));
  root.style.setProperty("--edex-shell-neon-rgb", neon);
  root.style.setProperty("--edex-shell-grid-alpha", String(gridAlpha));
  root.style.setProperty("--edex-shell-radial-alpha", String(radialAlpha));
  root.style.setProperty("--edex-shell-frame-alpha", String(frameAlpha));

  const importText = config.shellThemeImportJson.trim();
  if (importText.length > 0) {
    const parsed = parseShellThemeImportJson(importText);
    if (parsed !== null) {
      applyEdexImportedThemeCssVars(root, parsed);
    } else {
      clearEdexImportedThemeCssVars(root);
    }
  } else {
    clearEdexImportedThemeCssVars(root);
  }
}
