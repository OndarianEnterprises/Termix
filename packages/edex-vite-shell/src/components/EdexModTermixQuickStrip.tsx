import { type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { EdexThemeRgb } from "../theme/loadEdexTheme";
import { useEdexTermixHost } from "../context/EdexTermixHostContext";

function rgb(c: EdexThemeRgb): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

/**
 * Termix-only quick links when the shell runs embedded (Milestone 1 chrome).
 */
export function EdexModTermixQuickStrip({ themeRgb }: { themeRgb: EdexThemeRgb }) {
  const { t } = useTranslation();
  const host = useEdexTermixHost();
  if (!host) return null;

  const accent = rgb(themeRgb);
  const btn: CSSProperties = {
    display: "block",
    width: "100%",
    margin: "0.2vh 0",
    padding: "0.35vh 0.2vw",
    fontFamily: "var(--font_main), sans-serif",
    fontSize: "1.05vh",
    textAlign: "center",
    color: accent,
    background: "transparent",
    border: `0.1vh solid rgba(${themeRgb.r}, ${themeRgb.g}, ${themeRgb.b}, 0.35)`,
    borderRadius: "0.2vh",
    cursor: "pointer",
  };

  return (
    <div
      id="mod_termix_quick"
      style={{
        marginTop: "0.8vh",
        paddingTop: "0.6vh",
        borderTop: `0.12vh solid rgba(${themeRgb.r}, ${themeRgb.g}, ${themeRgb.b}, 0.25)`,
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font_main), sans-serif",
          fontSize: "1.1vh",
          opacity: 0.75,
          margin: "0 0 0.4vh 0",
        }}
      >
        TERMIX
      </h1>
      <button type="button" style={btn} onClick={() => host.onOpenHostManager()}>
        {t("nav.hostManager")}
      </button>
      <button type="button" style={btn} onClick={() => host.onOpenUserProfile()}>
        {t("nav.userProfile")}
      </button>
      {host.isAdmin ? (
        <button type="button" style={btn} onClick={() => host.onOpenAdmin()}>
          {t("nav.admin")}
        </button>
      ) : null}
      {host.onOpenCommandPalette ? (
        <button
          type="button"
          style={btn}
          onClick={() => host.onOpenCommandPalette?.()}
        >
          {t("nav.commandPalette")}
        </button>
      ) : null}
      {host.onOpenFileManager ? (
        <button type="button" style={btn} onClick={() => host.onOpenFileManager?.()}>
          {t("nav.fileManager")}
        </button>
      ) : null}
      {host.onOpenServerStats ? (
        <button type="button" style={btn} onClick={() => host.onOpenServerStats?.()}>
          {t("nav.serverStats")}
        </button>
      ) : null}
      {host.onOpenTunnelManager ? (
        <button type="button" style={btn} onClick={() => host.onOpenTunnelManager?.()}>
          {t("nav.tunnels")}
        </button>
      ) : null}
      {host.onOpenDockerManager ? (
        <button type="button" style={btn} onClick={() => host.onOpenDockerManager?.()}>
          {t("nav.docker")}
        </button>
      ) : null}
      {host.remotePortalAvailable && host.onOpenRemoteSession ? (
        <button type="button" style={btn} onClick={() => host.onOpenRemoteSession?.()}>
          {t("edex.viteShell.remoteSession")}
        </button>
      ) : null}
      <button type="button" style={btn} onClick={() => host.onExitToClassic()}>
        Termix desktop
      </button>
    </div>
  );
}
