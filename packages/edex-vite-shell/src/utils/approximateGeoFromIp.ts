/**
 * Deterministic pseudo-coordinates from an IPv4 string for globe placement.
 * Not real geolocation; stable per IP for UI consistency.
 */
export function approximateGeoFromIPv4(ip: string): { lat: number; lon: number } {
  const parts = ip.split(".").map((x) => Number.parseInt(x, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return { lat: 20, lon: 0 };
  }
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    h ^= p;
    h = Math.imul(h, 16777619);
  }
  const lat = ((h >>> 0) % 16000) / 200 - 40;
  const lon = (((h >>> 16) % 36000) / 100) - 180;
  return { lat, lon };
}
