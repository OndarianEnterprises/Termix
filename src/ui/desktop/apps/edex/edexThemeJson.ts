/**
 * Subset of GitSquared/eDEX-UI theme JSON semantics for future import / tooling.
 * See https://github.com/GitSquared/edex-ui/wiki/Themes — keys vary by upstream version;
 * we only surface stable string color slots that map cleanly to CSS variables.
 */

const THEME_VAR_PREFIX = "--edex-shell-theme-";

/** Max length for `EdexConfig.shellThemeImportJson` (localStorage safety). */
export const MAX_SHELL_THEME_IMPORT_JSON_CHARS = 100_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Upstream-style `colors` map (string CSS colors). */
export type EdexUpstreamThemeColors = Partial<
  Record<
    | "accent"
    | "accent_text"
    | "border"
    | "highlighter"
    | "highlighter_text"
    | "background",
    string
  >
>;

export type EdexUpstreamThemeJson = {
  colors?: EdexUpstreamThemeColors;
};

const COLOR_KEYS = [
  "accent",
  "accent_text",
  "border",
  "highlighter",
  "highlighter_text",
  "background",
] as const satisfies readonly (keyof EdexUpstreamThemeColors)[];

const KEY_TO_CSS: Record<(typeof COLOR_KEYS)[number], string> = {
  accent: "accent",
  accent_text: "accent-text",
  border: "border",
  highlighter: "highlighter",
  highlighter_text: "highlighter-text",
  background: "background",
};

/** Parses clipboard / storage text into JSON, or `null` if empty / invalid. */
export function parseShellThemeImportJson(text: string): unknown | null {
  const t = text.trim();
  if (!t.length) {
    return null;
  }
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

/** Picks known `colors` keys from arbitrary JSON (e.g. pasted theme file). */
export function normalizeEdexThemeJson(raw: unknown): EdexUpstreamThemeJson {
  if (!isRecord(raw)) {
    return {};
  }
  const src = raw.colors;
  if (!isRecord(src)) {
    return {};
  }
  const colors: EdexUpstreamThemeColors = {};
  for (const key of COLOR_KEYS) {
    const v = src[key];
    if (typeof v === "string" && v.trim().length > 0) {
      colors[key] = v.trim();
    }
  }
  return Object.keys(colors).length > 0 ? { colors } : {};
}

export function applyEdexImportedThemeCssVars(
  root: HTMLElement,
  raw: unknown,
): void {
  clearEdexImportedThemeCssVars(root);
  const theme = normalizeEdexThemeJson(raw);
  if (!theme.colors) {
    return;
  }
  for (const key of COLOR_KEYS) {
    const val = theme.colors[key];
    if (!val) continue;
    const cssKey = KEY_TO_CSS[key];
    root.style.setProperty(`${THEME_VAR_PREFIX}${cssKey}`, val);
  }
}

export function clearEdexImportedThemeCssVars(root: HTMLElement): void {
  for (const key of COLOR_KEYS) {
    const cssKey = KEY_TO_CSS[key];
    root.style.removeProperty(`${THEME_VAR_PREFIX}${cssKey}`);
  }
}
