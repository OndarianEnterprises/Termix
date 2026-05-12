import { useTranslation } from "react-i18next";
import { useEdexTermixHost } from "../context/EdexTermixHostContext";

/**
 * In-shell host list (embedded Termix): pick a host to open or focus its terminal tab.
 * Styling uses `:root` theme variables from `loadEdexTheme` (`--color_r`, etc.).
 */
export function EdexHostsPanel() {
  const { t } = useTranslation();
  const host = useEdexTermixHost();
  if (!host?.sshHosts) return null;

  return (
    <aside
      id="edex_hosts_panel"
      aria-label={t("edex.viteShell.hostsPanelTitle")}
    >
      <header className="edex_hosts_panel_header">
        <p className="edex_hosts_panel_title" id="edex_hosts_panel_heading">
          {t("edex.viteShell.hostsPanelTitle")}
        </p>
      </header>

      <div
        className="edex_hosts_panel_toolbar"
        role="toolbar"
        aria-orientation="horizontal"
        aria-label={t("edex.viteShell.hostsPanelTitle")}
      >
        {host.onRefreshSshHostList ? (
          <button
            type="button"
            onClick={() => void host.onRefreshSshHostList?.()}
          >
            {t("edex.viteShell.hostsPanelRefresh")}
          </button>
        ) : null}
        <button type="button" onClick={() => host.onOpenHostManager()}>
          {t("edex.viteShell.hostsPanelManage")}
        </button>
      </div>

      <div className="edex_hosts_panel_scroll" aria-labelledby="edex_hosts_panel_heading">
        {host.sshHosts.length === 0 ? (
          <p className="edex_hosts_panel_empty">
            {t("edex.viteShell.hostsPanelEmpty")}
          </p>
        ) : (
          host.sshHosts.map((row) => {
            const active = host.activeTerminalHostId === row.id;
            const disabled =
              row.connectionType === "ssh" && row.terminalEnabled === false;
            return (
              <button
                key={row.id}
                type="button"
                className="edex_hosts_panel_row"
                data-active={active ? "true" : undefined}
                disabled={disabled || !host.onOpenHostFromPanel}
                onClick={() => void host.onOpenHostFromPanel?.(row.id)}
              >
                <span className="edex_hosts_panel_row_title">{row.title}</span>
                <span className="edex_hosts_panel_row_sub">
                  {row.subtitle}
                  {row.connectionType && row.connectionType !== "ssh" ? (
                    <span className="edex_hosts_panel_proto">
                      {" "}
                      · {row.connectionType}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
