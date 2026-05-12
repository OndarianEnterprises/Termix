import React, { createContext, useContext, type ReactNode } from "react";

/**
 * When true, classic Termix surfaces (AppView, Host manager, etc.) render under
 * {@link EdexShell}, which already provides the tab strip — they must not add a
 * second top inset or use `100vh` for height (parent is a flex stage, not the viewport).
 */
const EdexShellFrameContext = createContext<boolean>(false);

export function EdexShellFrameProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <EdexShellFrameContext.Provider value={true}>
      {children}
    </EdexShellFrameContext.Provider>
  );
}

export function useEdexShellEmbeddedStage(): boolean {
  return useContext(EdexShellFrameContext);
}
