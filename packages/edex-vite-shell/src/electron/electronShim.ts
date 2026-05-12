/**
 * Phase A stubs for Electron / Node APIs used by upstream eDEX-UI (`@electron/remote`,
 * `ipcRenderer`, `fs`, etc.). Expand with typed facades before porting each class.
 *
 * Rule: no `require("electron")` in this package — CI / review should grep for it.
 */

export type IpcHandler = (...args: unknown[]) => void;

/** Minimal `ipcRenderer`-shaped facade for ported code. */
export const ipcRenderer = {
  on(_channel: string, _handler: IpcHandler): void {
    /* stub */
  },
  once(_channel: string, _handler: IpcHandler): void {
    /* stub */
  },
  send(_channel: string, ..._args: unknown[]): void {
    /* stub */
  },
  invoke(_channel: string, ..._args: unknown[]): Promise<unknown> {
    console.warn(`[electronShim] ipcRenderer.invoke(${_channel}) — not implemented`);
    return Promise.resolve(undefined);
  },
  removeAllListeners(_channel?: string): void {
    void _channel;
    /* stub */
  },
};

/** Placeholder for `@electron/remote`-style access; real app uses Termix APIs. */
export const remoteStub = {
  app: {
    getPath(_name: string): string {
      return "/edex-shim/userData";
    },
    getVersion(): string {
      return "0.0.0-edex-vite-shim";
    },
  },
  process: {
    argv: [] as string[],
  },
};
