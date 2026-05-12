import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button.tsx";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { GuacamoleConnectionConfig } from "@/ui/desktop/apps/features/guacamole/GuacamoleDisplay.tsx";
import { SimpleLoader } from "@/ui/desktop/navigation/animations/SimpleLoader.tsx";
import { useEdexSettings } from "@/ui/desktop/apps/edex/edexSettings.ts";
import { EdexShellFrameProvider } from "@/ui/desktop/apps/edex/edexShellFrameContext.tsx";
import {
  getGuacamoleDpi,
  getGuacamoleTokenFromHost,
  getSSHHosts,
  getServerMetricsById,
  logActivity,
  type SSHHostWithStatus,
} from "@/ui/main-axios.ts";
import {
  useTabs,
  type Tab,
} from "@/ui/desktop/navigation/tabs/TabContext.tsx";
import {
  EdexTermixBridgeProvider,
  type EdexTermixBridgeValue,
} from "@termix/edex-vite-shell/bridge";
import {
  EdexTermixHostProvider,
  type EdexTermixHostListEntry,
  type EdexTermixHostValue,
} from "@termix/edex-vite-shell/host";
import type { RemoteMetricsSnapshot } from "@termix/edex-vite-shell/contracts/hostMetrics";
import { mapTermixMetricsPayloadToRemoteSnapshot } from "@termix/edex-vite-shell/mapTermixMetrics";

const EdexViteShellApp = lazy(async () => {
  const mod = await import("@termix/edex-vite-shell/app");
  return { default: mod.App };
});

const HostManager = lazy(() =>
  import("@/ui/desktop/apps/host-manager/hosts/HostManager.tsx").then(
    (m) => ({ default: m.HostManager }),
  ),
);
const UserProfile = lazy(() =>
  import("@/ui/desktop/user/UserProfile.tsx").then((m) => ({
    default: m.UserProfile,
  })),
);
const AdminSettings = lazy(() =>
  import("@/ui/desktop/apps/admin/AdminSettings.tsx").then((m) => ({
    default: m.AdminSettings,
  })),
);

const TermixTerminal = lazy(() =>
  import("@/ui/desktop/apps/features/terminal/Terminal.tsx").then((m) => ({
    default: m.Terminal,
  })),
);

const FileManager = lazy(() =>
  import("@/ui/desktop/apps/features/file-manager/FileManager.tsx").then(
    (m) => ({ default: m.FileManager }),
  ),
);
const ServerStats = lazy(() =>
  import("@/ui/desktop/apps/features/server-stats/ServerStats.tsx").then(
    (m) => ({ default: m.ServerStats }),
  ),
);
const TunnelManager = lazy(() =>
  import("@/ui/desktop/apps/features/tunnel/TunnelManager.tsx").then((m) => ({
    default: m.TunnelManager,
  })),
);
const DockerManager = lazy(() =>
  import("@/ui/desktop/apps/features/docker/DockerManager.tsx").then((m) => ({
    default: m.DockerManager,
  })),
);
const GuacamoleDisplay = lazy(() =>
  import("@/ui/desktop/apps/features/guacamole/GuacamoleDisplay.tsx").then(
    (m) => ({ default: m.GuacamoleDisplay }),
  ),
);

function pickTerminalTab(
  tabs: Tab[],
  currentTabId: number | null,
  getTab: (id: number) => Tab | undefined,
): Tab | null {
  if (currentTabId != null) {
    const cur = getTab(currentTabId);
    if (cur?.type === "terminal" && cur.hostConfig) return cur;
  }
  return tabs.find((t) => t.type === "terminal" && t.hostConfig) ?? null;
}

/** Prefer terminal host, else any tab carrying `hostConfig` (e.g. file_manager). */
function pickSshHostContextTab(
  tabs: Tab[],
  currentTabId: number | null,
  getTab: (id: number) => Tab | undefined,
): Tab | null {
  const terminal = pickTerminalTab(tabs, currentTabId, getTab);
  if (terminal?.hostConfig) return terminal;
  if (currentTabId != null) {
    const cur = getTab(currentTabId);
    if (cur?.hostConfig && cur.type !== "home") return cur;
  }
  return tabs.find((t) => !!t.hostConfig) ?? null;
}

function isGuacamoleTab(t: Tab | undefined): t is Tab & {
  connectionConfig: NonNullable<Tab["connectionConfig"]>;
} {
  return (
    !!t &&
    (t.type === "rdp" || t.type === "vnc" || t.type === "telnet") &&
    !!t.connectionConfig
  );
}

function pickActiveGuacamoleTab(
  tabs: Tab[],
  currentTabId: number | null,
  getTab: (id: number) => Tab | undefined,
): Tab | null {
  if (currentTabId != null) {
    const cur = getTab(currentTabId);
    if (isGuacamoleTab(cur)) return cur;
  }
  return tabs.find((x) => isGuacamoleTab(x)) ?? null;
}

function hostStatsMetricsEnabled(host: {
  statsConfig?: unknown;
}): boolean {
  const sc = host.statsConfig;
  if (sc == null) return true;
  if (typeof sc === "object" && sc !== null && "metricsEnabled" in sc) {
    return (sc as { metricsEnabled?: boolean }).metricsEnabled !== false;
  }
  if (typeof sc === "string") {
    try {
      const p = JSON.parse(sc) as { metricsEnabled?: boolean };
      return p.metricsEnabled !== false;
    } catch {
      return true;
    }
  }
  return true;
}

function hostDisplayTitle(host: SSHHostWithStatus): string {
  return host.name?.trim()
    ? host.name
    : `${host.username}@${host.ip}:${host.port}`;
}

function mapHostsToPanelRows(hosts: SSHHostWithStatus[]): EdexTermixHostListEntry[] {
  return hosts.map((h) => ({
    id: h.id,
    title: hostDisplayTitle(h),
    subtitle: `${h.username}@${h.ip}:${h.port}`,
    connectionType: h.connectionType ?? "ssh",
    terminalEnabled: h.enableTerminal !== false,
  }));
}

export type EdexViteShellFrameProps = {
  username: string | null;
  isAdmin: boolean;
  isTopbarOpen: boolean;
  rightSidebarOpen: boolean;
  rightSidebarWidth: number;
  onLogout: () => void | Promise<void>;
  onOpenCommandPalette: () => void;
};

type PortalKind =
  | "none"
  | "hosts"
  | "profile"
  | "admin"
  | "files"
  | "stats"
  | "tunnel"
  | "docker"
  | "remote";

/**
 * Embeds `@termix/edex-vite-shell` inside authenticated Termix with bridge data,
 * Termix tab strip sync, and full-screen tools (host manager, profile, admin).
 */
export function EdexViteShellFrame({
  username,
  isAdmin,
  isTopbarOpen,
  rightSidebarOpen,
  rightSidebarWidth,
  onLogout,
  onOpenCommandPalette,
}: EdexViteShellFrameProps): ReactElement {
  const { t } = useTranslation();
  const { updateConfig } = useEdexSettings();
  const { tabs, currentTab, getTab, setCurrentTab, updateTab, addTab } =
    useTabs();
  const [baseWsUrl, setBaseWsUrl] = useState<string | null>(null);
  const [baseWsUrlError, setBaseWsUrlError] = useState<string | null>(null);
  const [portal, setPortal] = useState<PortalKind>("none");
  const [remoteGuacTabId, setRemoteGuacTabId] = useState<number | null>(null);
  const [sshHostList, setSshHostList] = useState<SSHHostWithStatus[]>([]);
  const [remoteHostMetrics, setRemoteHostMetrics] =
    useState<RemoteMetricsSnapshot | null>(null);

  const closePortal = useCallback(() => {
    setPortal("none");
    setRemoteGuacTabId(null);
  }, []);

  const refreshSshHostList = useCallback(async () => {
    try {
      const list = await getSSHHosts();
      setSshHostList(list);
    } catch {
      setSshHostList([]);
    }
  }, []);

  useEffect(() => {
    void refreshSshHostList();
    const onHosts = () => void refreshSshHostList();
    window.addEventListener("ssh-hosts:changed", onHosts);
    return () => window.removeEventListener("ssh-hosts:changed", onHosts);
  }, [refreshSshHostList]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await resolveTermixSshWebSocketBaseUrl();
      if (cancelled) return;
      if (r.ok) {
        setBaseWsUrl(r.baseWsUrl);
        setBaseWsUrlError(null);
      } else {
        setBaseWsUrl(null);
        setBaseWsUrlError(r.error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (portal === "none") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePortal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [portal, closePortal]);

  const bridgeValue: EdexTermixBridgeValue = useMemo(() => {
    const tab = pickTerminalTab(tabs, currentTab, getTab);
    const session =
      tab?.hostConfig != null
        ? {
            hostConfig: tab.hostConfig as unknown as Record<string, unknown>,
            instanceId: tab.instanceId,
            hostRevision: tab._updateTimestamp ?? 0,
          }
        : null;
    return {
      baseWsUrl,
      baseWsUrlError,
      session,
    };
  }, [tabs, currentTab, getTab, baseWsUrl, baseWsUrlError]);

  const shellTabs = useMemo(
    () => tabs.map((x) => ({ id: x.id, title: x.title, type: x.type })),
    [tabs],
  );

  const sshToolTab = useMemo(
    () => pickSshHostContextTab(tabs, currentTab, getTab),
    [tabs, currentTab, getTab],
  );

  const remoteSessionAvailable = useMemo(
    () => pickActiveGuacamoleTab(tabs, currentTab, getTab) != null,
    [tabs, currentTab, getTab],
  );

  const sshHostRows = useMemo(
    () => mapHostsToPanelRows(sshHostList),
    [sshHostList],
  );

  const terminalTabForPanel = useMemo(
    () => pickTerminalTab(tabs, currentTab, getTab),
    [tabs, currentTab, getTab],
  );
  const activeTerminalHostId = terminalTabForPanel?.hostConfig?.id ?? null;

  const globeHostMarkers = useMemo(
    () =>
      sshHostList.map((h) => ({
        id: h.id,
        label: hostDisplayTitle(h),
        ipv4: h.ip,
      })),
    [sshHostList],
  );

  const guacamoleTabForGlobe = useMemo(
    () => pickActiveGuacamoleTab(tabs, currentTab, getTab),
    [tabs, currentTab, getTab],
  );

  const globeOpenHostIds = useMemo(() => {
    const ids = new Set<number>();
    for (const t of tabs) {
      const id = (t.hostConfig as { id?: number } | undefined)?.id;
      if (typeof id === "number") ids.add(id);
    }
    return [...ids];
  }, [tabs]);

  const globeFocusedHostId = useMemo(() => {
    const tid = terminalTabForPanel?.hostConfig?.id;
    if (typeof tid === "number") return tid;
    const gid = (guacamoleTabForGlobe?.hostConfig as { id?: number } | undefined)
      ?.id;
    return typeof gid === "number" ? gid : null;
  }, [terminalTabForPanel, guacamoleTabForGlobe]);

  useEffect(() => {
    const tab = terminalTabForPanel;
    const hc = tab?.hostConfig as { id?: number; statsConfig?: unknown } | undefined;
    const hostId = hc?.id;
    if (typeof hostId !== "number" || !hc || !hostStatsMetricsEnabled(hc)) {
      setRemoteHostMetrics(null);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const raw = await getServerMetricsById(hostId);
        if (cancelled) return;
        if (!raw) {
          setRemoteHostMetrics(null);
          return;
        }
        const snap = mapTermixMetricsPayloadToRemoteSnapshot(raw as unknown);
        setRemoteHostMetrics(snap);
      } catch {
        if (!cancelled) setRemoteHostMetrics(null);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [terminalTabForPanel]);

  const openHostFromPanel = useCallback(
    async (hostId: number) => {
      let resolved = sshHostList.find((h) => h.id === hostId);
      if (!resolved) {
        try {
          const list = await getSSHHosts();
          setSshHostList(list);
          resolved = list.find((h) => h.id === hostId);
        } catch {
          toast.error(t("edex.viteShell.hostListLoadFailed"));
          return;
        }
      }
      if (!resolved) return;

      const title = hostDisplayTitle(resolved);

      const ct = resolved.connectionType;
      if (ct === "rdp" || ct === "vnc" || ct === "telnet") {
        try {
          const result = await getGuacamoleTokenFromHost(resolved.id);
          const protocol = ct;
          const nid = addTab({
            type: protocol,
            title,
            hostConfig: resolved,
            connectionConfig: {
              token: result.token,
              protocol,
              type: protocol,
              hostname: resolved.ip,
              port: resolved.port,
              username: resolved.username,
              password: resolved.password,
              domain: resolved.domain,
              security: resolved.security,
              "ignore-cert": resolved.ignoreCert,
              dpi: getGuacamoleDpi(resolved),
            },
          });
          setCurrentTab(nid);
          try {
            await logActivity(protocol, resolved.id, title);
          } catch (err) {
            console.warn(`Failed to log ${protocol} activity:`, err);
          }
        } catch (err) {
          console.error("Failed to get Guacamole token:", err);
          toast.error(t("edex.viteShell.remoteConnectFailed"));
        }
        return;
      }

      if (resolved.enableTerminal === false) {
        toast.info(t("edex.viteShell.hostTerminalDisabled"));
        return;
      }

      const existing = tabs.find(
        (x) =>
          x.type === "terminal" &&
          x.hostConfig &&
          (x.hostConfig as { id?: number }).id === resolved.id,
      );
      if (existing) {
        setCurrentTab(existing.id);
        return;
      }

      const nid = addTab({
        type: "terminal",
        title,
        hostConfig: resolved,
      });
      setCurrentTab(nid);
    },
    [sshHostList, tabs, addTab, setCurrentTab, t],
  );

  const onSelectTab = useCallback(
    (tabId: number) => {
      setCurrentTab(tabId);
    },
    [setCurrentTab],
  );

  const tryOpenRemotePortal = useCallback(() => {
    const tab = pickActiveGuacamoleTab(tabs, currentTab, getTab);
    if (tab?.id != null && tab.connectionConfig) {
      setRemoteGuacTabId(tab.id);
      setPortal("remote");
    } else {
      toast.error(t("edex.viteShell.noRemoteSession"));
    }
  }, [tabs, currentTab, getTab, t]);

  const embeddedTerminal = useMemo(() => {
    const tab = pickTerminalTab(tabs, currentTab, getTab);
    if (!tab?.hostConfig) return undefined;
    return (
      <Suspense
        fallback={
          <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-white/70">
            {t("common.loading")}
          </div>
        }
      >
        <TermixTerminal
          key={`${tab.id}-${tab._updateTimestamp ?? 0}`}
          hostConfig={tab.hostConfig}
          isVisible
          showTitle={false}
          splitScreen={false}
          chromeAppearance="edex"
          onOpenFileManager={
            tab.hostConfig.enableFileManager
              ? () => setPortal("files")
              : undefined
          }
        />
      </Suspense>
    );
  }, [tabs, currentTab, getTab, t]);

  const hostValue: EdexTermixHostValue = useMemo(() => {
    const hc = sshToolTab?.hostConfig;
    return {
      username,
      isAdmin,
      displayName: username,
      shellTabs,
      currentTabId: currentTab,
      onSelectTab,
      onOpenHostManager: () => setPortal("hosts"),
      onOpenUserProfile: () => setPortal("profile"),
      onOpenAdmin: () => setPortal("admin"),
      onLogout: () => {
        void onLogout();
      },
      onExitToClassic: () => updateConfig({ shellUi: "classic" }),
      embeddedTerminal,
      onOpenCommandPalette,
      onOpenFileManager: hc?.enableFileManager ? () => setPortal("files") : undefined,
      onOpenServerStats:
        hc && hostStatsMetricsEnabled(hc) ? () => setPortal("stats") : undefined,
      onOpenTunnelManager: hc?.enableTunnel ? () => setPortal("tunnel") : undefined,
      onOpenDockerManager: hc?.enableDocker ? () => setPortal("docker") : undefined,
      onOpenRemoteSession: remoteSessionAvailable
        ? tryOpenRemotePortal
        : undefined,
      remotePortalAvailable: remoteSessionAvailable,
      sshHosts: sshHostRows,
      activeTerminalHostId,
      onOpenHostFromPanel: openHostFromPanel,
      onRefreshSshHostList: refreshSshHostList,
      globeHostMarkers,
      globeFocusedHostId,
      globeOpenHostIds,
      remoteHostMetrics,
    };
  }, [
    username,
    isAdmin,
    shellTabs,
    currentTab,
    onSelectTab,
    onLogout,
    updateConfig,
    embeddedTerminal,
    onOpenCommandPalette,
    sshToolTab,
    tryOpenRemotePortal,
    remoteSessionAvailable,
    sshHostRows,
    activeTerminalHostId,
    openHostFromPanel,
    refreshSshHostList,
    globeHostMarkers,
    globeFocusedHostId,
    globeOpenHostIds,
    remoteHostMetrics,
  ]);

  const currentTabData = useMemo(
    () => (currentTab != null ? getTab(currentTab) : undefined),
    [currentTab, getTab],
  );

  const guacPortalTab = useMemo(() => {
    if (remoteGuacTabId == null) return undefined;
    return getTab(remoteGuacTabId);
  }, [remoteGuacTabId, getTab, tabs]);

  const portalWide =
    portal === "files" ||
    portal === "stats" ||
    portal === "tunnel" ||
    portal === "docker" ||
    portal === "remote";

  const toolHost = sshToolTab?.hostConfig;

  return (
    <SidebarProvider defaultOpen>
      <div className="fixed inset-0 z-[10020] bg-black">
        <div className="pointer-events-auto absolute right-3 top-3 z-[10030] flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="secondary" size="sm">
                {t("nav.tools")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="z-[10040] min-w-[12rem] rounded-md border border-edge bg-popover p-1 text-popover-foreground shadow-md"
              align="end"
            >
              <DropdownMenuItem
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
                onSelect={() => setPortal("hosts")}
              >
                {t("nav.hostManager")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
                onSelect={() => setPortal("profile")}
              >
                {t("nav.userProfile")}
              </DropdownMenuItem>
              {isAdmin ? (
                <DropdownMenuItem
                  className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
                  onSelect={() => setPortal("admin")}
                >
                  {t("nav.admin")}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator className="my-1 h-px bg-border" />
              <DropdownMenuItem
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
                onSelect={() => onOpenCommandPalette()}
              >
                {t("nav.commandPalette")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
                disabled={!toolHost?.enableFileManager}
                onSelect={() => setPortal("files")}
              >
                {t("nav.fileManager")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
                disabled={
                  !toolHost || !hostStatsMetricsEnabled(toolHost)
                }
                onSelect={() => setPortal("stats")}
              >
                {t("nav.serverStats")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
                disabled={!toolHost?.enableTunnel}
                onSelect={() => setPortal("tunnel")}
              >
                {t("nav.tunnels")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
                disabled={!toolHost?.enableDocker}
                onSelect={() => setPortal("docker")}
              >
                {t("nav.docker")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
                disabled={!remoteSessionAvailable}
                onSelect={() => {
                  tryOpenRemotePortal();
                }}
              >
                {t("edex.viteShell.remoteSession")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 h-px bg-border" />
              <DropdownMenuItem
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent"
                onSelect={() => {
                  void onLogout();
                }}
              >
                {t("common.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => updateConfig({ shellUi: "classic" })}
          >
            Termix desktop
          </Button>
        </div>

        {portal !== "none" ? (
          <div
            className="pointer-events-auto fixed inset-0 z-[10050] flex items-center justify-center bg-black/75 p-3"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closePortal();
            }}
          >
            <div
              className={cn(
                "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-lg border-2 border-edge bg-background shadow-xl",
                portalWide
                  ? "max-w-[min(96rem,calc(100vw-1.5rem))]"
                  : "max-w-6xl",
              )}
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                className="absolute right-2 top-2 z-10 rounded-md border border-transparent bg-background/90 px-2 py-1 text-sm text-foreground hover:bg-accent"
                onClick={closePortal}
              >
                {t("common.close")}
              </button>
              <div className="min-h-0 flex-1 overflow-auto thin-scrollbar">
                <EdexShellFrameProvider>
                  {portal === "hosts" ? (
                    <Suspense
                      fallback={
                        <div className="flex min-h-[40vh] items-center justify-center p-8">
                          <SimpleLoader
                            visible
                            message={t("common.loading")}
                          />
                        </div>
                      }
                    >
                      <HostManager
                        isTopbarOpen={isTopbarOpen}
                        initialTab={currentTabData?.initialTab}
                        hostConfig={currentTabData?.hostConfig}
                        _updateTimestamp={currentTabData?._updateTimestamp}
                        rightSidebarOpen={rightSidebarOpen}
                        rightSidebarWidth={rightSidebarWidth}
                        currentTabId={currentTab ?? undefined}
                        updateTab={updateTab}
                      />
                    </Suspense>
                  ) : null}
                  {portal === "profile" ? (
                    <Suspense
                      fallback={
                        <div className="flex min-h-[40vh] items-center justify-center p-8">
                          <SimpleLoader
                            visible
                            message={t("common.loading")}
                          />
                        </div>
                      }
                    >
                      <UserProfile
                        isTopbarOpen={isTopbarOpen}
                        rightSidebarOpen={rightSidebarOpen}
                        rightSidebarWidth={rightSidebarWidth}
                        initialTab={currentTabData?.initialTab ?? "profile"}
                      />
                    </Suspense>
                  ) : null}
                  {portal === "admin" && isAdmin ? (
                    <Suspense
                      fallback={
                        <div className="flex min-h-[40vh] items-center justify-center p-8">
                          <SimpleLoader
                            visible
                            message={t("common.loading")}
                          />
                        </div>
                      }
                    >
                      <AdminSettings
                        isTopbarOpen={isTopbarOpen}
                        rightSidebarOpen={rightSidebarOpen}
                        rightSidebarWidth={rightSidebarWidth}
                      />
                    </Suspense>
                  ) : null}
                  {portal === "files" && toolHost ? (
                    <Suspense
                      fallback={
                        <div className="flex min-h-[40vh] items-center justify-center p-8">
                          <SimpleLoader
                            visible
                            message={t("common.loading")}
                          />
                        </div>
                      }
                    >
                      <FileManager
                        embedded
                        chromeAppearance="edex"
                        initialHost={toolHost}
                        onClose={closePortal}
                        className="min-h-[72vh] min-w-0"
                        allowBodyHorizontalScroll
                      />
                    </Suspense>
                  ) : null}
                  {portal === "stats" ? (
                    <Suspense
                      fallback={
                        <div className="flex min-h-[40vh] items-center justify-center p-8">
                          <SimpleLoader
                            visible
                            message={t("common.loading")}
                          />
                        </div>
                      }
                    >
                      <ServerStats
                        hostConfig={toolHost}
                        title={
                          toolHost?.name?.trim()
                            ? toolHost.name
                            : toolHost
                              ? `${toolHost.username}@${toolHost.ip}`
                              : t("nav.serverStats")
                        }
                        isVisible
                        isTopbarOpen={isTopbarOpen}
                        embedded
                        chromeAppearance="edex"
                      />
                    </Suspense>
                  ) : null}
                  {portal === "tunnel" && toolHost ? (
                    <Suspense
                      fallback={
                        <div className="flex min-h-[40vh] items-center justify-center p-8">
                          <SimpleLoader
                            visible
                            message={t("common.loading")}
                          />
                        </div>
                      }
                    >
                      <TunnelManager
                        hostConfig={toolHost}
                        title={sshToolTab?.title ?? t("nav.tunnels")}
                        isVisible
                        isTopbarOpen={isTopbarOpen}
                        embedded
                      />
                    </Suspense>
                  ) : null}
                  {portal === "docker" && toolHost ? (
                    <Suspense
                      fallback={
                        <div className="flex min-h-[40vh] items-center justify-center p-8">
                          <SimpleLoader
                            visible
                            message={t("common.loading")}
                          />
                        </div>
                      }
                    >
                      <DockerManager
                        hostConfig={toolHost}
                        title={sshToolTab?.title ?? t("nav.docker")}
                        isVisible
                        isTopbarOpen={isTopbarOpen}
                        embedded
                        onClose={closePortal}
                      />
                    </Suspense>
                  ) : null}
                  {portal === "remote" &&
                  guacPortalTab &&
                  isGuacamoleTab(guacPortalTab) ? (
                    <Suspense
                      fallback={
                        <div className="flex min-h-[40vh] items-center justify-center p-8">
                          <SimpleLoader
                            visible
                            message={t("common.loading")}
                          />
                        </div>
                      }
                    >
                      <div className="min-h-[72vh] w-full min-w-0">
                        <GuacamoleDisplay
                          key={`edex-guac-${guacPortalTab.id}`}
                          connectionConfig={
                            guacPortalTab.connectionConfig as GuacamoleConnectionConfig
                          }
                          isVisible
                          onDisconnect={closePortal}
                          onError={(err) => {
                            toast.error(err);
                            closePortal();
                          }}
                        />
                      </div>
                    </Suspense>
                  ) : null}
                </EdexShellFrameProvider>
              </div>
            </div>
          </div>
        ) : null}

        <EdexTermixHostProvider value={hostValue}>
          <EdexTermixBridgeProvider value={bridgeValue}>
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-white/70">
                  Loading eDEX Vite shell…
                </div>
              }
            >
              <EdexViteShellApp />
            </Suspense>
          </EdexTermixBridgeProvider>
        </EdexTermixHostProvider>
      </div>
    </SidebarProvider>
  );
}
