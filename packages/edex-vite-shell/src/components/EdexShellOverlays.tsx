import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { edexAudioFx } from "../audio/edexAudioPlaceholder";
import { useEdexMockFs } from "../context/EdexMockFsContext";
import { joinPath, listMockDir } from "../fs/mockFsData";
import { EdexModalPopup } from "./EdexModalPopup";

const SESSION_AUTO_ABOUT_KEY = "termix.edex.v1.autoAbout";

function readAppVersion(): string {
  const v = import.meta.env.VITE_TERMX_APP_VERSION ?? import.meta.env.VITE_EDEX_APP_VERSION;
  if (typeof v === "string" && v.trim()) return v.trim();
  return "2.2.0";
}

type StackedModal = { id: string; kind: "about" } | { id: string; kind: "fuzzy" };

export interface EdexShellOverlaysContextValue {
  openTermixAbout: () => void;
  openFuzzyFinder: () => void;
}

const EdexShellOverlaysContext = createContext<EdexShellOverlaysContextValue | null>(
  null,
);

export function useEdexShellOverlays(): EdexShellOverlaysContextValue {
  const v = useContext(EdexShellOverlaysContext);
  if (!v) {
    throw new Error("useEdexShellOverlays must be used within EdexShellOverlays");
  }
  return v;
}

function AboutBody() {
  const ver = readAppVersion();
  return (
    <>
      <strong>Termix</strong> eDEX-style shell (Vite, mock data). Replaces upstream
      GitHub update checks with this static panel.
      <br />
      <br />
      App version: <strong>{ver}</strong>
      <br />
      Shortcuts: <kbd>Ctrl+Shift+B</kbd> about, <kbd>Ctrl+Shift+F</kbd> fuzzy finder (cwd
      matches the filesystem strip), <kbd>Escape</kbd> close focused modal.
    </>
  );
}

function FuzzyFinderStackItem({
  id,
  zIndex,
  isFocused,
  isClosing,
  initialLeft,
  initialTop,
  onFocus,
  onMouseDownCapture,
  requestClose,
}: {
  id: string;
  zIndex: number;
  isFocused: boolean;
  isClosing: boolean;
  initialLeft: number;
  initialTop: number;
  onFocus: () => void;
  onMouseDownCapture: () => void;
  requestClose: () => void;
}) {
  const { cwd } = useEdexMockFs();

  const names = useMemo(() => {
    const entries = listMockDir(cwd).filter((e) => e.name !== "..");
    return entries.map((e) => e.name);
  }, [cwd]);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = names.filter((n) => (q ? n.toLowerCase().includes(q) : true));
    hit.sort((a, b) => {
      const as = a.toLowerCase().startsWith(q);
      const bs = b.toLowerCase().startsWith(q);
      if (as && !bs) return -1;
      if (!as && bs) return 1;
      return a.localeCompare(b);
    });
    return hit.slice(0, 5);
  }, [names, query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (selected >= matches.length) setSelected(Math.max(0, matches.length - 1));
  }, [matches.length, selected]);

  useEffect(() => {
    if (isClosing) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [isClosing]);

  const moveSel = (delta: number) => {
    if (matches.length === 0) return;
    setSelected((i) => (i + delta + matches.length) % matches.length);
  };

  const submit = () => {
    const name = matches[selected];
    if (name) {
      edexAudioFx.play("click");
      const fullPath = joinPath(cwd, name);
      console.info("[edex-vite-shell] fuzzy select (mock):", fullPath);
    }
    requestClose();
  };

  const rows = useMemo(() => {
    if (matches.length === 0) return ["No results", "", "", "", ""];
    const r = [...matches];
    while (r.length < 5) r.push("");
    return r.slice(0, 5);
  }, [matches]);

  return (
    <EdexModalPopup
      id={id}
      level="custom"
      title="Fuzzy cwd file search"
      plainMessage={false}
      augmentedUi="tr-clip bl-clip exe"
      zIndex={zIndex}
      isFocused={isFocused}
      isClosing={isClosing}
      initialLeft={initialLeft}
      initialTop={initialTop}
      onFocus={onFocus}
      onMouseDownCapture={onMouseDownCapture}
      content={
        <>
          <input
            ref={inputRef}
            type="search"
            id="fuzzyFinder"
            placeholder="Search file in cwd..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                moveSel(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                moveSel(-1);
              }
            }}
          />
          <ul id="fuzzyFinder-results">
            {rows.map((label, i) => {
              const hasHits = matches.length > 0;
              const sel = hasHits && i === selected;
              return (
                <li
                  key={`${label}-${i}`}
                  id={hasHits ? `fuzzyFinderMatch-${i}` : undefined}
                  className={sel ? "fuzzyFinderMatchSelected" : undefined}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (hasHits) setSelected(i);
                  }}
                >
                  {label || "\u00a0"}
                </li>
              );
            })}
          </ul>
        </>
      }
      buttons={[
        { label: "Select", onClick: submit },
        { label: "Close", onClick: requestClose },
      ]}
    />
  );
}

export interface EdexShellOverlaysProps {
  children: ReactNode;
}

export function EdexShellOverlays({ children }: EdexShellOverlaysProps) {
  const [modals, setModals] = useState<StackedModal[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [closingIds, setClosingIds] = useState(() => new Set<string>());
  const modalsRef = useRef(modals);
  modalsRef.current = modals;
  const focusedRef = useRef(focusedId);
  focusedRef.current = focusedId;

  useEffect(() => {
    if (focusedId && modals.some((m) => m.id === focusedId)) return;
    setFocusedId(modals.at(-1)?.id ?? null);
  }, [modals, focusedId]);

  const requestClose = useCallback((id: string) => {
    edexAudioFx.play("denied");
    setClosingIds((s) => new Set(s).add(id));
    window.setTimeout(() => {
      setModals((m) => m.filter((x) => x.id !== id));
      setClosingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, 100);
  }, []);

  const openTermixAbout = useCallback(() => {
    edexAudioFx.play("info");
    const id = crypto.randomUUID();
    setModals((m) => [...m, { id, kind: "about" }]);
    setFocusedId(id);
  }, []);

  const openFuzzyFinder = useCallback(() => {
    setModals((m) => {
      if (m.some((x) => x.kind === "fuzzy")) return m;
      const id = crypto.randomUUID();
      queueMicrotask(() => {
        edexAudioFx.play("info");
        setFocusedId(id);
      });
      return [...m, { id, kind: "fuzzy" }];
    });
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_AUTO_ABOUT_KEY)) return;
    const t = window.setTimeout(() => {
      if (sessionStorage.getItem(SESSION_AUTO_ABOUT_KEY)) return;
      sessionStorage.setItem(SESSION_AUTO_ABOUT_KEY, "1");
      if (modalsRef.current.some((m) => m.kind === "about")) return;
      openTermixAbout();
    }, 2000);
    return () => window.clearTimeout(t);
  }, [openTermixAbout]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const stack = modalsRef.current;
        const top = focusedRef.current ?? stack.at(-1)?.id;
        if (top) {
          e.preventDefault();
          e.stopPropagation();
          requestClose(top);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        openFuzzyFinder();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        openTermixAbout();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [openFuzzyFinder, openTermixAbout, requestClose]);

  const ctx = useMemo<EdexShellOverlaysContextValue>(
    () => ({ openTermixAbout, openFuzzyFinder }),
    [openFuzzyFinder, openTermixAbout],
  );

  const w = typeof window !== "undefined" ? window.innerWidth : 800;
  const h = typeof window !== "undefined" ? window.innerHeight : 600;

  return (
    <EdexShellOverlaysContext.Provider value={ctx}>
      {children}
      <div
        id="edex-modal-root"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2400,
        }}
      >
        {modals.map((entry, index) => {
          const isFocused = entry.id === focusedId;
          const z = 520 + index * 18 + (isFocused ? 220 : 0);
          const isClosing = closingIds.has(entry.id);
          const initialLeft = Math.round(w * 0.08 + index * 28);
          const initialTop = Math.round(h * 0.06 + index * 24);
          const onFocus = () => setFocusedId(entry.id);
          const onCap = () => setFocusedId(entry.id);

          if (entry.kind === "fuzzy") {
            return (
              <div
                key={entry.id}
                style={{ pointerEvents: "auto", position: "static" }}
              >
                <FuzzyFinderStackItem
                  id={entry.id}
                  zIndex={z}
                  isFocused={isFocused}
                  isClosing={isClosing}
                  initialLeft={initialLeft}
                  initialTop={initialTop}
                  onFocus={onFocus}
                  onMouseDownCapture={onCap}
                  requestClose={() => requestClose(entry.id)}
                />
              </div>
            );
          }

          return (
            <div
              key={entry.id}
              style={{ pointerEvents: "auto", position: "static" }}
            >
              <EdexModalPopup
                id={entry.id}
                level="info"
                title="Termix (eDEX shell)"
                plainMessage
                augmentedUi="tr-clip bl-clip exe"
                zIndex={z}
                isFocused={isFocused}
                isClosing={isClosing}
                initialLeft={initialLeft}
                initialTop={initialTop}
                onFocus={onFocus}
                onMouseDownCapture={onCap}
                content={<AboutBody />}
                buttons={[{ label: "OK", onClick: () => requestClose(entry.id) }]}
              />
            </div>
          );
        })}
      </div>
    </EdexShellOverlaysContext.Provider>
  );
}
