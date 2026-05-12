import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { EdexGlobeThemeColors } from "../theme/loadEdexTheme";
import {
  loadEncomGlobeScript,
  type EncomGlobeHandle,
} from "../globe/loadEncomGlobeScript";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useEdexTermixHost } from "../context/EdexTermixHostContext";
import { approximateGeoFromIPv4 } from "../utils/approximateGeoFromIp";
import { edexAssetsUrl } from "../utils/edexAssetsUrl";

export interface EdexGlobeModuleProps {
  fontMain: string;
  lightBlack: string;
  globeColors: EdexGlobeThemeColors;
}

function readMockGeo(): { lat: number; lon: number } {
  const lat = Number(import.meta.env.VITE_EDEX_GLOBE_MOCK_LAT ?? "37.7749");
  const lon = Number(import.meta.env.VITE_EDEX_GLOBE_MOCK_LON ?? "-122.4194");
  return {
    lat: Number.isFinite(lat) ? lat : 37.7749,
    lon: Number.isFinite(lon) ? lon : -122.4194,
  };
}

const COLUMN_CHILD_ANIM: CSSProperties = {
  animationPlayState: "running",
};

function mockConstellation(): { lat: number; lon: number; altitude: number }[] {
  const constellation: { lat: number; lon: number; altitude: number }[] = [];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 3; j++) {
      constellation.push({
        lat: 50 * i - 30 + 15 * Math.random(),
        lon: 120 * j - 120 + 30 * i,
        altitude: Math.random() * (1.7 - 1.3) + 1.3,
      });
    }
  }
  return constellation;
}

type Removable = { remove(): void };

type GlobeRuntime = EncomGlobeHandle & {
  addSatellite?: (
    lat: number,
    lon: number,
    altitude: number,
    opts?: Record<string, unknown>,
  ) => Removable;
};

type MarkersPayload = {
  markers: Array<{ id: number; label: string; ipv4: string }>;
  focused: number | null;
  open: number[];
};

function removeAll(removables: Removable[] | undefined): void {
  if (!removables) return;
  for (const r of removables) {
    try {
      r.remove();
    } catch {
      /* ignore */
    }
  }
}

function syncGlobeHostLayers(
  globe: GlobeRuntime,
  inner: HTMLElement,
  payload: MarkersPayload,
  defaultSatelliteColor: string,
): Removable[] {
  const headerInfo = inner.querySelector("i.mod_globe_headerInfo");
  const { markers, focused, open } = payload;

  if (markers.length === 0) {
    const constellation = globe.addConstellation(mockConstellation()) as unknown as Removable[];
    const { lat, lon } = readMockGeo();
    if (headerInfo) {
      headerInfo.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
    const pin = globe.addPin(lat, lon, "", 1.2) as unknown as Removable;
    const marker = globe.addMarker(lat, lon, "", false, 1.2) as unknown as Removable;
    return [...constellation, pin, marker];
  }

  if (typeof globe.addSatellite !== "function") {
    if (headerInfo) headerInfo.textContent = "Globe API limited";
    return [];
  }

  const next: Removable[] = [];
  for (const m of markers) {
    const { lat, lon } = approximateGeoFromIPv4(m.ipv4);
    const isFocused = focused === m.id;
    const isOpen = open.includes(m.id);
    const coreColor = isFocused
      ? "#ffffff"
      : isOpen
        ? "#ffcc66"
        : defaultSatelliteColor;
    const sat = globe.addSatellite!(
      lat,
      lon,
      1.32 + (m.id % 5) * 0.014,
      { coreColor },
    );
    next.push(sat);
  }

  const primary = markers.find((x) => x.id === focused) ?? markers[0];
  if (primary && headerInfo) {
    const { lat, lon } = approximateGeoFromIPv4(primary.ipv4);
    headerInfo.textContent = `${lat.toFixed(2)}, ${lon.toFixed(2)} — ${primary.label}`;
  }

  return next;
}

/**
 * Port of `LocationGlobe` (`locationGlobe.class.js`): ENCOM globe in `#mod_column_right`,
 * tiles from `misc/grid.json`. Optional Termix host markers place one satellite per host IP.
 */
export function EdexGlobeModule({
  fontMain,
  lightBlack,
  globeColors,
}: EdexGlobeModuleProps) {
  const host = useEdexTermixHost();
  const markersRef = useRef<MarkersPayload>({
    markers: [],
    focused: null,
    open: [],
  });
  markersRef.current = {
    markers: host?.globeHostMarkers ?? [],
    focused: host?.globeFocusedHostId ?? null,
    open: host?.globeOpenHostIds ?? [],
  };
  const markersSignature = JSON.stringify(markersRef.current);

  const prefersReducedMotion = usePrefersReducedMotion();
  const skipGlobe = import.meta.env.VITE_EDEX_SKIP_GLOBE === "1";
  const innerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<{
    globe: GlobeRuntime;
    onResize: () => void;
    stopAnim: () => void;
    layers: Removable[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [globeReady, setGlobeReady] = useState(false);

  useEffect(() => {
    if (skipGlobe || prefersReducedMotion) return;

    let cancelled = false;
    const startTimer = window.setTimeout(() => {
      void (async () => {
        try {
          await loadEncomGlobeScript();
          if (cancelled) return;

          const gridRes = await fetch(edexAssetsUrl("misc/grid.json"));
          if (!gridRes.ok) throw new Error(`grid.json ${gridRes.status}`);
          const geodata = (await gridRes.json()) as { tiles: unknown[] };
          if (cancelled) return;

          const inner = innerRef.current;
          const mount = mountRef.current;
          const GlobeCtor = window.ENCOM?.Globe;
          if (!inner || !mount || !GlobeCtor) {
            throw new Error("Globe mount or ENCOM.Globe unavailable");
          }

          let w = mount.offsetWidth;
          let h = mount.offsetHeight;
          if (w < 48) w = Math.max(w, 280);
          if (h < 48) h = Math.max(h, 200);

          const globe = new GlobeCtor(w, h, {
            font: fontMain,
            data: [],
            tiles: geodata.tiles,
            baseColor: globeColors.base,
            markerColor: globeColors.marker,
            pinColor: globeColors.pin,
            satelliteColor: globeColors.satellite,
            scale: 1.1,
            viewAngle: 0.63,
            dayLength: 1000 * 45,
            introLinesDuration: 2000,
            introLinesColor: globeColors.marker,
            maxPins: 300,
            maxMarkers: 100,
          }) as GlobeRuntime;

          mount.replaceChildren();
          mount.appendChild(globe.domElement);

          let animRunning = true;
          const stopAnim = () => {
            animRunning = false;
          };

          const animate = () => {
            if (cancelled || !animRunning) return;
            globe.tick();
            window.setTimeout(() => {
              if (!cancelled && animRunning) {
                try {
                  requestAnimationFrame(animate);
                } catch (e) {
                  console.warn(e);
                }
              }
            }, 1000 / 30);
          };

          globe.init(lightBlack, () => {
            if (!cancelled) animate();
          });

          document.getElementById("mod_globe")?.classList.remove("offline");

          const onResize = () => {
            if (cancelled) return;
            const canvas = mount.querySelector("canvas");
            if (!canvas) return;
            globe.camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
            globe.camera.updateProjectionMatrix();
            globe.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
          };
          window.addEventListener("resize", onResize);
          queueMicrotask(() => {
            if (!cancelled) onResize();
          });

          if (cancelled) {
            window.removeEventListener("resize", onResize);
            stopAnim();
            try {
              globe.domElement.remove();
            } catch {
              /* ignore */
            }
            mount.replaceChildren();
            return;
          }

          const layers = syncGlobeHostLayers(
            globe,
            inner,
            markersRef.current,
            globeColors.satellite,
          );

          runtimeRef.current = { globe, onResize, stopAnim, layers };
          setGlobeReady(true);
          setError(null);
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : String(e));
            console.error(e);
          }
        }
      })();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      setGlobeReady(false);
      const rt = runtimeRef.current;
      if (rt) {
        window.removeEventListener("resize", rt.onResize);
        rt.stopAnim();
        removeAll(rt.layers ?? []);
        try {
          rt.globe.domElement.remove();
        } catch {
          /* ignore */
        }
        runtimeRef.current = null;
      }
      const mount = mountRef.current;
      if (mount) mount.replaceChildren();
    };
  }, [fontMain, lightBlack, globeColors, prefersReducedMotion, skipGlobe]);

  useEffect(() => {
    if (!globeReady || skipGlobe || prefersReducedMotion) return;
    const rt = runtimeRef.current;
    const inner = innerRef.current;
    if (!rt?.globe || !inner) return;

    removeAll(rt.layers ?? []);
    rt.layers = syncGlobeHostLayers(
      rt.globe,
      inner,
      markersRef.current,
      globeColors.satellite,
    );
  }, [globeReady, markersSignature, globeColors.satellite, skipGlobe, prefersReducedMotion]);

  if (skipGlobe) {
    return (
      <div id="mod_globe" style={COLUMN_CHILD_ANIM}>
        <div id="mod_globe_innercontainer">
          <h1>
            WORLD VIEW<i>GLOBAL NETWORK MAP</i>
          </h1>
          <h2>
            ENDPOINT LAT/LON
            <i className="mod_globe_headerInfo">—</i>
          </h2>
          <h3>GLOBE DISABLED</h3>
        </div>
      </div>
    );
  }

  if (prefersReducedMotion) {
    const geo = readMockGeo();
    return (
      <div id="mod_globe" style={COLUMN_CHILD_ANIM}>
        <div id="mod_globe_innercontainer">
          <h1>
            WORLD VIEW<i>GLOBAL NETWORK MAP</i>
          </h1>
          <h2>
            ENDPOINT LAT/LON
            <i className="mod_globe_headerInfo">
              {geo.lat}, {geo.lon}
            </i>
          </h2>
          <p style={{ fontSize: "0.75rem", opacity: 0.75, margin: "0.25rem 0 0" }}>
            Globe animation omitted (prefers-reduced-motion).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="mod_globe" style={COLUMN_CHILD_ANIM}>
      <div id="mod_globe_innercontainer" ref={innerRef}>
        <h1>
          WORLD VIEW<i>GLOBAL NETWORK MAP</i>
        </h1>
        <h2>
          ENDPOINT LAT/LON
          <i className="mod_globe_headerInfo">0.0000, 0.0000</i>
        </h2>
        <div
          id="mod_globe_canvas_placeholder"
          ref={mountRef}
          style={{ minHeight: "10rem", minWidth: "12rem" }}
        />
        {error ? (
          <h3 title={error}>GLOBE ERROR</h3>
        ) : (
          <h3>MOCK DATA</h3>
        )}
      </div>
    </div>
  );
}
