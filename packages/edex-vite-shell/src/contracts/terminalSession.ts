/**
 * One terminal tab / pane bound to a host context.
 * Aligns with Termix xterm + WebSocket session in Phase B.
 */

export type TerminalTransportKind = "mock" | "ws_json";

export interface TerminalSession {
  sessionId: string;
  /** Matches `HostContext.hostId` this session is bound to. */
  hostId: string;
  cols: number;
  rows: number;
  title?: string;
  transport: TerminalTransportKind;
  /** When `transport === "ws_json"`, same origin or absolute WS URL (no auth in Phase A demo). */
  wsUrl?: string | null;
}
