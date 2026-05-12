import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { TopNavbar } from "@/ui/desktop/navigation/TopNavbar.tsx";
import { useTabs } from "@/ui/desktop/navigation/tabs/TabContext.tsx";
import { useEdexSettings } from "@/ui/desktop/apps/edex/edexSettings.ts";
import { EdexShellBootSplash } from "@/ui/desktop/apps/edex/EdexShellBootSplash.tsx";
import { EdexGlobeBackdrop } from "@/ui/desktop/apps/edex/EdexGlobeBackdrop.tsx";
import {
  buildEdexGlobeMarkersFromHosts,
  type EdexGlobeMarker,
} from "@/ui/desktop/apps/edex/edexGlobeMarkers.ts";
import { EdexHostsPanel } from "@/ui/desktop/apps/edex/EdexHostsPanel.tsx";
import { HardDrive, LayoutGrid, Menu, User2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { getSSHHosts, logoutUser } from "@/ui/main-axios.ts";
import { useTranslation } from "react-i18next";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils.ts";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion.ts";
import {
  readEdexBootDismissedThisSession,
  writeEdexBootDismissedThisSession,
} from "@/ui/desktop/apps/edex/edexBootSession.ts";
import { EdexShellQuickSettings } from "@/ui/desktop/apps/edex/EdexShellQuickSettings.tsx";
import { EdexShellSystemMenu } from "@/ui/desktop/apps/edex/EdexShellSystemMenu.tsx";
import { EdexShellFrameProvider } from "@/ui/desktop/apps/edex/edexShellFrameContext.tsx";
import {
  EdexTabStage,
  type EdexStageAuthProps,
} from "@/ui/desktop/apps/edex/EdexTabStage.tsx";

interface EdexShellProps {
  stageAuth: EdexStageAuthProps;
  isTopbarOpen: boolean;
  setIsTopbarOpen: (open: boolean) => void;
  rightSidebarOpen: boolean;
  rightSidebarWidth?: number;
  onRightSidebarStateChange: (isOpen: boolean, width: number) => void;
  isAdmin?: boolean;
  username?: string | null;
  onLogout?: () => void;
}

async function handleLogoutDefault() {
  try {
    await logoutUser();
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    window.location.reload();
  }
}

export function EdexShell({
  stageAuth,
  isTopbarOpen,
  setIsTopbarOpen,
  rightSidebarOpen,
  rightSidebarWidth = 400,
  onRightSidebarStateChange,
  isAdmin,
  username,
  onLogout,
}: EdexShellProps): React.ReactElement {
  const { t } = useTranslation();
  const { config: edexConfig, updateConfig } = useEdexSettings();
  const { tabs, addTab, setCurrentTab, allSplitScreenTab } = useTabs();

  const [hostsOpen, setHostsOpen] = useState(false);
  const [globeMarkers, setGlobeMarkers] = useState<EdexGlobeMarker[]>([]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [shellIntro, setShellIntro] = useState(true);
  const sessionBootDismissed =
    edexConfig.shellBootSplashOncePerSession &&
    readEdexBootDismissedThisSession();
  const skipBootSplash =
    !edexConfig.shellBootSplash ||
    prefersReducedMotion ||
    sessionBootDismissed;
  const [bootDone, setBootDone] = useState(skipBootSplash);

  useEffect(() => {
    if (skipBootSplash) {
      setBootDone(true);
    }
  }, [skipBootSplash]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setShellIntro(false);
      return;
    }
    const id = window.setTimeout(() => setShellIntro(false), 400);
    return () => window.clearTimeout(id);
  }, [prefersReducedMotion]);

  const reloadGlobeMarkers = useCallback(() => {
    if (
      !bootDone ||
      !edexConfig.globeEnabled ||
      !edexConfig.globeShowHostMarkers
    ) {
      setGlobeMarkers([]);
      return;
    }
    getSSHHosts()
      .then((hosts) => {
        setGlobeMarkers(buildEdexGlobeMarkersFromHosts(hosts));
      })
      .catch(() => {
        setGlobeMarkers([]);
      });
  }, [bootDone, edexConfig.globeEnabled, edexConfig.globeShowHostMarkers]);

  useEffect(() => {
    reloadGlobeMarkers();
  }, [reloadGlobeMarkers]);

  useEffect(() => {
    if (
      !bootDone ||
      !edexConfig.globeEnabled ||
      !edexConfig.globeShowHostMarkers
    ) {
      return;
    }
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        reloadGlobeMarkers();
      }, 500);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        schedule();
      }
    };
    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [
    bootDone,
    edexConfig.globeEnabled,
    edexConfig.globeShowHostMarkers,
    reloadGlobeMarkers,
  ]);

  const isSplitScreenActive =
    Array.isArray(allSplitScreenTab) && allSplitScreenTab.length > 0;

  const openSshManagerTab = () => {
    if (isSplitScreenActive) return;
    const existing = tabs.find((t) => t.type === "ssh_manager");
    if (existing) {
      setCurrentTab(existing.id);
      return;
    }
    const id = addTab({ type: "ssh_manager", title: t("nav.hostManager") });
    setCurrentTab(id);
  };

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          // Same token LeftSidebar uses so `AppView` / stats / margins stay consistent.
          "--sidebar-width": "250px",
        } as React.CSSProperties
      }
    >
    <EdexShellFrameProvider>
    <div
      className={cn(
        "edex-app-shell fixed inset-0 z-[5000] flex min-h-0 flex-col text-foreground",
        shellIntro && "edex-shell--intro",
      )}
    >
      {bootDone && edexConfig.globeEnabled ? (
        <EdexGlobeBackdrop markers={globeMarkers} />
      ) : null}
      {!bootDone && edexConfig.shellBootSplash ? (
        <EdexShellBootSplash
          bootSoundEnabled={edexConfig.shellBootSoundEnabled}
          bootSoundVolume={edexConfig.shellBootSoundVolume}
          showBootQuip={edexConfig.shellBootQuipEnabled}
          onComplete={() => {
            if (edexConfig.shellBootSplashOncePerSession) {
              writeEdexBootDismissedThisSession();
            }
            setBootDone(true);
          }}
        />
      ) : null}
      <header className="edex-app-shell__header relative z-20 flex items-center justify-between gap-3 border-b border-edge px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-mono text-xs tracking-[0.35em] text-foreground truncate">
            TERMIX // EDEX
          </div>
          <EdexShellSystemMenu
            disabled={isSplitScreenActive}
            isAdmin={isAdmin}
            onOpenProfile={() =>
              addTab({ type: "user_profile", title: t("nav.userProfile") })
            }
            onOpenAdmin={() => addTab({ type: "admin", title: t("nav.admin") })}
            onOpenSshManager={openSshManagerTab}
            onOpenHostsOverlay={() => setHostsOpen(true)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 cursor-pointer border-edge px-3"
            onClick={() => setHostsOpen(true)}
            disabled={isSplitScreenActive}
            title={
              isSplitScreenActive
                ? t("interface.disabledDuringSplitScreen")
                : t("nav.hosts", { defaultValue: "Hosts" })
            }
          >
            <Menu className="h-4 w-4 mr-2" />
            {t("nav.hosts", { defaultValue: "Hosts" })}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 cursor-pointer border-edge px-3"
            onClick={openSshManagerTab}
            disabled={isSplitScreenActive}
            title={t("nav.hostManager")}
          >
            <HardDrive className="h-4 w-4 mr-2" />
            {t("nav.hostManager")}
          </Button>

          <EdexShellQuickSettings
            config={edexConfig}
            updateConfig={updateConfig}
            disabled={isSplitScreenActive}
          />

          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 cursor-pointer border-edge px-3"
            onClick={() => updateConfig({ shellUi: "classic" })}
            title={t("nav.classicUi", { defaultValue: "Classic UI" })}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            {t("nav.classicUi", { defaultValue: "Classic" })}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-11 cursor-pointer border-edge px-3"
              >
                <User2 className="h-4 w-4 mr-2" />
                {username ? username : t("common.account", { defaultValue: "Account" })}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="end"
              sideOffset={6}
              className="min-w-[220px] bg-sidebar-accent text-sidebar-accent-foreground border border-border rounded-md shadow-2xl p-1"
            >
              <DropdownMenuItem
                className="rounded px-2 py-1.5 hover:bg-surface-hover hover:text-accent-foreground focus:bg-surface-hover focus:text-accent-foreground cursor-pointer focus:outline-none"
                onClick={() => addTab({ type: "user_profile", title: t("nav.userProfile") })}
              >
                <span>{t("profile.title")}</span>
              </DropdownMenuItem>
              {isAdmin ? (
                <DropdownMenuItem
                  className="rounded px-2 py-1.5 hover:bg-surface-hover hover:text-accent-foreground focus:bg-surface-hover focus:text-accent-foreground cursor-pointer focus:outline-none"
                  onClick={() => addTab({ type: "admin", title: t("nav.admin") })}
                >
                  <span>{t("admin.title")}</span>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="rounded px-2 py-1.5 hover:bg-surface-hover hover:text-accent-foreground focus:bg-surface-hover focus:text-accent-foreground cursor-pointer focus:outline-none"
                onClick={onLogout || handleLogoutDefault}
              >
                <span>{t("common.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <TopNavbar
          isTopbarOpen={isTopbarOpen}
          setIsTopbarOpen={setIsTopbarOpen}
          onRightSidebarStateChange={onRightSidebarStateChange}
          chromeVariant="edex"
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          <EdexTabStage
            isTopbarOpen={isTopbarOpen}
            rightSidebarOpen={rightSidebarOpen}
            rightSidebarWidth={rightSidebarWidth}
            stageAuth={stageAuth}
          />
        </div>
      </div>

      {hostsOpen ? (
        <div className="fixed inset-0 z-[6000]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("common.close", { defaultValue: "Close" })}
            onClick={() => setHostsOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[min(420px,92vw)] border-r border-edge bg-base shadow-2xl">
            <div className="flex items-center justify-between border-b border-edge px-3 py-2">
              <div className="text-sm font-semibold tracking-wide">
                {t("nav.hosts", { defaultValue: "Hosts" })}
              </div>
              <Button type="button" variant="outline" className="h-8" onClick={() => setHostsOpen(false)}>
                {t("common.close", { defaultValue: "Close" })}
              </Button>
            </div>
            <div className="h-[calc(100%-41px)] min-h-0 p-2">
              <EdexHostsPanel disabled={isSplitScreenActive} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </EdexShellFrameProvider>
    </SidebarProvider>
  );
}
