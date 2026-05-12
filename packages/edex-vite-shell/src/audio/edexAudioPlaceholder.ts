/**
 * Stand-in for upstream `window.audioManager` (HTMLAudioElement clips).
 * Set `VITE_EDEX_AUDIO=1` to enable very short WebAudio blips; default is silent.
 */

export type EdexSfxKind =
  | "info"
  | "error"
  | "alarm"
  | "denied"
  | "click"
  | "keyboard";

let ctx: AudioContext | null = null;

function sfxEnabled(): boolean {
  return import.meta.env.VITE_EDEX_AUDIO === "1";
}

function beep(freq: number, durationMs: number, gain = 0.04): void {
  if (!sfxEnabled() || typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!ctx || ctx.state === "closed") ctx = new Ctx();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  } catch {
    /* ignore */
  }
}

const byKind: Record<EdexSfxKind, () => void> = {
  info: () => beep(660, 55, 0.035),
  error: () => beep(120, 120, 0.06),
  alarm: () => beep(440, 90, 0.045),
  denied: () => beep(220, 45, 0.03),
  click: () => beep(880, 28, 0.025),
  keyboard: () => beep(520, 18, 0.02),
};

export const edexAudioFx = {
  play(kind: EdexSfxKind): void {
    byKind[kind]?.();
  },
};
