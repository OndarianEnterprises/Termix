import type {
  CpuMetricsSample,
  HardwareIdentitySample,
  MemoryMetricsSample,
  NetworkIfaceSample,
  RemoteMetricsSnapshot,
  TopProcessRow,
} from "../contracts/hostMetrics";

function parsePercentLike(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const n = Number.parseFloat(v.replace("%", "").trim());
  return Number.isFinite(n) ? n : null;
}

function parsePid(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Maps Termix `GET /metrics/:id` payload (collector shape) into `RemoteMetricsSnapshot`
 * for eDEX widgets. Unknown fields fall back to safe defaults.
 */
export function mapTermixMetricsPayloadToRemoteSnapshot(
  raw: unknown,
): RemoteMetricsSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const cpuRaw = o.cpu as Record<string, unknown> | undefined;
  const pct =
    cpuRaw && typeof cpuRaw.percent === "number" && Number.isFinite(cpuRaw.percent)
      ? cpuRaw.percent
      : null;
  const cores =
    cpuRaw && typeof cpuRaw.cores === "number" && Number.isFinite(cpuRaw.cores)
      ? Math.max(1, Math.floor(cpuRaw.cores))
      : 8;
  const coreUsagePct: number[] = Array.from({ length: cores }, () =>
    Math.min(100, Math.max(0, pct ?? 0)),
  );
  const cpu: CpuMetricsSample = {
    coreUsagePct,
    speedMinGhz: 1.8,
    speedMaxGhz: 3.2,
    tempC: null,
    taskCount:
      typeof (o.processes as Record<string, unknown> | undefined)?.total === "number"
        ? ((o.processes as { total: number }).total ?? 0)
        : 0,
  };

  const memRaw = o.memory as Record<string, unknown> | undefined;
  const usedGiB =
    memRaw && typeof memRaw.usedGiB === "number" && Number.isFinite(memRaw.usedGiB)
      ? memRaw.usedGiB
      : 0;
  const totalGiB =
    memRaw && typeof memRaw.totalGiB === "number" && Number.isFinite(memRaw.totalGiB)
      ? memRaw.totalGiB
      : 1;
  const totalBytes = Math.max(1, Math.round(totalGiB * 1024 ** 3));
  const usedBytes = Math.min(totalBytes, Math.max(0, Math.round(usedGiB * 1024 ** 3)));
  const memPct =
    memRaw && typeof memRaw.percent === "number" && Number.isFinite(memRaw.percent)
      ? memRaw.percent
      : totalBytes > 0
        ? (100 * usedBytes) / totalBytes
        : 0;
  const freeGuess = Math.round(totalBytes * 0.08);
  const memory: MemoryMetricsSample = {
    totalBytes,
    activeBytes: usedBytes,
    availableBytes: Math.min(
      totalBytes,
      Math.max(usedBytes, Math.round((totalBytes * (100 - memPct)) / 100)),
    ),
    freeBytes: freeGuess,
    swapUsedBytes: 0,
    swapTotalBytes: 0,
  };

  const net = o.network as Record<string, unknown> | undefined;
  const ifaces = Array.isArray(net?.interfaces)
    ? (net.interfaces as Record<string, unknown>[])
    : [];
  const first = ifaces[0] as Record<string, unknown> | undefined;
  const network: NetworkIfaceSample = {
    iface: typeof first?.name === "string" ? first.name : "eth0",
    operstate: typeof first?.state === "string" ? first.state : "unknown",
    ipv4: typeof first?.ip === "string" ? first.ip : "0.0.0.0",
    pingMs: null,
  };

  const proc = o.processes as Record<string, unknown> | undefined;
  const topRaw = Array.isArray(proc?.top) ? (proc.top as Record<string, unknown>[]) : [];
  const processes: TopProcessRow[] = topRaw.slice(0, 8).map((row) => {
    const cpuV = parsePercentLike(row.cpu);
    const memV = parsePercentLike(row.mem);
    return {
      pid: parsePid(row.pid),
      name: typeof row.command === "string" ? row.command.slice(0, 32) : "process",
      cpuPct: cpuV ?? 0,
      memPct: memV ?? 0,
    };
  });

  const sys = o.system as Record<string, unknown> | undefined;
  const hardware: HardwareIdentitySample = {
    manufacturer: "Remote",
    model: typeof sys?.hostname === "string" ? sys.hostname : "SSH host",
    chassis: "server",
  };

  return {
    cpu,
    memory,
    network,
    processes: processes.length > 0 ? processes : [{ pid: 0, name: "—", cpuPct: 0, memPct: 0 }],
    hardware,
    battery: { percent: null },
  };
}
