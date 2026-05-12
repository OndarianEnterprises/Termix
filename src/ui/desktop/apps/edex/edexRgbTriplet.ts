function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * Normalizes a user-provided RGB triplet to the space-separated form used by
 * `rgb(var(--edex-shell-neon-rgb) / …)` in CSS. Accepts commas or spaces.
 */
export function normalizeRgbTriplet(raw: string | undefined, fallback: string): string {
  if (!raw || typeof raw !== "string") {
    return fallback;
  }
  const parts = raw
    .replace(/,/g, " ")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  if (parts.length !== 3) {
    return fallback;
  }
  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  if (![r, g, b].every((n) => Number.isFinite(n))) {
    return fallback;
  }
  return `${clamp255(r)} ${clamp255(g)} ${clamp255(b)}`;
}
