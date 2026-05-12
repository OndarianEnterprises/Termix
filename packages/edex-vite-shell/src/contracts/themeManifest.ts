/**
 * Serializable eDEX theme document (import/export, Termix `ui.edex` bridge).
 * Narrower than full upstream theme JSON; extend with optional fields as needed.
 */

import type { EdexGlobeThemeColors } from "../theme/loadEdexTheme";

export interface ThemeManifest {
  schemaVersion: 1;
  /** Slug or file stem (e.g. `tron`). */
  id: string;
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
  globe?: Partial<EdexGlobeThemeColors>;
}
