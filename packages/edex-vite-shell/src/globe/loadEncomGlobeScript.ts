import { edexAssetsUrl } from "../utils/edexAssetsUrl";

/**
 * Loads upstream `encom-globe.js` (browserify bundle) once; exposes `window.ENCOM.Globe`.
 */
export function loadEncomGlobeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.ENCOM?.Globe) return Promise.resolve();

  const existing = document.querySelector(
    'script[data-edex-encom-globe="1"]',
  ) as HTMLScriptElement | null;

  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.ENCOM?.Globe) {
        resolve();
        return;
      }
      const done = () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onErr);
      };
      const onLoad = () => {
        done();
        resolve();
      };
      const onErr = () => {
        done();
        reject(new Error("encom-globe script failed"));
      };
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onErr);
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = edexAssetsUrl("vendor/encom-globe.js");
    s.async = true;
    s.dataset.edexEncomGlobe = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load encom-globe.js"));
    document.head.appendChild(s);
  });
}

/** Minimal surface used by `EdexGlobeModule` (ENCOM bundle is untyped). */
export interface EncomGlobeHandle {
  domElement: HTMLElement;
  tick(): void;
  init(bg: string, onReady: () => void): void;
  addConstellation(
    points: { lat: number; lon: number; altitude: number }[],
  ): void;
  addPin(lat: number, lon: number, label: string, scale: number): {
    remove(): void;
  };
  addMarker(
    lat: number,
    lon: number,
    label: string,
    blink: boolean,
    scale?: number,
  ): { remove(): void };
  addSatellite(
    lat: number,
    lon: number,
    altitude: number,
    opts?: Record<string, unknown>,
  ): { remove(): void };
  camera: { aspect: number; updateProjectionMatrix(): void };
  renderer: { setSize(w: number, h: number): void };
}

declare global {
  interface Window {
    ENCOM?: {
      Globe: new (
        w: number,
        h: number,
        opts: Record<string, unknown>,
      ) => EncomGlobeHandle;
    };
  }
}
