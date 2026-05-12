import { useCallback, useMemo, useSyncExternalStore } from "react";
import { normalizeRgbTriplet } from "@/ui/desktop/apps/edex/edexRgbTriplet.ts";
import { MAX_SHELL_THEME_IMPORT_JSON_CHARS } from "@/ui/desktop/apps/edex/edexThemeJson.ts";

export const EDEX_SETTINGS_STORAGE_KEY = "ui.edex";

export type EdexDefaultView = "terminal" | "fileManager" | "stats";
export type EdexThemeMode = "system" | "dark" | "light";
export type EdexDesktopLayout = "default" | "focus";
export type EdexMobileLayout = "stacked" | "tabs";
export type EdexShellUi = "classic" | "edex" | "edex-vite";

/** UI font for the full-screen eDEX shell (Google Fonts when not `system`). */
export type EdexShellUiFont = "system" | "exo2" | "rajdhani" | "share-tech-mono";

export type EdexKeyboardHudLayout = "us" | "iso";

export interface EdexConfig {
  enabled: boolean;
  /**
   * Controls whether Termix uses the classic desktop chrome, the integrated full-screen
   * eDEX shell (`edex`), or the standalone Phase A Vite shell (`edex-vite`) from `@termix/edex-vite-shell`.
   * Stored under the same `ui.edex` localStorage key as the rest of the eDEX settings.
   */
  shellUi: EdexShellUi;
  defaultView: EdexDefaultView;
  theme: EdexThemeMode;
  showFileBrowser: boolean;
  showSystemStats: boolean;
  showKeyboardOverlay: boolean;
  /** Physical keyboard layout for the on-screen HUD (`showKeyboardOverlay`). */
  keyboardHudLayout: EdexKeyboardHudLayout;
  /** Brief splash when entering the full-screen eDEX shell. */
  shellBootSplash: boolean;
  /**
   * After the splash is dismissed once in this browser tab, skip it for later
   * switches back into eDEX until the tab is closed.
   */
  shellBootSplashOncePerSession: boolean;
  /** Short boot chime when the splash is shown (default off; respects reduced motion). */
  shellBootSoundEnabled: boolean;
  /** 1–100; used only when `shellBootSoundEnabled` is true. */
  shellBootSoundVolume: number;
  /** Random one-liner under the boot hint (fiction layer; default off). */
  shellBootQuipEnabled: boolean;
  /** Decorative globe backdrop (CSS placeholder; WebGL can replace later). */
  globeEnabled: boolean;
  /** Plot saved SSH/telnet hosts as markers on the decorative globe (decorative positions). */
  globeShowHostMarkers: boolean;
  gridIntensity: number;
  /**
   * Space- or comma-separated RGB for shell neon on dark surfaces, e.g. `"34 211 238"`.
   * Applied to `document.documentElement` when `shellUi === "edex"`.
   */
  shellNeonRgb: string;
  /** Neon RGB for the light document surface (`html.light`). */
  shellNeonRgbLight: string;
  /** Shell chrome typography; non-`system` loads a stylesheet from Google Fonts. */
  shellUiFont: EdexShellUiFont;
  /**
   * Raw JSON string of an upstream-style theme object (e.g. full eDEX theme file).
   * Parsed when the eDEX shell applies document tokens; invalid JSON is ignored at runtime.
   */
  shellThemeImportJson: string;
  layout: {
    desktop: EdexDesktopLayout;
    mobile: EdexMobileLayout;
  };
}

export const DEFAULT_EDEX_CONFIG: EdexConfig = {
  enabled: true,
  shellUi: "classic",
  defaultView: "terminal",
  theme: "system",
  showFileBrowser: true,
  showSystemStats: true,
  showKeyboardOverlay: false,
  keyboardHudLayout: "us",
  shellBootSplash: true,
  shellBootSplashOncePerSession: true,
  shellBootSoundEnabled: false,
  shellBootSoundVolume: 18,
  shellBootQuipEnabled: false,
  globeEnabled: true,
  globeShowHostMarkers: true,
  gridIntensity: 55,
  shellNeonRgb: "34 211 238",
  shellNeonRgbLight: "8 145 178",
  shellUiFont: "exo2",
  shellThemeImportJson: "",
  layout: {
    desktop: "default",
    mobile: "stacked",
  },
};

const SERVER_SNAPSHOT: EdexConfig = {
  ...DEFAULT_EDEX_CONFIG,
  layout: { ...DEFAULT_EDEX_CONFIG.layout },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function getString<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function getShellThemeImportJson(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const t = value.trim();
  if (t.length <= MAX_SHELL_THEME_IMPORT_JSON_CHARS) {
    return t;
  }
  return t.slice(0, MAX_SHELL_THEME_IMPORT_JSON_CHARS);
}

function getVolumePercent(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getGridIntensity(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeEdexConfig(raw: unknown): EdexConfig {
  if (!isRecord(raw)) {
    return { ...DEFAULT_EDEX_CONFIG, layout: { ...DEFAULT_EDEX_CONFIG.layout } };
  }

  const rawLayout = isRecord(raw.layout) ? raw.layout : {};

  return {
    enabled: getBoolean(raw.enabled, DEFAULT_EDEX_CONFIG.enabled),
    shellUi: getString(
      raw.shellUi,
      ["classic", "edex", "edex-vite"] as const,
      DEFAULT_EDEX_CONFIG.shellUi,
    ),
    defaultView: getString(
      raw.defaultView,
      ["terminal", "fileManager", "stats"] as const,
      DEFAULT_EDEX_CONFIG.defaultView,
    ),
    theme: getString(
      raw.theme,
      ["system", "dark", "light"] as const,
      DEFAULT_EDEX_CONFIG.theme,
    ),
    showFileBrowser: getBoolean(
      raw.showFileBrowser,
      DEFAULT_EDEX_CONFIG.showFileBrowser,
    ),
    showSystemStats: getBoolean(
      raw.showSystemStats,
      DEFAULT_EDEX_CONFIG.showSystemStats,
    ),
    showKeyboardOverlay: getBoolean(
      raw.showKeyboardOverlay,
      DEFAULT_EDEX_CONFIG.showKeyboardOverlay,
    ),
    keyboardHudLayout: getString(
      raw.keyboardHudLayout,
      ["us", "iso"] as const,
      DEFAULT_EDEX_CONFIG.keyboardHudLayout,
    ),
    shellBootSplash: getBoolean(
      raw.shellBootSplash,
      DEFAULT_EDEX_CONFIG.shellBootSplash,
    ),
    shellBootSplashOncePerSession: getBoolean(
      raw.shellBootSplashOncePerSession,
      DEFAULT_EDEX_CONFIG.shellBootSplashOncePerSession,
    ),
    shellBootSoundEnabled: getBoolean(
      raw.shellBootSoundEnabled,
      DEFAULT_EDEX_CONFIG.shellBootSoundEnabled,
    ),
    shellBootSoundVolume: getVolumePercent(
      raw.shellBootSoundVolume,
      DEFAULT_EDEX_CONFIG.shellBootSoundVolume,
    ),
    shellBootQuipEnabled: getBoolean(
      raw.shellBootQuipEnabled,
      DEFAULT_EDEX_CONFIG.shellBootQuipEnabled,
    ),
    globeEnabled: getBoolean(raw.globeEnabled, DEFAULT_EDEX_CONFIG.globeEnabled),
    globeShowHostMarkers: getBoolean(
      raw.globeShowHostMarkers,
      DEFAULT_EDEX_CONFIG.globeShowHostMarkers,
    ),
    gridIntensity: getGridIntensity(
      raw.gridIntensity,
      DEFAULT_EDEX_CONFIG.gridIntensity,
    ),
    shellNeonRgb: normalizeRgbTriplet(
      typeof raw.shellNeonRgb === "string" ? raw.shellNeonRgb : undefined,
      DEFAULT_EDEX_CONFIG.shellNeonRgb,
    ),
    shellNeonRgbLight: normalizeRgbTriplet(
      typeof raw.shellNeonRgbLight === "string" ? raw.shellNeonRgbLight : undefined,
      DEFAULT_EDEX_CONFIG.shellNeonRgbLight,
    ),
    shellUiFont: getString(
      raw.shellUiFont,
      ["system", "exo2", "rajdhani", "share-tech-mono"] as const,
      DEFAULT_EDEX_CONFIG.shellUiFont,
    ),
    shellThemeImportJson: getShellThemeImportJson(
      raw.shellThemeImportJson,
      DEFAULT_EDEX_CONFIG.shellThemeImportJson,
    ),
    layout: {
      desktop: getString(
        rawLayout.desktop,
        ["default", "focus"] as const,
        DEFAULT_EDEX_CONFIG.layout.desktop,
      ),
      mobile: getString(
        rawLayout.mobile,
        ["stacked", "tabs"] as const,
        DEFAULT_EDEX_CONFIG.layout.mobile,
      ),
    },
  };
}

function readEdexConfigFromStorage(): EdexConfig {
  if (typeof window === "undefined") {
    return { ...DEFAULT_EDEX_CONFIG, layout: { ...DEFAULT_EDEX_CONFIG.layout } };
  }

  try {
    const raw = window.localStorage.getItem(EDEX_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_EDEX_CONFIG, layout: { ...DEFAULT_EDEX_CONFIG.layout } };
    }

    return normalizeEdexConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_EDEX_CONFIG, layout: { ...DEFAULT_EDEX_CONFIG.layout } };
  }
}

let clientConfig: EdexConfig = {
  ...DEFAULT_EDEX_CONFIG,
  layout: { ...DEFAULT_EDEX_CONFIG.layout },
};

/** Ensures first client render reads localStorage before subscribe runs. */
let clientSnapshotHydrated = false;

const edexConfigListeners = new Set<() => void>();

function emitEdexConfig(): void {
  edexConfigListeners.forEach((listener) => listener());
}

function persistEdexConfig(config: EdexConfig): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(EDEX_SETTINGS_STORAGE_KEY, JSON.stringify(config));
}

function patchEdexConfig(partial: Partial<EdexConfig>): void {
  clientConfig = normalizeEdexConfig({
    ...clientConfig,
    ...partial,
    layout: {
      ...clientConfig.layout,
      ...(partial.layout ?? {}),
    },
  });
  persistEdexConfig(clientConfig);
  emitEdexConfig();
}

/** Full replace; input is always normalized before assign/persist. */
export function replaceEdexSettings(raw: unknown): void {
  clientConfig = normalizeEdexConfig(raw);
  persistEdexConfig(clientConfig);
  emitEdexConfig();
}

function getEdexConfigSnapshot(): EdexConfig {
  if (typeof window !== "undefined" && !clientSnapshotHydrated) {
    clientSnapshotHydrated = true;
    clientConfig = readEdexConfigFromStorage();
  }
  return clientConfig;
}

function getEdexConfigServerSnapshot(): EdexConfig {
  return SERVER_SNAPSHOT;
}

function subscribeEdexConfig(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  clientConfig = readEdexConfigFromStorage();

  edexConfigListeners.add(onStoreChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== EDEX_SETTINGS_STORAGE_KEY) {
      return;
    }
    clientConfig = readEdexConfigFromStorage();
    emitEdexConfig();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    edexConfigListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useEdexSettings() {
  const config = useSyncExternalStore(
    subscribeEdexConfig,
    getEdexConfigSnapshot,
    getEdexConfigServerSnapshot,
  );

  const updateConfig = useCallback((partial: Partial<EdexConfig>) => {
    patchEdexConfig(partial);
  }, []);

  return useMemo(() => ({ config, updateConfig }), [config, updateConfig]);
}
