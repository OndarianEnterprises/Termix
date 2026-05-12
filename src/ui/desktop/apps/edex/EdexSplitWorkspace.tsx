import type { ReactNode } from "react";

/**
 * Root wrapper for `AppView` split layouts when the view is embedded in `EdexShell`
 * (`EdexTabStage`). Classic `AppView` keeps the plain absolute container; eDEX mode
 * routes the same `ResizablePanelGroup` tree through this shell for panel chrome and
 * scoped styling (`edexShellTheme.css`).
 */
export function EdexSplitWorkspace({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="edex-split-workspace absolute inset-0 z-[10] pointer-events-none min-h-0 h-full w-full">
      {children}
    </div>
  );
}
