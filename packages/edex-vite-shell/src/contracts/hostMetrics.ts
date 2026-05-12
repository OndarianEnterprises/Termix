/**
 * Phase A DTOs for host / system widgets. Align with Termix server or agent payloads in Phase B.
 */

/** One sample of aggregate CPU view (per-core or grouped charts). */
export interface CpuMetricsSample {
  /** 0–100 per logical core (order stable for UI grouping). */
  coreUsagePct: number[];
  speedMinGhz: number;
  speedMaxGhz: number;
  /** Optional die temperature. */
  tempC?: number | null;
  /** Runnable + blocked task hint (OS-specific in production). */
  taskCount: number;
}

/** Memory snapshot for RAM / swap widgets. */
export interface MemoryMetricsSample {
  totalBytes: number;
  activeBytes: number;
  availableBytes: number;
  freeBytes: number;
  swapUsedBytes: number;
  swapTotalBytes: number;
}

/** Primary IPv4 interface summary for netstat strip. */
export interface NetworkIfaceSample {
  iface: string;
  operstate: string;
  ipv4: string;
  /** Round-trip to default gateway or last hop (ms). */
  pingMs: number | null;
}

/** One row in “top processes” table. */
export interface TopProcessRow {
  pid: number;
  name: string;
  cpuPct: number;
  memPct: number;
}

/** Chassis / system identity (hardware inspector). */
export interface HardwareIdentitySample {
  manufacturer: string;
  model: string;
  chassis: string;
}

/** Optional battery (laptop). */
export interface BatterySample {
  percent: number | null;
  isCharging?: boolean;
}

/** Aggregate payload Termix may push on a timer (REST or WS). */
export interface RemoteMetricsSnapshot {
  cpu: CpuMetricsSample;
  memory: MemoryMetricsSample;
  network: NetworkIfaceSample;
  processes: TopProcessRow[];
  hardware: HardwareIdentitySample;
  battery: BatterySample;
}
