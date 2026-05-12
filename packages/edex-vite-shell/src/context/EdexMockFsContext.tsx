import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { normalizePath } from "../fs/mockFsData";

export interface EdexMockFsContextValue {
  /** Current directory for mock listings and fuzzy finder. */
  cwd: string;
  setCwd: (path: string) => void;
}

const EdexMockFsContext = createContext<EdexMockFsContextValue | null>(null);

const DEFAULT_CWD = "/mock/home";

export function EdexMockFsProvider({ children }: { children: ReactNode }) {
  const [cwd, setCwdState] = useState(DEFAULT_CWD);

  const setCwd = useCallback((path: string) => {
    setCwdState(normalizePath(path));
  }, []);

  const normalized = useMemo(() => normalizePath(cwd), [cwd]);

  const value = useMemo<EdexMockFsContextValue>(
    () => ({ cwd: normalized, setCwd }),
    [normalized, setCwd],
  );

  return (
    <EdexMockFsContext.Provider value={value}>{children}</EdexMockFsContext.Provider>
  );
}

export function useEdexMockFs(): EdexMockFsContextValue {
  const v = useContext(EdexMockFsContext);
  if (!v) {
    throw new Error("useEdexMockFs must be used within EdexMockFsProvider");
  }
  return v;
}
