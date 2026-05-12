import type {
  BatterySample,
  CpuMetricsSample,
  HardwareIdentitySample,
  MemoryMetricsSample,
  NetworkIfaceSample,
  RemoteMetricsSnapshot,
  TopProcessRow,
} from "../contracts/hostMetrics";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function mockCpuSample(nowMs: number): CpuMetricsSample {
  const cores = 8;
  const coreUsagePct = Array.from({ length: cores }, (_, i) => {
    const v =
      22 +
      28 * Math.sin(nowMs * 0.00035 + i * 0.65) +
      8 * Math.sin(nowMs * 0.0017 + i * 1.3);
    return clamp(v, 3, 98);
  });
  const base = 2.4 + 0.08 * Math.sin(nowMs * 0.00012);
  return {
    coreUsagePct,
    speedMinGhz: clamp(base + 0.1 * Math.sin(nowMs * 0.0002), 0.8, 4.5),
    speedMaxGhz: clamp(base + 1.2 + 0.15 * Math.sin(nowMs * 0.00018), 2, 5.5),
    tempC: 48 + 8 * Math.sin(nowMs * 0.00025),
    taskCount: Math.round(180 + 40 * Math.sin(nowMs * 0.00008)),
  };
}

export function mockMemorySample(nowMs: number): MemoryMetricsSample {
  const totalBytes = 32 * 1024 ** 3;
  const wave = 0.48 + 0.07 * Math.sin(nowMs * 0.00011);
  const activeBytes = Math.round(totalBytes * wave);
  const freeBytes = Math.round(totalBytes * 0.1);
  const availableBytes = Math.round(freeBytes + totalBytes * 0.18);
  const swaptotal = 8 * 1024 ** 3;
  const swapused = Math.round(swaptotal * (0.12 + 0.04 * Math.sin(nowMs * 0.00009)));
  return {
    totalBytes,
    activeBytes,
    availableBytes,
    freeBytes,
    swapUsedBytes: swapused,
    swapTotalBytes: swaptotal,
  };
}

export function mockNetworkSample(nowMs: number): NetworkIfaceSample {
  return {
    iface: "eth0 (mock)",
    operstate: "up",
    ipv4: "10.0.0.42",
    pingMs: Math.round(12 + 6 * Math.sin(nowMs * 0.001)),
  };
}

const MOCK_NAMES = [
  "systemd",
  "node",
  "dockerd",
  "postgres",
  "nginx",
  "sshd",
  "kernel",
  "chrome",
];

export function mockTopProcesses(nowMs: number): TopProcessRow[] {
  const base = Math.floor(nowMs / 2000);
  return [0, 1, 2, 3, 4].map((i) => ({
    pid: 800 + base + i * 17,
    name: MOCK_NAMES[(base + i) % MOCK_NAMES.length],
    cpuPct: clamp(4 + 9 * Math.sin(nowMs * 0.0004 + i) + i * 2, 0.1, 45),
    memPct: clamp(1.5 + 5 * Math.cos(nowMs * 0.00035 + i * 1.1) + i * 1.2, 0.1, 28),
  }));
}

export function mockHardwareIdentity(): HardwareIdentitySample {
  return {
    manufacturer: "MockWorks",
    model: "MW-5000 (Phase A)",
    chassis: "desktop",
  };
}

export function mockBattery(nowMs: number): BatterySample {
  return {
    percent: Math.round(72 + 20 * Math.sin(nowMs * 0.00005)),
    isCharging: false,
  };
}

export function mockRemoteMetricsSnapshot(nowMs: number): RemoteMetricsSnapshot {
  return {
    cpu: mockCpuSample(nowMs),
    memory: mockMemorySample(nowMs),
    network: mockNetworkSample(nowMs),
    processes: mockTopProcesses(nowMs),
    hardware: mockHardwareIdentity(),
    battery: mockBattery(nowMs),
  };
}
