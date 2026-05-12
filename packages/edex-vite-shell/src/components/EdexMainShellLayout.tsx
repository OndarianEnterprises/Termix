import type { CSSProperties } from "react";
import type { EdexLoadedTheme } from "../theme/loadEdexTheme";
import { useEdexTermixHost } from "../context/EdexTermixHostContext";
import { EdexFilesystemPanel } from "./EdexFilesystemPanel";
import { EdexGlobeModule } from "./EdexGlobeModule";
import { EdexHostsPanel } from "./EdexHostsPanel";
import { EdexModColumnLeft } from "./EdexModColumnLeft";
import { EdexModHostMetricsStack } from "./EdexModHostMetricsStack";
import { EdexOnScreenKeyboard } from "./EdexOnScreenKeyboard";
import { EdexTerminalSurface } from "./EdexTerminalSurface";

const COLUMN_CHILD_ANIM: CSSProperties = {
  animationPlayState: "running",
};

const STANDALONE_TAB_PLACEHOLDERS: {
  id: number;
  title: string;
  type: string;
  interactive: boolean;
}[] = [
  { id: 0, title: "MAIN SHELL", type: "placeholder", interactive: false },
  { id: -1, title: "EMPTY", type: "placeholder", interactive: false },
  { id: -2, title: "EMPTY", type: "placeholder", interactive: false },
  { id: -3, title: "EMPTY", type: "placeholder", interactive: false },
  { id: -4, title: "EMPTY", type: "placeholder", interactive: false },
];

function tabLabel(title: string, maxLen: number): string {
  const t = title.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

function shellTabRows(
  host: ReturnType<typeof useEdexTermixHost>,
): { id: number; title: string; type: string; interactive: boolean }[] {
  if (!host) {
    return STANDALONE_TAB_PLACEHOLDERS.slice();
  }
  const rows = host.shellTabs.slice(0, 5).map((t) => ({
    ...t,
    interactive: true,
  }));
  while (rows.length < 5) {
    rows.push({
      id: -(rows.length + 10),
      title: "EMPTY",
      type: "placeholder",
      interactive: false,
    });
  }
  return rows;
}

export interface EdexMainShellLayoutProps {
  displayName: string | null;
  theme: EdexLoadedTheme;
}

/**
 * Five-region layout: top row `20fr / 60fr / 20fr` (stats | terminal | globe + network);
 * bottom row `1fr / 1fr` (filesystem | keyboard).
 */
export function EdexMainShellLayout({
  displayName,
  theme,
}: EdexMainShellLayoutProps) {
  const host = useEdexTermixHost();
  const greetingName =
    host?.displayName?.trim() ||
    (displayName != null && displayName.trim().length > 0
      ? displayName.trim()
      : null);
  const tabRows = shellTabRows(host);

  return (
    <div id="edex_shell_grid">
      <div id="edex_shell_grid_top">
        <div className="edex_shell_cell edex_shell_cell--stats">
          <EdexModColumnLeft themeRgb={theme.rgb} />
        </div>

        <div className="edex_shell_cell edex_shell_cell--terminal">
          <section
            id="main_shell"
            {...{ "augmented-ui": "bl-clip tr-clip exe" as const }}
          >
            <h3 className="title">
              <p>TERMINAL</p>
              <p>MAIN SHELL</p>
            </h3>
            <h1 id="main_shell_greeting">
              {greetingName ? (
                <>
                  Welcome back, <em>{greetingName}</em>
                </>
              ) : (
                "Welcome back"
              )}
            </h1>

            <ul id="main_shell_tabs">
              {tabRows.map((tab, index) => {
                const active =
                  host != null
                    ? tab.interactive && tab.id === host.currentTabId
                    : index === 0;
                return (
                  <li
                    key={`${tab.id}-${index}`}
                    id={`shell_tab${index}`}
                    className={active ? "active" : undefined}
                    style={
                      tab.interactive
                        ? { cursor: "pointer" }
                        : { opacity: 0.45, pointerEvents: "none" }
                    }
                    onClick={() => {
                      if (host && tab.interactive) {
                        host.onSelectTab(tab.id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        host &&
                        tab.interactive &&
                        (e.key === "Enter" || e.key === " ")
                      ) {
                        e.preventDefault();
                        host.onSelectTab(tab.id);
                      }
                    }}
                    role={tab.interactive ? "button" : undefined}
                    tabIndex={tab.interactive ? 0 : -1}
                  >
                    <p>{tabLabel(tab.title, 22)}</p>
                  </li>
                );
              })}
            </ul>

            <div id="main_shell_body">
              <div id="main_shell_innercontainer">
                {host?.sshHosts !== undefined ? (
                  <EdexHostsPanel />
                ) : null}
                <div id="main_shell_terminal_stack">
                  <EdexTerminalSurface themeRgb={theme.rgb} />
                  {host?.embeddedTerminal ? null : (
                    <>
                      <pre id="terminal1" />
                      <pre id="terminal2" />
                      <pre id="terminal3" />
                      <pre id="terminal4" />
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="edex_shell_cell edex_shell_cell--globe">
          <section className="mod_column activated" id="mod_column_right">
            <h3 className="title">
              <p>PANEL</p>
              <p>NETWORK</p>
            </h3>
            <div
              className="edex_shell_right_inner"
              style={{ ...COLUMN_CHILD_ANIM, width: "100%" }}
            >
              <div className="edex_shell_globe_slot">
                <EdexGlobeModule
                  fontMain={theme.fontMain}
                  lightBlack={theme.lightBlack}
                  globeColors={theme.globe}
                />
              </div>
              <div className="edex_shell_right_metrics">
                <EdexModHostMetricsStack
                  themeRgb={theme.rgb}
                  placement="right"
                  sections={["net"]}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      <div id="edex_shell_grid_bottom">
        <div className="edex_shell_cell edex_shell_cell--fs">
          <EdexFilesystemPanel themeRgb={theme.rgb} />
        </div>
        <div className="edex_shell_cell edex_shell_cell--keyboard">
          <EdexOnScreenKeyboard />
        </div>
      </div>
    </div>
  );
}
