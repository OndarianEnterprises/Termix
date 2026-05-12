/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Skip boot log + title; go straight to main shell. */
  readonly VITE_EDEX_SKIP_BOOT?: string;
  /** Stream more boot log lines (closer to upstream). */
  readonly VITE_EDEX_BOOT_FULL?: string;
  /** Optional welcome name in main shell greeting. */
  readonly VITE_EDEX_DISPLAY_NAME?: string;
  /** Keyboard layout base name under `/edex-assets/kb_layouts/` (default `en-US`). */
  readonly VITE_EDEX_KB_LAYOUT?: string;
  /** Skip loading ENCOM WebGL globe (static placeholder). */
  readonly VITE_EDEX_SKIP_GLOBE?: string;
  /** Mock latitude for globe header / pins (default `37.7749`). */
  readonly VITE_EDEX_GLOBE_MOCK_LAT?: string;
  /** Mock longitude (default `-122.4194`). */
  readonly VITE_EDEX_GLOBE_MOCK_LON?: string;
  /** Optional WebSocket URL (JSON `input` / `data` framing like Termix; no `connectToHost` from this shell). */
  readonly VITE_EDEX_TERMINAL_WS?: string;
  /** Set to `1` to enable short WebAudio SFX stubs (default silent). */
  readonly VITE_EDEX_AUDIO?: string;
  /** Shown in the Termix about modal (defaults to a fixed app version string in code). */
  readonly VITE_TERMX_APP_VERSION?: string;
  readonly VITE_EDEX_APP_VERSION?: string;
}
