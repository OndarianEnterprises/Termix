import { edexAssetsUrl } from "../utils/edexAssetsUrl";

export interface EdexThemeRgb {
  r: number;
  g: number;
  b: number;
}

/** Globe tint strings from theme JSON (hex or CSS color). */
export interface EdexGlobeThemeColors {
  base: string;
  marker: string;
  pin: string;
  satellite: string;
}

/** Theme fields needed for boot, shell, and globe (single `loadEdexTheme` fetch). */
export interface EdexLoadedTheme {
  rgb: EdexThemeRgb;
  fontMain: string;
  lightBlack: string;
  globe: EdexGlobeThemeColors;
}

/** Fallback matches `assets/themes/tron.json` colors. */
export const FALLBACK_THEME_RGB: EdexThemeRgb = { r: 170, g: 207, b: 209 };

const FALLBACK_RGB_CSS = "rgb(170, 207, 209)";

export const FALLBACK_LOADED_THEME: EdexLoadedTheme = {
  rgb: FALLBACK_THEME_RGB,
  fontMain: "United Sans Medium",
  lightBlack: "#05080d",
  globe: {
    base: "#000000",
    marker: FALLBACK_RGB_CSS,
    pin: FALLBACK_RGB_CSS,
    satellite: FALLBACK_RGB_CSS,
  },
};

interface EdexThemeJson {
  colors: {
    r: number;
    g: number;
    b: number;
    black?: string;
    light_black?: string;
    grey?: string;
    red?: string;
    yellow?: string;
  };
  cssvars: {
    font_main: string;
    font_main_light: string;
  };
  terminal: { fontFamily: string };
  injectCSS?: string;
  globe?: {
    base?: string;
    marker?: string;
    pin?: string;
    satellite?: string;
  };
}

function sanitizeCssValue(value: string): string {
  return value.replace(/</g, "");
}

function rgbCss(c: EdexThemeRgb): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

function buildGlobeColors(theme: EdexThemeJson, rgb: EdexThemeRgb): EdexGlobeThemeColors {
  const g = theme.globe;
  const fallback = rgbCss(rgb);
  return {
    base: g?.base ?? "#000000",
    marker: g?.marker ?? fallback,
    pin: g?.pin ?? fallback,
    satellite: g?.satellite ?? fallback,
  };
}

/**
 * Loads default theme JSON from synced assets, registers WOFF2 fonts, and
 * injects `:root` variables expected by upstream `main.css` / `boot_screen.css`.
 */
export async function loadEdexTheme(
  themePath = edexAssetsUrl("themes/tron.json"),
): Promise<EdexLoadedTheme> {
  let theme: EdexThemeJson;
  try {
    const res = await fetch(themePath);
    if (!res.ok) throw new Error(String(res.status));
    theme = (await res.json()) as EdexThemeJson;
  } catch {
    applyThemingStyle(FALLBACK_THEME_RGB, {
      font_main: "United Sans Medium",
      font_main_light: "United Sans Light",
      font_mono: "Fira Mono",
      black: "#000000",
      light_black: "#05080d",
      grey: "#262828",
    });
    return FALLBACK_LOADED_THEME;
  }

  const { colors, cssvars, terminal } = theme;
  const rgb = { r: colors.r, g: colors.g, b: colors.b };

  const fontBase = edexAssetsUrl("fonts");
  const fontFile = (name: string) =>
    `${fontBase}/${name.toLowerCase().replace(/ /g, "_")}.woff2`;

  try {
    const mainUrl = fontFile(cssvars.font_main);
    const lightUrl = fontFile(cssvars.font_main_light);
    const monoUrl = fontFile(terminal.fontFamily);
    const main = new FontFace(cssvars.font_main, `url(${JSON.stringify(mainUrl)})`);
    const light = new FontFace(cssvars.font_main_light, `url(${JSON.stringify(lightUrl)})`);
    const mono = new FontFace(terminal.fontFamily, `url(${JSON.stringify(monoUrl)})`);
    await Promise.all([
      main.load().then(() => document.fonts.add(main)),
      light.load().then(() => document.fonts.add(light)),
      mono.load().then(() => document.fonts.add(mono)),
    ]);
  } catch {
    /* fonts optional — CSS falls back to sans-serif */
  }

  applyThemingStyle(rgb, {
    font_main: cssvars.font_main,
    font_main_light: cssvars.font_main_light,
    font_mono: terminal.fontFamily,
    black: colors.black ?? "#000000",
    light_black: colors.light_black ?? "#05080d",
    grey: colors.grey ?? "#262828",
    red: colors.red,
    yellow: colors.yellow,
    injectCSS: theme.injectCSS,
  });

  return {
    rgb,
    fontMain: cssvars.font_main,
    lightBlack: colors.light_black ?? "#05080d",
    globe: buildGlobeColors(theme, rgb),
  };
}

function applyThemingStyle(
  rgb: EdexThemeRgb,
  opts: {
    font_main: string;
    font_main_light: string;
    font_mono: string;
    black: string;
    light_black: string;
    grey: string;
    red?: string;
    yellow?: string;
    injectCSS?: string;
  },
): void {
  const existing = document.querySelector("style[data-edex-theming]");
  existing?.remove();

  const el = document.createElement("style");
  el.setAttribute("data-edex-theming", "true");
  el.textContent = `
    :root {
      --font_main: ${JSON.stringify(opts.font_main)};
      --font_main_light: ${JSON.stringify(opts.font_main_light)};
      --font_mono: ${JSON.stringify(opts.font_mono)};
      --color_r: ${rgb.r};
      --color_g: ${rgb.g};
      --color_b: ${rgb.b};
      --color_black: ${JSON.stringify(opts.black)};
      --color_light_black: ${JSON.stringify(opts.light_black)};
      --color_grey: ${JSON.stringify(opts.grey)};
      --color_red: ${JSON.stringify(opts.red || "red")};
      --color_yellow: ${JSON.stringify(opts.yellow || "yellow")};
    }
    body {
      font-family: var(--font_main), ui-sans-serif, system-ui, sans-serif;
    }
    ${opts.injectCSS ? sanitizeCssValue(opts.injectCSS) : ""}
  `;
  document.head.appendChild(el);
}
