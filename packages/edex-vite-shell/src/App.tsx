import { useCallback, useEffect, useState } from "react";
import "./styles/edex-entry.css";
import { EdexBootSequence } from "./components/EdexBootSequence";
import { EdexMainShellLayout } from "./components/EdexMainShellLayout";
import { EdexShellOverlays } from "./components/EdexShellOverlays";
import { EdexMockFsProvider } from "./context/EdexMockFsContext";
import {
  FALLBACK_LOADED_THEME,
  loadEdexTheme,
  type EdexLoadedTheme,
} from "./theme/loadEdexTheme";

function readDisplayName(): string | null {
  const v = import.meta.env.VITE_EDEX_DISPLAY_NAME;
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return null;
}

export function App() {
  const [loadedTheme, setLoadedTheme] =
    useState<EdexLoadedTheme>(FALLBACK_LOADED_THEME);
  const [showBoot, setShowBoot] = useState(true);
  const displayName = readDisplayName();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadEdexTheme();
      if (!cancelled) setLoadedTheme(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showBoot) {
      document.body.classList.add("solidBackground");
    }
  }, [showBoot]);

  const handleBootDone = useCallback(() => {
    setShowBoot(false);
  }, []);

  return (
    <>
      {showBoot ? (
        <EdexBootSequence themeRgb={loadedTheme.rgb} onDone={handleBootDone} />
      ) : (
        <EdexMockFsProvider>
          <EdexShellOverlays>
            <EdexMainShellLayout displayName={displayName} theme={loadedTheme} />
          </EdexShellOverlays>
        </EdexMockFsProvider>
      )}
    </>
  );
}
