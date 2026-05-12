import { getBasePath } from "@/lib/base-path";
import { isElectron, isEmbeddedMode, getServerConfig } from "@/ui/main-axios";

export type ResolveTermixSshWsResult =
  | { ok: true; baseWsUrl: string }
  | { ok: false; error: string };

/**
 * Same WebSocket base URL rules as `Terminal.tsx` `connectToHost`
 * (dev proxy, Electron configured URL, web `getBasePath()`).
 */
export async function resolveTermixSshWebSocketBaseUrl(): Promise<ResolveTermixSshWsResult> {
  const isDev =
    !isElectron() &&
    process.env.NODE_ENV === "development" &&
    (window.location.port === "3000" ||
      window.location.port === "5173" ||
      window.location.port === "");

  if (isDev) {
    const baseWsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://localhost:30002`;
    return { ok: true, baseWsUrl };
  }

  if (isElectron()) {
    let configuredUrl = (window as { configuredServerUrl?: string | null })
      .configuredServerUrl;

    if (!configuredUrl && !isEmbeddedMode()) {
      try {
        const serverConfig = await getServerConfig();
        configuredUrl = serverConfig?.serverUrl || null;
        if (configuredUrl) {
          (
            window as Window &
              typeof globalThis & { configuredServerUrl?: string | null }
          ).configuredServerUrl = configuredUrl;
        }
      } catch (error) {
        console.error("Failed to resolve Electron server URL:", error);
      }
    }

    if (isEmbeddedMode()) {
      return { ok: true, baseWsUrl: "ws://127.0.0.1:30002" };
    }
    if (!configuredUrl) {
      return {
        ok: false,
        error: "No configured server URL available for Electron SSH",
      };
    }
    const wsProtocol = configuredUrl.startsWith("https://")
      ? "wss://"
      : "ws://";
    const wsHost = configuredUrl
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    return { ok: true, baseWsUrl: `${wsProtocol}${wsHost}/ssh/websocket/` };
  }

  return { ok: true, baseWsUrl: `${getBasePath()}/ssh/websocket/` };
}
