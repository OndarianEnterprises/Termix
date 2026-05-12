import { createContext, useContext, type ReactNode } from "react";

/**
 * Injected when Termix embeds the shell (`shellUi: "edex-vite"`).
 * Standalone dev leaves this context undefined.
 */
export type EdexTermixBridgeSession = {
  hostConfig: Record<string, unknown>;
  instanceId?: string;
  /** Bumps when `TabContext` updates the same tab (e.g. host edits). */
  hostRevision?: number;
  initialPath?: string;
  executeCommand?: string;
};

export type EdexTermixBridgeValue = {
  baseWsUrl: string | null;
  baseWsUrlError: string | null;
  session: EdexTermixBridgeSession | null;
};

const EdexTermixBridgeContext = createContext<EdexTermixBridgeValue | undefined>(
  undefined,
);

export function EdexTermixBridgeProvider({
  value,
  children,
}: {
  value: EdexTermixBridgeValue;
  children: ReactNode;
}) {
  return (
    <EdexTermixBridgeContext.Provider value={value}>
      {children}
    </EdexTermixBridgeContext.Provider>
  );
}

export function useEdexTermixBridge(): EdexTermixBridgeValue | undefined {
  return useContext(EdexTermixBridgeContext);
}
