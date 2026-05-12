import type { SSHHostWithStatus } from "@/ui/main-axios.ts";

export type EdexGlobeMarker = {
  id: string;
  label: string;
  leftPct: number;
  topPct: number;
  status: "online" | "offline" | "unknown";
};

const MAX_MARKERS = 64;

function djb2(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return h >>> 0;
}

/** Deterministic pseudo lat/lng from host identity (decorative, not geo-IP). */
function pseudoLatLng(host: SSHHostWithStatus): { lat: number; lng: number } {
  const a = djb2(`${host.id}\0${host.ip}\0${host.name ?? ""}`);
  const b = djb2(`${host.ip}\0${host.id}`);
  const lat = ((a & 0xffff) / 0xffff) * 160 - 80;
  const lng = ((b & 0xffff) / 0xffff) * 360 - 180;
  return { lat, lng };
}

function projectOntoDisk(lat: number, lng: number): {
  leftPct: number;
  topPct: number;
  visible: boolean;
} {
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;
  const x = Math.cos(latR) * Math.sin(lngR);
  const y = Math.sin(latR);
  const z = Math.cos(latR) * Math.cos(lngR);
  const visible = z > -0.22;
  const leftPct = 50 + 44 * x;
  const topPct = 50 - 44 * y;
  return { leftPct, topPct, visible };
}

function isSshLikeHost(host: SSHHostWithStatus): boolean {
  const ct = host.connectionType ?? "ssh";
  return ct === "ssh" || ct === "telnet";
}

/**
 * Builds HUD markers for the CSS globe from saved SSH hosts (plus status tint).
 * Positions are pseudo-random but stable per host; not geographic truth.
 */
export function buildEdexGlobeMarkersFromHosts(
  hosts: SSHHostWithStatus[],
): EdexGlobeMarker[] {
  const sshHosts = hosts.filter(isSshLikeHost);
  sshHosts.sort((a, b) => a.id - b.id);
  const slice = sshHosts.slice(0, MAX_MARKERS);

  const out: EdexGlobeMarker[] = [];
  for (const host of slice) {
    const { lat, lng } = pseudoLatLng(host);
    const { leftPct, topPct, visible } = projectOntoDisk(lat, lng);
    if (!visible) {
      continue;
    }
    out.push({
      id: `host-${host.id}`,
      label: host.name || host.ip,
      leftPct,
      topPct,
      status: host.status,
    });
  }
  return out;
}
