/**
 * Optional procedural “interface online” chime for the eDEX boot splash.
 * Autoplay policy failures are ignored (no throw).
 */

export function playEdexBootChime(volumePercent: number): void {
  if (typeof window === "undefined") {
    return;
  }
  const ctor =
    window.AudioContext ??
    (
      window as unknown as {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!ctor) {
    return;
  }
  const gainScalar = (Math.max(0, Math.min(100, volumePercent)) / 100) * 0.12;
  if (gainScalar <= 0) {
    return;
  }
  try {
    const ctx = new ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = gainScalar;
    osc.type = "sine";
    osc.frequency.value = 520;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime;
    osc.start(t0);
    osc.stop(t0 + 0.1);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    // suspended context / autoplay blocked
  }
}
