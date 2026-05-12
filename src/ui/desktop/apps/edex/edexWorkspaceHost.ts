import type { SSHHost, TabContextTab } from "@/types";

/**
 * Resolves which SSH host backs the eDEX multi-panel workspace for the active tab.
 * Mirrors the previous `workspaceHost` logic in `EdexShell`.
 */
export function resolveEdexWorkspaceHostForShell(
  tab: TabContextTab | undefined,
): SSHHost | null {
  if (!tab?.hostConfig) return null;

  const ct = tab.hostConfig.connectionType;
  if (ct === "rdp" || ct === "vnc" || ct === "telnet") {
    return null;
  }

  if (
    tab.type === "terminal" ||
    tab.type === "server_stats" ||
    tab.type === "file_manager" ||
    tab.type === "tunnel" ||
    tab.type === "docker" ||
    tab.type === "ssh_manager"
  ) {
    return tab.hostConfig;
  }

  return null;
}

const EDEX_MULTIPANEL_TAB_TYPES = new Set<TabContextTab["type"]>([
  "terminal",
  "server_stats",
  "file_manager",
  "tunnel",
  "docker",
]);

export function isEdexMultipanelTabType(
  type: TabContextTab["type"] | undefined,
): boolean {
  return type != null && EDEX_MULTIPANEL_TAB_TYPES.has(type);
}

export function isEdexAppViewTabType(
  type: TabContextTab["type"] | undefined,
): boolean {
  if (type == null) return false;
  return (
    type === "rdp" ||
    type === "vnc" ||
    type === "telnet" ||
    type === "network_graph"
  );
}
