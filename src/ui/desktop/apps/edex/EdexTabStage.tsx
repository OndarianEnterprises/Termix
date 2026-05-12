import React, { Suspense, lazy, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTabs } from "@/ui/desktop/navigation/tabs/TabContext.tsx";
import {
  isEdexAppViewTabType,
  isEdexMultipanelTabType,
  resolveEdexWorkspaceHostForShell,
} from "@/ui/desktop/apps/edex/edexWorkspaceHost.ts";

const EdexLayout = lazy(() =>
  import("@/ui/desktop/apps/edex/EdexLayout.tsx").then((module) => ({
    default: module.EdexLayout,
  })),
);
const AppView = lazy(() =>
  import("@/ui/desktop/navigation/AppView.tsx").then((module) => ({
    default: module.AppView,
  })),
);
const Dashboard = lazy(() =>
  import("@/ui/desktop/apps/dashboard/Dashboard.tsx").then((module) => ({
    default: module.Dashboard,
  })),
);
const HostManager = lazy(() =>
  import("@/ui/desktop/apps/host-manager/hosts/HostManager.tsx").then(
    (module) => ({
      default: module.HostManager,
    }),
  ),
);
const AdminSettings = lazy(() =>
  import("@/ui/desktop/apps/admin/AdminSettings.tsx").then((module) => ({
    default: module.AdminSettings,
  })),
);
const UserProfile = lazy(() =>
  import("@/ui/desktop/user/UserProfile.tsx").then((module) => ({
    default: module.UserProfile,
  })),
);

export interface EdexStageAuthProps {
  isAuthenticated: boolean;
  authLoading: boolean;
  onAuthSuccess: (authData: {
    isAdmin: boolean;
    username: string | null;
    userId: string | null;
  }) => void;
}

interface EdexTabStageProps {
  isTopbarOpen: boolean;
  rightSidebarOpen: boolean;
  rightSidebarWidth: number;
  stageAuth: EdexStageAuthProps;
}

function StageFallback(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {t("common.loading")}
    </div>
  );
}

export function EdexTabStage({
  isTopbarOpen,
  rightSidebarOpen,
  rightSidebarWidth,
  stageAuth,
}: EdexTabStageProps): React.ReactElement {
  const { tabs, currentTab, updateTab } = useTabs();

  const currentTabData = useMemo(() => {
    if (currentTab == null) return undefined;
    return tabs.find((t) => t.id === currentTab);
  }, [tabs, currentTab]);

  const workspaceHost = useMemo(
    () => resolveEdexWorkspaceHostForShell(currentTabData),
    [currentTabData],
  );

  if (currentTabData == null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
        <p>No tab selected.</p>
      </div>
    );
  }

  const type = currentTabData.type;

  if (isEdexMultipanelTabType(type)) {
    return (
      <Suspense fallback={<StageFallback />}>
        <EdexLayout
          chromeMode="edex"
          workspaceHost={workspaceHost}
          isTopbarOpen={isTopbarOpen}
          rightSidebarOpen={rightSidebarOpen}
          rightSidebarWidth={rightSidebarWidth}
        />
      </Suspense>
    );
  }

  if (isEdexAppViewTabType(type)) {
    return (
      <Suspense fallback={<StageFallback />}>
        <AppView
          isTopbarOpen={isTopbarOpen}
          rightSidebarOpen={rightSidebarOpen}
          rightSidebarWidth={rightSidebarWidth}
        />
      </Suspense>
    );
  }

  if (type === "home") {
    return (
      <Suspense fallback={<StageFallback />}>
        <Dashboard
          isAuthenticated={stageAuth.isAuthenticated}
          authLoading={stageAuth.authLoading}
          onAuthSuccess={stageAuth.onAuthSuccess}
          isTopbarOpen={isTopbarOpen}
          rightSidebarOpen={rightSidebarOpen}
          rightSidebarWidth={rightSidebarWidth}
        />
      </Suspense>
    );
  }

  if (type === "ssh_manager") {
    return (
      <Suspense fallback={<StageFallback />}>
        <HostManager
          isTopbarOpen={isTopbarOpen}
          initialTab={currentTabData.initialTab}
          hostConfig={currentTabData.hostConfig}
          _updateTimestamp={currentTabData._updateTimestamp}
          rightSidebarOpen={rightSidebarOpen}
          rightSidebarWidth={rightSidebarWidth}
          currentTabId={currentTab ?? undefined}
          updateTab={updateTab}
        />
      </Suspense>
    );
  }

  if (type === "admin") {
    return (
      <Suspense fallback={<StageFallback />}>
        <AdminSettings
          isTopbarOpen={isTopbarOpen}
          rightSidebarOpen={rightSidebarOpen}
          rightSidebarWidth={rightSidebarWidth}
        />
      </Suspense>
    );
  }

  if (type === "user_profile") {
    return (
      <div className="h-full min-h-0 overflow-auto thin-scrollbar">
        <Suspense fallback={<StageFallback />}>
          <UserProfile
            isTopbarOpen={isTopbarOpen}
            rightSidebarOpen={rightSidebarOpen}
            rightSidebarWidth={rightSidebarWidth}
            initialTab={currentTabData.initialTab}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
      <p>This tab type is not available in the eDEX shell yet.</p>
      <p className="text-xs font-mono opacity-80">{String(type)}</p>
    </div>
  );
}
