import React, { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { SSHHost, TabContextTab } from "@/types";
import { useTabs } from "@/ui/desktop/navigation/tabs/TabContext.tsx";
import { Terminal } from "@/ui/desktop/apps/features/terminal/Terminal.tsx";
import { ServerStats } from "@/ui/desktop/apps/features/server-stats/ServerStats.tsx";
import { FileManager } from "@/ui/desktop/apps/features/file-manager/FileManager.tsx";
import {
  useEdexSettings,
  type EdexDefaultView,
} from "@/ui/desktop/apps/edex/edexSettings.ts";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import { useTheme } from "@/components/theme-provider";
import "./edexLayout.css";
import { EdexKeyboardHud } from "@/ui/desktop/apps/edex/EdexKeyboardHud.tsx";

interface EdexLayoutProps {
  /**
   * `classic`: embedded inside the normal floating-window chrome (legacy tab mode).
   * `edex`: rendered as the primary workspace inside `EdexShell` (full-screen shell).
   */
  chromeMode?: "classic" | "edex";
  /**
   * Optional explicit SSH host context (used by the full-screen shell).
   * When omitted, the layout falls back to deriving a host from the active tab.
   */
  workspaceHost?: SSHHost | null;
  isTopbarOpen?: boolean;
  rightSidebarOpen?: boolean;
  rightSidebarWidth?: number;
}

interface PanelProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function Panel({ title, subtitle, children }: PanelProps): React.ReactElement {
  return (
    <section className="edex-panel h-full min-h-0">
      <header className="edex-panel__chrome">
        <h3 className="edex-panel__title">{title}</h3>
        <p className="edex-panel__subtitle">{subtitle}</p>
      </header>
      <div className="edex-panel__body">
        {children}
      </div>
    </section>
  );
}

function HostUnavailableFallback(): React.ReactElement {
  return (
    <div className="h-full w-full flex items-center justify-center text-center px-4">
      <div>
        <p className="text-sm text-muted-foreground">No SSH host on this tab.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Open a terminal (or another SSH host tab), or pick a host from the host
          list.
        </p>
      </div>
    </div>
  );
}

const SSH_EDEX_HOST_SOURCE_TYPES = new Set<TabContextTab["type"]>([
  "terminal",
  "server_stats",
  "file_manager",
  "tunnel",
  "docker",
  "ssh_manager",
]);

function captureSshHostFromTab(tab: TabContextTab | undefined): SSHHost | null {
  if (!tab?.hostConfig) return null;
  if (!SSH_EDEX_HOST_SOURCE_TYPES.has(tab.type)) return null;
  const conn = tab.hostConfig.connectionType;
  if (conn === "rdp" || conn === "vnc" || conn === "telnet") return null;
  return tab.hostConfig;
}

function resolveEdexDefaultView(
  requested: EdexDefaultView,
  showStats: boolean,
  showFiles: boolean,
): EdexDefaultView {
  if (requested === "fileManager" && !showFiles) {
    return showStats ? "stats" : "terminal";
  }
  if (requested === "stats" && !showStats) {
    return showFiles ? "fileManager" : "terminal";
  }
  return requested;
}

function defaultViewLabel(view: EdexDefaultView): string {
  switch (view) {
    case "fileManager":
      return "File manager";
    case "stats":
      return "Server stats";
    default:
      return "Terminal";
  }
}

type MobileEdexTab = "terminal" | "stats" | "files";

export function EdexLayout({
  chromeMode = "classic",
  workspaceHost = null,
  isTopbarOpen = true,
  rightSidebarOpen = false,
  rightSidebarWidth = 400,
}: EdexLayoutProps): React.ReactElement {
  const { config: edexConfig } = useEdexSettings();
  const { theme: appTheme } = useTheme();
  const isMobile = useIsMobile();
  const { tabs, currentTab, addTab, updateTab, previewTerminalTheme } = useTabs();
  const currentTabData =
    currentTab != null ? tabs.find((t) => t.id === currentTab) : undefined;
  const hostConfig =
    workspaceHost ?? captureSshHostFromTab(currentTabData);
  const hostTitle = hostConfig
    ? hostConfig.name || `${hostConfig.username}@${hostConfig.ip}`
    : "";

  /** Remount embedded apps when the eDEX tab's bound host changes (FileManager keeps initialHost on mount). */
  const hostRemountKey = hostConfig
    ? `${hostConfig.id}-${(hostConfig as SSHHost & { instanceId?: string }).instanceId ?? ""}`
    : "none";

  /** In `EdexShell`, the workspace should read as full-stage (not an inset “phone” card). */
  const edexShellWorkspace = chromeMode === "edex";
  /** Fullscreen shell is desktop-first; `useIsMobile` is viewport-wide and mis-classifies the grid. */
  const layoutIsMobile = edexShellWorkspace ? false : isMobile;
  const topMarginPx = edexShellWorkspace ? 0 : isTopbarOpen ? 74 : 26;
  const bottomMarginPx = edexShellWorkspace ? 0 : 8;
  const horizontalMarginPx = edexShellWorkspace ? 0 : 8;
  const rightChromeInsetPx = edexShellWorkspace ? 0 : 17;

  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemPrefersDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const [clockNow, setClockNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const appAppearanceResolvedDark = useMemo(() => {
    if (appTheme === "dark") {
      return true;
    }
    if (appTheme === "light") {
      return false;
    }
    if (
      appTheme === "dracula" ||
      appTheme === "gentlemansChoice" ||
      appTheme === "midnightEspresso" ||
      appTheme === "catppuccinMocha"
    ) {
      return true;
    }
    if (appTheme === "system") {
      return systemPrefersDark;
    }
    return false;
  }, [appTheme, systemPrefersDark]);

  const gridOpacity = 0.02 + (edexConfig.gridIntensity / 100) * 0.14;
  const prefersLightGrid = useMemo(() => {
    if (edexConfig.theme === "light") {
      return true;
    }
    if (edexConfig.theme === "dark") {
      return false;
    }
    return !appAppearanceResolvedDark;
  }, [edexConfig.theme, appAppearanceResolvedDark]);

  const gridLineColor = prefersLightGrid
    ? `rgba(0, 0, 0, ${gridOpacity.toFixed(3)})`
    : `rgba(255, 255, 255, ${gridOpacity.toFixed(3)})`;
  const gridSizePx = layoutIsMobile ? 18 : 24;
  const showStatsPanel = edexConfig.showSystemStats;
  const showFilePanel = edexConfig.showFileBrowser;
  const resolvedDefaultView = useMemo(
    () =>
      resolveEdexDefaultView(
        edexConfig.defaultView,
        showStatsPanel,
        showFilePanel,
      ),
    [edexConfig.defaultView, showStatsPanel, showFilePanel],
  );

  const [mobileEdexTab, setMobileEdexTab] = useState<MobileEdexTab>("terminal");

  useEffect(() => {
    if (!layoutIsMobile || edexConfig.layout.mobile !== "tabs") {
      return;
    }
    setMobileEdexTab("terminal");
  }, [
    layoutIsMobile,
    edexConfig.layout.mobile,
  ]);

  const mobileSecondaryTabs = useMemo((): MobileEdexTab[] => {
    const available: MobileEdexTab[] = [];
    if (showStatsPanel) available.push("stats");
    if (showFilePanel) available.push("files");
    const preferredSecondary =
      resolvedDefaultView === "stats"
        ? "stats"
        : resolvedDefaultView === "fileManager"
          ? "files"
          : null;

    if (preferredSecondary && available.includes(preferredSecondary)) {
      return [
        preferredSecondary,
        ...available.filter((tab) => tab !== preferredSecondary),
      ];
    }
    return available;
  }, [resolvedDefaultView, showStatsPanel, showFilePanel]);

  const mobileStackOrder = useMemo(
    (): MobileEdexTab[] => ["terminal", ...mobileSecondaryTabs],
    [mobileSecondaryTabs],
  );

  useEffect(() => {
    if (mobileEdexTab === "stats" && !showStatsPanel) {
      setMobileEdexTab("terminal");
      return;
    }
    if (mobileEdexTab === "files" && !showFilePanel) {
      setMobileEdexTab("terminal");
    }
  }, [mobileEdexTab, showStatsPanel, showFilePanel]);

  const showRightColumn = showStatsPanel || showFilePanel;
  const terminalColSpan = showRightColumn
    ? edexConfig.layout.desktop === "focus"
      ? "col-span-9"
      : "col-span-8"
    : "col-span-12";
  const rightColumnColSpan = edexConfig.layout.desktop === "focus" ? "col-span-3" : "col-span-4";

  const inMobileTabs = layoutIsMobile && edexConfig.layout.mobile === "tabs";
  const terminalTabVisible = !inMobileTabs || mobileEdexTab === "terminal";
  const statsTabVisible = !inMobileTabs || mobileEdexTab === "stats";

  if (!edexConfig.enabled) {
    return (
      <div
        className="border-2 border-edge rounded-lg overflow-hidden bg-base p-6"
        style={{
          marginLeft: horizontalMarginPx,
          marginRight: rightSidebarOpen
            ? `calc(var(--right-sidebar-width, ${rightSidebarWidth}px) + 8px)`
            : rightChromeInsetPx,
          marginTop: topMarginPx,
          marginBottom: bottomMarginPx,
          height:
            chromeMode === "edex"
              ? `calc(100% - ${topMarginPx + bottomMarginPx}px)`
              : `calc(100vh - ${topMarginPx + bottomMarginPx}px)`,
          transition:
            "margin-left 200ms linear, margin-right 200ms linear, margin-top 200ms linear",
        }}
      >
        <div className="h-full rounded-lg border border-edge bg-canvas/40 flex items-center justify-center text-center px-6">
          <div>
            <p className="text-sm text-foreground">eDEX view is disabled in settings.</p>
            <p className="text-xs text-muted-foreground mt-2">
              Enable <code>ui.edex.enabled</code> in the shell header (gear) or via
              devtools, or switch back to classic UI and adjust settings there.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const terminalPanel = (
    <Panel title="Terminal" subtitle="Primary terminal workspace">
      {hostConfig && currentTab != null ? (
        <Terminal
          key={`edex-term-${currentTab}-${hostRemountKey}`}
          hostConfig={hostConfig}
          isVisible={terminalTabVisible}
          title={hostTitle || "Terminal"}
          showTitle={false}
          splitScreen={false}
          chromeAppearance={chromeMode === "edex" ? "edex" : "termix"}
          onClose={() => {}}
          onTitleChange={(title) => updateTab(currentTab, { title })}
          onOpenFileManager={
            hostConfig.enableFileManager
              ? (path?: string) =>
                  addTab({
                    type: "file_manager",
                    title: hostTitle || hostConfig.name || "Files",
                    hostConfig: path
                      ? { ...hostConfig, defaultPath: path }
                      : hostConfig,
                  })
              : undefined
          }
          previewTheme={previewTerminalTheme}
        />
      ) : (
        <HostUnavailableFallback />
      )}
    </Panel>
  );

  const statsPanel = (
    <Panel title="Stats" subtitle="System and connection metrics">
      {hostConfig ? (
        <ServerStats
          key={`edex-stats-${currentTab}-${hostRemountKey}`}
          hostConfig={hostConfig}
          title={hostTitle || hostConfig.name || "Server stats"}
          isVisible={statsTabVisible}
          isTopbarOpen={isTopbarOpen}
          embedded={true}
          chromeAppearance={chromeMode === "edex" ? "edex" : "termix"}
        />
      ) : (
        <HostUnavailableFallback />
      )}
    </Panel>
  );

  const filePanel = (
    <Panel title="File Manager" subtitle="Directory and file explorer">
      {hostConfig ? (
        <div className="edex-file-manager-mount">
          <FileManager
            key={`edex-fm-${currentTab}-${hostRemountKey}`}
            initialHost={hostConfig}
            onClose={() => {}}
            className="min-w-0"
            allowBodyHorizontalScroll
            chromeAppearance={chromeMode === "edex" ? "edex" : "termix"}
          />
        </div>
      ) : (
        <HostUnavailableFallback />
      )}
    </Panel>
  );

  const mobileTabButtonClass = (active: boolean) =>
    `edex-mobile-tab ${active ? "edex-mobile-tab--active" : ""}`;

  let desktopGrid: React.ReactElement;
  if (!showRightColumn) {
    desktopGrid = (
      <div className="grid h-full min-h-0 grid-cols-12 grid-rows-6 gap-3">
        <div className="col-span-12 row-span-6 min-h-0">{terminalPanel}</div>
      </div>
    );
  } else if (resolvedDefaultView === "fileManager") {
    desktopGrid = (
      <div className="grid h-full min-h-0 grid-cols-12 grid-rows-6 gap-3">
        {showFilePanel && (
          <div className="col-span-8 row-span-6 min-h-0">{filePanel}</div>
        )}
        <div
          className={`${rightColumnColSpan} ${
            showStatsPanel ? "row-span-3" : "row-span-6"
          } min-h-0`}
        >
          {terminalPanel}
        </div>
        {showStatsPanel && (
          <div className={`${rightColumnColSpan} row-span-3 min-h-0`}>
            {statsPanel}
          </div>
        )}
      </div>
    );
  } else if (resolvedDefaultView === "stats") {
    desktopGrid = (
      <div className="grid h-full min-h-0 grid-cols-12 grid-rows-6 gap-3">
        {showStatsPanel && (
          <div className="col-span-8 row-span-6 min-h-0">{statsPanel}</div>
        )}
        <div
          className={`${rightColumnColSpan} ${
            showFilePanel ? "row-span-3" : "row-span-6"
          } min-h-0`}
        >
          {terminalPanel}
        </div>
        {showFilePanel && (
          <div className={`${rightColumnColSpan} row-span-3 min-h-0`}>
            {filePanel}
          </div>
        )}
      </div>
    );
  } else {
    desktopGrid = (
      <div className="grid h-full min-h-0 grid-cols-12 grid-rows-6 gap-3">
        <div className={`${terminalColSpan} row-span-6 min-h-0`}>
          {terminalPanel}
        </div>
        {showStatsPanel && (
          <div
            className={`${rightColumnColSpan} ${
              showFilePanel ? "row-span-2" : "row-span-6"
            } min-h-0`}
          >
            {statsPanel}
          </div>
        )}
        {showFilePanel && (
          <div
            className={`${rightColumnColSpan} ${
              showStatsPanel ? "row-span-4" : "row-span-6"
            } min-h-0`}
          >
            {filePanel}
          </div>
        )}
      </div>
    );
  }

  const shellStyle: CSSProperties = {
    marginLeft: horizontalMarginPx,
    marginRight: rightSidebarOpen
      ? `calc(var(--right-sidebar-width, ${rightSidebarWidth}px) + ${edexShellWorkspace ? 0 : 8}px)`
      : rightChromeInsetPx,
    marginTop: topMarginPx,
    marginBottom: bottomMarginPx,
    height:
      chromeMode === "edex"
        ? `calc(100% - ${topMarginPx + bottomMarginPx}px)`
        : `calc(100vh - ${topMarginPx + bottomMarginPx}px)`,
    ["--edex-grid-size" as "--edex-grid-size"]: `${gridSizePx}px`,
    ["--edex-grid-line-color" as "--edex-grid-line-color"]: gridLineColor,
    transition:
      "margin-left 200ms linear, margin-right 200ms linear, margin-top 200ms linear",
  };

  const hostIdentity = hostConfig
    ? `${hostConfig.username}@${hostConfig.ip}`
    : "No SSH host";
  const hostDisplayName = hostConfig?.name || "Detached";
  const currentTimeLabel = clockNow.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const currentDateLabel = clockNow.toLocaleDateString([], {
    month: "short",
    day: "2-digit",
  });
  const shellPadding = edexShellWorkspace ? "p-0" : "p-3";
  const shellBleedClass = edexShellWorkspace ? " edex-shell--edex-fullbleed" : "";
  const shellClassName = `edex-shell edex-shell--${
    prefersLightGrid ? "light" : "dark"
  } ${layoutIsMobile ? `edex-shell--mobile edex-shell--mobile-${edexConfig.layout.mobile}` : "edex-shell--desktop"} relative flex min-h-0 flex-col overflow-hidden ${shellPadding}${shellBleedClass}`;

  let mainContent: React.ReactElement;
  if (layoutIsMobile && edexConfig.layout.mobile === "tabs") {
    mainContent = (
      <div className="edex-main edex-main--mobile-tabs flex min-h-0 flex-1 flex-col gap-2">
        <div
          className="edex-mobile-tabs"
          role="tablist"
          aria-label="eDEX panels"
        >
          <button
            type="button"
            role="tab"
            id="edex-tab-terminal"
            aria-controls="edex-tabpanel-terminal"
            aria-selected={mobileEdexTab === "terminal"}
            className={mobileTabButtonClass(mobileEdexTab === "terminal")}
            onClick={() => setMobileEdexTab("terminal")}
          >
            Terminal
          </button>
          {mobileSecondaryTabs.includes("stats") && (
            <button
              type="button"
              role="tab"
              id="edex-tab-stats"
              aria-controls="edex-tabpanel-stats"
              aria-selected={mobileEdexTab === "stats"}
              className={mobileTabButtonClass(mobileEdexTab === "stats")}
              onClick={() => setMobileEdexTab("stats")}
            >
              Stats
            </button>
          )}
          {mobileSecondaryTabs.includes("files") && (
            <button
              type="button"
              role="tab"
              id="edex-tab-files"
              aria-controls="edex-tabpanel-files"
              aria-selected={mobileEdexTab === "files"}
              className={mobileTabButtonClass(mobileEdexTab === "files")}
              onClick={() => setMobileEdexTab("files")}
            >
              Files
            </button>
          )}
        </div>
        <div className="edex-mobile-tab-panels min-h-0 flex-1 overflow-hidden">
          <div
            id="edex-tabpanel-terminal"
            role="tabpanel"
            aria-labelledby="edex-tab-terminal"
            aria-hidden={mobileEdexTab !== "terminal"}
            className={`edex-mobile-tab-panel${mobileEdexTab === "terminal" ? " edex-mobile-tab-panel--active" : ""}`}
            inert={inMobileTabs && mobileEdexTab !== "terminal" ? true : undefined}
          >
            {terminalPanel}
          </div>
          {showStatsPanel ? (
            <div
              id="edex-tabpanel-stats"
              role="tabpanel"
              aria-labelledby="edex-tab-stats"
              aria-hidden={mobileEdexTab !== "stats"}
              className={`edex-mobile-tab-panel${mobileEdexTab === "stats" ? " edex-mobile-tab-panel--active" : ""}`}
              inert={inMobileTabs && mobileEdexTab !== "stats" ? true : undefined}
            >
              {statsPanel}
            </div>
          ) : null}
          {showFilePanel ? (
            <div
              id="edex-tabpanel-files"
              role="tabpanel"
              aria-labelledby="edex-tab-files"
              aria-hidden={mobileEdexTab !== "files"}
              className={`edex-mobile-tab-panel${mobileEdexTab === "files" ? " edex-mobile-tab-panel--active" : ""}`}
              inert={inMobileTabs && mobileEdexTab !== "files" ? true : undefined}
            >
              {filePanel}
            </div>
          ) : null}
        </div>
      </div>
    );
  } else if (layoutIsMobile && edexConfig.layout.mobile === "stacked") {
    mainContent = (
      <div className="edex-main edex-main--mobile-stacked flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto thin-scrollbar">
        {mobileStackOrder.map((slot) => (
          <div
            key={slot}
            className="min-h-[min(40vh,320px)] shrink-0"
          >
            {slot === "terminal" && terminalPanel}
            {slot === "stats" && showStatsPanel && statsPanel}
            {slot === "files" && showFilePanel && filePanel}
          </div>
        ))}
      </div>
    );
  } else {
    mainContent = <div className="edex-main edex-main--desktop h-full min-h-0">{desktopGrid}</div>;
  }

  return (
    <div
      className={shellClassName}
      style={shellStyle}
    >
      <div
        className={edexShellWorkspace ? "edex-info-strip edex-info-strip--edex-tight" : "edex-info-strip"}
        role="status"
        aria-live="polite"
      >
        <span className="edex-info-pill">
          <strong>{currentTimeLabel}</strong>
          <span>{currentDateLabel}</span>
        </span>
        <span className="edex-info-pill">
          <strong>{hostDisplayName}</strong>
          <span>{hostIdentity}</span>
        </span>
        <span className="edex-info-pill">
          <strong>Default: {defaultViewLabel(resolvedDefaultView)}</strong>
          <span>
            {layoutIsMobile ? `Mobile: ${edexConfig.layout.mobile}` : "Desktop multi-panel"}
          </span>
        </span>
        {resolvedDefaultView !== edexConfig.defaultView ? (
          <span className="edex-info-pill">
            <strong>Adjusted view</strong>
            <span>
              requested {defaultViewLabel(edexConfig.defaultView)} with hidden panels
            </span>
          </span>
        ) : null}
        {layoutIsMobile ? (
          <span className="edex-info-pill">
            <strong>Terminal-first</strong>
            <span>
              secondary panels use {edexConfig.layout.mobile === "tabs" ? "tabs" : "stacked"} mode
            </span>
          </span>
        ) : (
          <span className="edex-info-pill">
            <strong>Panel layout</strong>
            <span>terminal with optional stats and file panels</span>
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {mainContent}
      </div>
      <EdexKeyboardHud
        enabled={edexConfig.showKeyboardOverlay}
        layout={edexConfig.keyboardHudLayout}
      />
    </div>
  );
}
