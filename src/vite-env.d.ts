/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to `"1"` to force classic desktop chrome regardless of `ui.edex.shellUi`. */
  readonly VITE_TERMX_CLASSIC_UI?: string;
}
