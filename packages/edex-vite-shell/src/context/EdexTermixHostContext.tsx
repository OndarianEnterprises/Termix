import { createContext, useContext, type ReactNode } from "react";
import type { RemoteMetricsSnapshot } from "../contracts/hostMetrics";

/** Tab strip entry mirrored from Termix `TabContext` (no Termix types in this package). */
export type EdexTermixShellTab = {
  id: number;
  title: string;
  type: string;
};

/** One row in the in-shell hosts panel (Termix maps from `getSSHHosts()`). */
export type EdexTermixHostListEntry = {
  id: number;
  title: string;
  subtitle: string;
  connectionType?: string;
  /** When false, the row is shown disabled for SSH terminal opens. */
  terminalEnabled?: boolean;
};

export type EdexTermixHostValue = {
  username: string | null;
  isAdmin: boolean;
  /** Greeting line in the main shell (typically the signed-in username). */
  displayName: string | null;
  shellTabs: EdexTermixShellTab[];
  currentTabId: number | null;
  onSelectTab: (tabId: number) => void;
  onOpenHostManager: () => void;
  onOpenUserProfile: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  onExitToClassic: () => void;
  /**
   * When set, `EdexTerminalSurface` mounts this instead of the mock xterm / thin
   * WebSocket bridge (Termix passes the real `Terminal` component).
   */
  embeddedTerminal?: ReactNode;
  /** Opens the main app command palette (Ctrl/Cmd+K) when embedded in Termix. */
  onOpenCommandPalette?: () => void;
  /** Full-screen Termix `FileManager` overlay for the active SSH context tab. */
  onOpenFileManager?: () => void;
  onOpenServerStats?: () => void;
  onOpenTunnelManager?: () => void;
  onOpenDockerManager?: () => void;
  /** RDP / VNC / Telnet Guacamole session from an open tab with `connectionConfig`. */
  onOpenRemoteSession?: () => void;
  /** Whether an RDP/VNC/Telnet tab with `connectionConfig` exists (for UI affordances). */
  remotePortalAvailable?: boolean;
  /** Saved SSH / Guacamole hosts for the left hosts column (embedded Termix only). */
  sshHosts?: EdexTermixHostListEntry[];
  /** `hostConfig.id` for the tab currently driving the embedded terminal, if any. */
  activeTerminalHostId?: number | null;
  /** Open or focus a terminal (or Guacamole) tab for this host id. */
  onOpenHostFromPanel?: (hostId: number) => void | Promise<void>;
  /** Reload `sshHosts` from the server (no-op if not wired). */
  onRefreshSshHostList?: () => void | Promise<void>;
  /** Hosts shown on the globe (embedded Termix); IPv4 drives approximate lat/lon. */
  globeHostMarkers?: Array<{ id: number; label: string; ipv4: string }>;
  /** Primary host for globe label (e.g. current terminal or remote tab). */
  globeFocusedHostId?: number | null;
  /** Host ids with an open tab (satellite emphasis). */
  globeOpenHostIds?: number[];
  /**
   * When set from Termix, CPU/RAM/net/process widgets under the globe use this snapshot.
   * `null` means metrics unavailable; omit field for standalone mock mode.
   */
  remoteHostMetrics?: RemoteMetricsSnapshot | null;
};

const EdexTermixHostContext = createContext<EdexTermixHostValue | undefined>(
  undefined,
);

export function EdexTermixHostProvider({
  value,
  children,
}: {
  value: EdexTermixHostValue;
  children: ReactNode;
}) {
  return (
    <EdexTermixHostContext.Provider value={value}>
      {children}
    </EdexTermixHostContext.Provider>
  );
}

export function useEdexTermixHost(): EdexTermixHostValue | undefined {
  return useContext(EdexTermixHostContext);
}
