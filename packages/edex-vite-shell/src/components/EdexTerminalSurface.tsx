import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import type { EdexThemeRgb } from "../theme/loadEdexTheme";
import { useEdexTermixBridge } from "../context/EdexTermixBridgeContext";
import { useEdexTermixHost } from "../context/EdexTermixHostContext";

import "@xterm/xterm/css/xterm.css";

const RESIZE_DEBOUNCE_MS = 140;
const PING_INTERVAL_MS = 30_000;
const CONNECTION_TIMEOUT_MS = 35_000;

function rgbCss(c: EdexThemeRgb): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

function attachMockPty(term: Terminal): () => void {
  let buf = "";
  term.reset();
  term.writeln(
    "\x1b[1;36mTermix / eDEX Vite shell (Phase A)\x1b[0m — local mock PTY.",
  );
  term.writeln("Type `help` for commands. Real SSH uses Termix in Phase B.\r\n");

  const prompt = () => {
    term.write(`\r\n\x1b[1;32medex-mock\x1b[0m$ `);
  };

  const runLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [cmd0, ...rest] = trimmed.split(/\s+/);
    const cmd = cmd0.toLowerCase();
    const arg = rest.join(" ").trim();
    switch (cmd) {
      case "help":
        term.writeln("  help   — this list");
        term.writeln("  clear  — clear screen");
        term.writeln("  echo   — print text");
        term.writeln("  version — build info");
        break;
      case "clear":
        term.clear();
        break;
      case "echo":
        term.writeln(arg);
        break;
      case "version":
        term.writeln("@termix/edex-vite-shell — Phase A mock terminal");
        break;
      default:
        term.writeln(
          `\x1b[33mmock:\x1b[0m unknown command \x1b[35m${cmd0}\x1b[0m — try \x1b[36mhelp\x1b[0m`,
        );
    }
  };

  prompt();

  const sub = term.onData((data) => {
    for (const c of data) {
      const code = c.charCodeAt(0);
      if (c === "\r" || c === "\n") {
        term.write("\r\n");
        runLine(buf);
        buf = "";
        prompt();
      } else if (c === "\x7f" || c === "\b") {
        if (buf.length > 0) {
          buf = buf.slice(0, -1);
          term.write("\b \b");
        }
      } else if (code === 3) {
        term.write("^C\r\n");
        buf = "";
        prompt();
      } else if (code === 12) {
        term.clear();
        buf = "";
        prompt();
      } else if (c >= " " && code < 127) {
        buf += c;
        term.write(c);
      }
    }
  });

  return () => {
    sub.dispose();
  };
}

/**
 * Optional bridge: same JSON framing as Termix (`type: "data"` / `"input"`).
 * Does not send `connectToHost` — use embedded bridge or a custom relay for full SSH.
 */
function attachTermixJsonWire(term: Terminal, url: string): () => void {
  term.reset();
  term.writeln("\x1b[33m[ws]\x1b[0m Connecting…\r\n");
  const ws = new WebSocket(url);
  const sub = term.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "input", data }));
    }
  });

  ws.addEventListener("open", () => {
    term.writeln(
      "\x1b[33m[ws]\x1b[0m Connected — this shell does not send Termix `connectToHost`.",
    );
    term.writeln(
      "Incoming JSON with \x1b[36m{type:\"data\",data:\"...\"}\x1b[0m is written raw.\r\n",
    );
  });

  ws.addEventListener("message", (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as {
        type?: string;
        data?: unknown;
        message?: string;
      };
      if (msg.type === "data" && msg.data !== undefined) {
        term.write(String(msg.data));
      } else if (msg.type === "error" && msg.message) {
        term.writeln(`\r\n\x1b[31m${String(msg.message)}\x1b[0m`);
      }
    } catch {
      if (typeof ev.data === "string") term.write(ev.data);
    }
  });

  ws.addEventListener("close", () => {
    term.writeln("\r\n\x1b[33m[ws] connection closed\x1b[0m");
  });

  ws.addEventListener("error", () => {
    term.writeln("\r\n\x1b[31m[ws] error\x1b[0m");
  });

  return () => {
    sub.dispose();
    ws.close();
  };
}

type TermixServerMessage = {
  type?: string;
  data?: unknown;
  message?: string;
  prompt?: string;
};

function attachEmbeddedTermixSsh(
  term: Terminal,
  opts: {
    baseWsUrl: string;
    hostConfig: Record<string, unknown>;
    instanceId?: string;
    initialPath?: string;
    executeCommand?: string;
  },
): () => void {
  term.reset();
  term.writeln("\x1b[33m[termix]\x1b[0m Connecting SSH session…\r\n");

  const ws = new WebSocket(opts.baseWsUrl);
  let dataSub: { dispose: () => void } | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let pongOk = true;
  let pendingCols = 0;
  let pendingRows = 0;
  let lastSentSize: { cols: number; rows: number } | null = null;

  const hostPayload: Record<string, unknown> = {
    ...opts.hostConfig,
    ...(opts.instanceId !== undefined
      ? { instanceId: opts.instanceId }
      : {}),
  };

  const scheduleResize = (cols: number, rows: number) => {
    if (!(cols > 0 && rows > 0)) return;
    pendingCols = cols;
    pendingRows = rows;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const next = { cols: pendingCols, rows: pendingRows };
      const last = lastSentSize;
      if (last && last.cols === next.cols && last.rows === next.rows) return;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", data: next }));
        lastSentSize = next;
      }
    }, RESIZE_DEBOUNCE_MS);
  };

  const resizeSub = term.onResize(({ cols, rows }) => {
    scheduleResize(cols, rows);
  });

  const onMessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(String(event.data)) as TermixServerMessage;
      const t = msg.type;
      if (t === "pong") {
        pongOk = true;
        return;
      }
      if (t === "data" && msg.data !== undefined) {
        term.write(String(msg.data));
        return;
      }
      if (t === "error") {
        term.writeln(
          `\r\n\x1b[31m[termix]\x1b[0m ${String(msg.message ?? "error")}\r\n`,
        );
        return;
      }
      if (t === "connected") {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        scheduleResize(term.cols, term.rows);
        return;
      }
      if (t === "disconnected" || t === "session_ended") {
        term.writeln(
          `\r\n\x1b[33m[termix]\x1b[0m Session ended: ${String(msg.message ?? t)}\r\n`,
        );
        return;
      }
      if (
        t === "totp_required" ||
        t === "password_required" ||
        t === "passphrase_required" ||
        t === "host_key_verification" ||
        t === "opkssh_auth_required" ||
        t === "warpgate_auth_required"
      ) {
        term.writeln(
          `\r\n\x1b[33m[termix]\x1b[0m Server requested \x1b[36m${t}\x1b[0m — switch to \x1b[1mTermix desktop\x1b[0m to complete this step.\r\n`,
        );
        return;
      }
    } catch {
      if (typeof event.data === "string") term.write(event.data);
    }
  };

  ws.addEventListener("open", () => {
    connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        term.writeln("\r\n\x1b[31m[termix]\x1b[0m Connection timeout.\r\n");
        ws.close();
      }
    }, CONNECTION_TIMEOUT_MS);

    const persistenceEnabled =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("enableTerminalSessionPersistence") === "true";
    const hid = hostPayload.id;
    const tabId =
      opts.instanceId != null && opts.instanceId !== ""
        ? `${String(hid)}_${opts.instanceId}`
        : `${String(hid)}_${Date.now()}`;
    const savedSessionId = persistenceEnabled
      ? localStorage.getItem(`termix_session_${tabId}`)
      : null;

    const cols = Math.max(term.cols, 1);
    const rows = Math.max(term.rows, 1);

    if (savedSessionId) {
      ws.send(
        JSON.stringify({
          type: "attachSession",
          data: {
            sessionId: savedSessionId,
            cols,
            rows,
            tabInstanceId: opts.instanceId,
          },
        }),
      );
    } else {
      ws.send(
        JSON.stringify({
          type: "connectToHost",
          data: {
            cols,
            rows,
            hostConfig: hostPayload,
            initialPath: opts.initialPath,
            executeCommand: opts.executeCommand,
          },
        }),
      );
    }

    dataSub = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    pongOk = true;
    pingTimer = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      if (!pongOk) {
        ws.close();
        return;
      }
      pongOk = false;
      ws.send(JSON.stringify({ type: "ping" }));
    }, PING_INTERVAL_MS);
  });

  ws.addEventListener("message", onMessage);

  ws.addEventListener("close", () => {
    term.writeln("\r\n\x1b[33m[termix]\x1b[0m WebSocket closed.\r\n");
  });

  ws.addEventListener("error", () => {
    term.writeln("\r\n\x1b[31m[termix]\x1b[0m WebSocket error.\r\n");
  });

  return () => {
    resizeSub.dispose();
    if (connectionTimeout) clearTimeout(connectionTimeout);
    if (resizeTimer) clearTimeout(resizeTimer);
    if (pingTimer) clearInterval(pingTimer);
    dataSub?.dispose();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "disconnect" }));
    }
    ws.close();
  };
}

function attachEmbeddedBridgeWaiting(
  term: Terminal,
  reason: string,
): () => void {
  term.reset();
  term.writeln(`\x1b[33m[termix]\x1b[0m ${reason}\r\n`);
  return () => {};
}

export interface EdexTerminalSurfaceProps {
  themeRgb: EdexThemeRgb;
}

/**
 * xterm in `#terminal0`: embedded Termix SSH when `EdexTermixBridgeProvider` supplies
 * a session + URL; else optional `VITE_EDEX_TERMINAL_WS` JSON wire; else local mock PTY.
 */
export function EdexTerminalSurface({ themeRgb }: EdexTerminalSurfaceProps) {
  const host = useEdexTermixHost();
  if (host?.embeddedTerminal) {
    return (
      <div
        id="terminal0"
        className="active termix-edex-native-terminal"
        style={{
          margin: 0,
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          minHeight: 0,
          position: "relative",
        }}
      >
        {host.embeddedTerminal}
      </div>
    );
  }

  const preRef = useRef<HTMLPreElement | null>(null);
  const bridge = useEdexTermixBridge();

  useEffect(() => {
    const el = preRef.current;
    if (!el) return;

    const fg = rgbCss(themeRgb);
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "var(--font_mono), ui-monospace, monospace",
      fontSize: 14,
      theme: {
        background: "#05080d",
        foreground: fg,
        cursor: fg,
        cursorAccent: "#05080d",
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);

    let detach: () => void;

    if (bridge) {
      if (bridge.baseWsUrlError) {
        detach = attachEmbeddedBridgeWaiting(
          term,
          `WebSocket URL error: ${bridge.baseWsUrlError}`,
        );
      } else if (!bridge.session) {
        detach = attachEmbeddedBridgeWaiting(
          term,
          "No SSH terminal tab with a host found. Open a terminal tab in Termix, then return to eDEX Vite.",
        );
      } else if (!bridge.baseWsUrl) {
        detach = attachEmbeddedBridgeWaiting(
          term,
          "Resolving SSH WebSocket URL…",
        );
      } else {
        detach = attachEmbeddedTermixSsh(term, {
          baseWsUrl: bridge.baseWsUrl,
          hostConfig: bridge.session.hostConfig,
          instanceId: bridge.session.instanceId,
          initialPath: bridge.session.initialPath,
          executeCommand: bridge.session.executeCommand,
        });
      }
    } else {
      const wsUrl = import.meta.env.VITE_EDEX_TERMINAL_WS;
      const useWs =
        typeof wsUrl === "string" && wsUrl.trim().length > 0
          ? wsUrl.trim()
          : null;
      detach = useWs
        ? attachTermixJsonWire(term, useWs)
        : attachMockPty(term);
    }

    const ro = new ResizeObserver(() => {
      fit.fit();
    });
    ro.observe(el);
    fit.fit();
    term.focus();

    return () => {
      ro.disconnect();
      detach();
      term.dispose();
    };
  }, [
    themeRgb.r,
    themeRgb.g,
    themeRgb.b,
    bridge?.baseWsUrl,
    bridge?.baseWsUrlError,
    bridge?.session?.hostRevision,
    bridge?.session?.hostConfig?.id,
    bridge?.session?.instanceId,
    bridge?.session?.initialPath,
    bridge?.session?.executeCommand,
  ]);

  return (
    <pre
      id="terminal0"
      className="active"
      ref={preRef}
      style={{ margin: 0, boxSizing: "border-box" }}
    />
  );
}
