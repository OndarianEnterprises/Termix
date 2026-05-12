import { useEffect, useMemo, useRef, useState } from "react";
import type { EdexThemeRgb } from "../theme/loadEdexTheme";
import type { MemoryMetricsSample, RemoteMetricsSnapshot } from "../contracts/hostMetrics";
import {
  mockCpuSample,
  mockMemorySample,
  mockNetworkSample,
  mockTopProcesses,
} from "../mock/mockHostMetrics";
import { useEdexTermixHost } from "../context/EdexTermixHostContext";

const RAM_POINTS = 440;

function shuffleIndices(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rgb(rgb: EdexThemeRgb): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function drawSparkline(
  canvas: HTMLCanvasElement | null,
  history: number[],
  stroke: string,
): void {
  if (!canvas || history.length < 2) return;
  const dpr = window.devicePixelRatio || 1;
  const { width: cssW, height: cssH } = canvas.getBoundingClientRect();
  if (cssW < 2 || cssH < 2) return;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  const n = history.length;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * cssW;
    const y = cssH - (history[i] / 100) * cssH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function ramCellClass(domIndex: number, active: number, available: number): string {
  if (domIndex < active) return "mod_ramwatcher_point active";
  if (domIndex < active + available) return "mod_ramwatcher_point available";
  return "mod_ramwatcher_point free";
}

function EdexModCpuinfo({
  themeRgb,
  live,
}: {
  themeRgb: EdexThemeRgb;
  live: RemoteMetricsSnapshot | null;
}) {
  const stroke = rgb(themeRgb);
  const c0 = useRef<HTMLCanvasElement>(null);
  const c1 = useRef<HTMLCanvasElement>(null);
  const h0 = useRef<number[]>([]);
  const h1 = useRef<number[]>([]);
  const [avg0, setAvg0] = useState("--");
  const [avg1, setAvg1] = useState("--");
  const [temp, setTemp] = useState("--°C");
  const [spdMin, setSpdMin] = useState("--GHz");
  const [spdMax, setSpdMax] = useState("--GHz");
  const [tasks, setTasks] = useState("---");

  useEffect(() => {
    if (live) {
      const s = live.cpu;
      const half = Math.max(1, Math.floor(s.coreUsagePct.length / 2));
      const a0 = s.coreUsagePct.slice(0, half).reduce((x, y) => x + y, 0) / half;
      const rest = s.coreUsagePct.length - half;
      const a1 =
        s.coreUsagePct.slice(half).reduce((x, y) => x + y, 0) / Math.max(1, rest);
      h0.current = [...h0.current.slice(-79), a0];
      h1.current = [...h1.current.slice(-79), a1];
      drawSparkline(c0.current, h0.current, stroke);
      drawSparkline(c1.current, h1.current, stroke);
      setAvg0(`${Math.round(a0 * 10) / 10}`);
      setAvg1(`${Math.round(a1 * 10) / 10}`);
      setTemp(s.tempC == null ? "--°C" : `${Math.round(s.tempC * 10) / 10}°C`);
      setSpdMin(`${s.speedMinGhz.toFixed(2)}GHz`);
      setSpdMax(`${s.speedMaxGhz.toFixed(2)}GHz`);
      setTasks(String(s.taskCount));
      return;
    }

    const id = window.setInterval(() => {
      const s = mockCpuSample(Date.now());
      const half = Math.max(1, Math.floor(s.coreUsagePct.length / 2));
      const a0 = s.coreUsagePct.slice(0, half).reduce((x, y) => x + y, 0) / half;
      const rest = s.coreUsagePct.length - half;
      const a1 =
        s.coreUsagePct.slice(half).reduce((x, y) => x + y, 0) / Math.max(1, rest);
      h0.current = [...h0.current.slice(-79), a0];
      h1.current = [...h1.current.slice(-79), a1];
      drawSparkline(c0.current, h0.current, stroke);
      drawSparkline(c1.current, h1.current, stroke);
      setAvg0(`${Math.round(a0 * 10) / 10}`);
      setAvg1(`${Math.round(a1 * 10) / 10}`);
      setTemp(s.tempC == null ? "--°C" : `${Math.round(s.tempC * 10) / 10}°C`);
      setSpdMin(`${s.speedMinGhz.toFixed(2)}GHz`);
      setSpdMax(`${s.speedMaxGhz.toFixed(2)}GHz`);
      setTasks(String(s.taskCount));
    }, 500);
    return () => window.clearInterval(id);
  }, [live, stroke, themeRgb.r, themeRgb.g, themeRgb.b]);

  const divide = 4;
  const cores = 8;

  return (
    <div id="mod_cpuinfo">
      <div id="mod_cpuinfo_innercontainer">
        <h1>
          CPU USAGE<i>{live ? "REMOTE HOST" : "Mock CPU (Phase A)"}</i>
        </h1>
        <div>
          <h1>
            # <em>1</em> - <em>{divide}</em>
            <br />
            <i id="mod_cpuinfo_usagecounter0">Avg. {avg0}%</i>
          </h1>
          <canvas id="mod_cpuinfo_canvas_0" ref={c0} height={60} />
        </div>
        <div>
          <h1>
            # <em>{divide + 1}</em> - <em>{cores}</em>
            <br />
            <i id="mod_cpuinfo_usagecounter1">Avg. {avg1}%</i>
          </h1>
          <canvas id="mod_cpuinfo_canvas_1" ref={c1} height={60} />
        </div>
        <div>
          <div>
            <h1>
              TEMP
              <br />
              <i id="mod_cpuinfo_temp">{temp}</i>
            </h1>
          </div>
          <div>
            <h1>
              SPD
              <br />
              <i id="mod_cpuinfo_speed_min">{spdMin}</i>
            </h1>
          </div>
          <div>
            <h1>
              MAX
              <br />
              <i id="mod_cpuinfo_speed_max">{spdMax}</i>
            </h1>
          </div>
          <div>
            <h1>
              TASKS
              <br />
              <i id="mod_cpuinfo_tasks">{tasks}</i>
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}

function EdexModRamwatcher({ live }: { live: RemoteMetricsSnapshot | null }) {
  const order = useMemo(() => shuffleIndices(RAM_POINTS), []);
  const [mem, setMem] = useState<MemoryMetricsSample>(() => mockMemorySample(Date.now()));

  useEffect(() => {
    if (live) {
      setMem(live.memory);
      return;
    }
    const id = window.setInterval(() => {
      setMem(mockMemorySample(Date.now()));
    }, 1500);
    return () => window.clearInterval(id);
  }, [live]);

  const { active, available } = useMemo(() => {
    const { totalBytes, activeBytes, availableBytes, freeBytes } = mem;
    if (totalBytes <= 0) {
      return { active: 0, available: 0 };
    }
    let a = Math.round((RAM_POINTS * activeBytes) / totalBytes);
    let av = Math.round(
      (RAM_POINTS * (availableBytes - freeBytes)) / totalBytes,
    );
    a = Math.min(RAM_POINTS, Math.max(0, a));
    av = Math.min(Math.max(0, RAM_POINTS - a), Math.max(0, av));
    return { active: a, available: av };
  }, [mem]);

  const totalGiB = Math.round((mem.totalBytes / 1073742000) * 10) / 10;
  const usedGiB = Math.round((mem.activeBytes / 1073742000) * 10) / 10;
  const usedSwap = mem.swapTotalBytes
    ? Math.round((100 * mem.swapUsedBytes) / mem.swapTotalBytes)
    : 0;
  const usedSwapGiB =
    Math.round((mem.swapUsedBytes / 1073742000) * 10) / 10;

  return (
    <div id="mod_ramwatcher">
      <div id="mod_ramwatcher_inner">
        <h1>
          MEMORY<i id="mod_ramwatcher_info">{`USING ${usedGiB} OUT OF ${totalGiB} GiB`}</i>
        </h1>
        <div id="mod_ramwatcher_pointmap">
          {order.map((cellKey, domIndex) => (
            <div
              key={cellKey}
              className={ramCellClass(domIndex, active, available)}
            />
          ))}
        </div>
        <div id="mod_ramwatcher_swapcontainer">
          <h1>SWAP</h1>
          <progress id="mod_ramwatcher_swapbar" max={100} value={usedSwap} />
          <h3 id="mod_ramwatcher_swaptext">{`${usedSwapGiB} GiB`}</h3>
        </div>
      </div>
    </div>
  );
}

function EdexModNetstat({ live }: { live: RemoteMetricsSnapshot | null }) {
  const [iface, setIface] = useState("—");
  const [state, setState] = useState("UNKNOWN");
  const [ip, setIp] = useState("--.--.--.--");
  const [ping, setPing] = useState("--ms");

  useEffect(() => {
    if (live) {
      const n = live.network;
      setIface(n.iface);
      setState(n.operstate.toUpperCase());
      setIp(n.ipv4);
      setPing(n.pingMs === null ? "--ms" : `${n.pingMs}ms`);
      return;
    }
    const tick = () => {
      const n = mockNetworkSample(Date.now());
      setIface(n.iface);
      setState(n.operstate.toUpperCase());
      setIp(n.ipv4);
      setPing(n.pingMs === null ? "--ms" : `${n.pingMs}ms`);
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [live]);

  return (
    <div id="mod_netstat">
      <div id="mod_netstat_inner">
        <h1>
          NETWORK STATUS<i id="mod_netstat_iname">{iface}</i>
        </h1>
        <div id="mod_netstat_innercontainer">
          <div>
            <h1>STATE</h1>
            <h2>{state}</h2>
          </div>
          <div>
            <h1>IPv4</h1>
            <h2>{ip}</h2>
          </div>
          <div>
            <h1>PING</h1>
            <h2>{ping}</h2>
          </div>
        </div>
      </div>
    </div>
  );
}

function EdexModToplist({ live }: { live: RemoteMetricsSnapshot | null }) {
  const [rows, setRows] = useState(() => mockTopProcesses(Date.now()));
  const MAX_ROWS = 4;
  const displayRows = useMemo(() => rows.slice(0, MAX_ROWS), [rows]);

  useEffect(() => {
    if (live) {
      setRows((live.processes ?? []).slice(0, MAX_ROWS));
      return;
    }
    const id = window.setInterval(() => {
      setRows(mockTopProcesses(Date.now()));
    }, 2000);
    return () => window.clearInterval(id);
  }, [live]);

  return (
    <div id="mod_toplist">
      <h1>
        TOP PROCESSES<i>PID | NAME | CPU | MEM</i>
      </h1>
      <table id="mod_toplist_table">
        <tbody>
          {displayRows.map((p) => (
            <tr key={`${p.pid}-${p.name}`}>
              <td>{p.pid}</td>
              <td>
                <strong>{p.name}</strong>
              </td>
              <td>{Math.round(p.cpuPct * 10) / 10}%</td>
              <td>{Math.round(p.memPct * 10) / 10}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type EdexHostMetricSection = "cpu" | "ram" | "net" | "top";

const DEFAULT_SECTIONS: EdexHostMetricSection[] = ["cpu", "ram", "net", "top"];

export interface EdexModHostMetricsStackProps {
  themeRgb: EdexThemeRgb;
  /** Narrower max-height when stacked in the left system column. */
  placement?: "left" | "right";
  /** Subset of widgets to render (default: all). */
  sections?: EdexHostMetricSection[];
}

/**
 * CPU / RAM / network / process widgets. Uses `remoteHostMetrics` from
 * `EdexTermixHostProvider` when present; otherwise Phase A mocks.
 */
export function EdexModHostMetricsStack({
  themeRgb,
  placement = "left",
  sections,
}: EdexModHostMetricsStackProps) {
  const host = useEdexTermixHost();
  const live =
    host && Object.prototype.hasOwnProperty.call(host, "remoteHostMetrics")
      ? (host.remoteHostMetrics ?? null)
      : null;

  const active = new Set<EdexHostMetricSection>(
    sections?.length ? sections : DEFAULT_SECTIONS,
  );
  const soloSection = active.size === 1;

  const stackClass = [
    "edex_mod_host_metrics_stack",
    placement === "left" ? "edex_mod_host_metrics_stack--left" : "edex_mod_host_metrics_stack--right",
    soloSection ? "edex_mod_host_metrics_stack--solo" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={stackClass}>
      {active.has("cpu") ? <EdexModCpuinfo themeRgb={themeRgb} live={live} /> : null}
      {active.has("ram") ? <EdexModRamwatcher live={live} /> : null}
      {active.has("net") ? <EdexModNetstat live={live} /> : null}
      {active.has("top") ? <EdexModToplist live={live} /> : null}
    </div>
  );
}
