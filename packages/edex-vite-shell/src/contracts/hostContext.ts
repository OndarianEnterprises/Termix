/**
 * Active remote host (or Termix server) for eDEX-style widgets.
 * Phase A: mock; Phase B: TabContext / SSH session from Termix.
 */

export type HostConnectionState =
  | "disconnected"
  | "connecting"
  | "ready"
  | "error";

export interface HostContext {
  /** Stable id for React keys and WS routing (Termix host id or synthetic mock id). */
  hostId: string;
  /** Human label (hostname, alias, or "Termix server"). */
  displayName: string;
  connection: HostConnectionState;
  /** Last transport or API error message, if any. */
  lastError?: string | null;
  /** Termix backend host identifier when merged (opaque string). */
  backendHostKey?: string;
}
