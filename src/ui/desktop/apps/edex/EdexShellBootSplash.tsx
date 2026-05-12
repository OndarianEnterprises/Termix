import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { useTranslation } from "react-i18next";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion.ts";
import { playEdexBootChime } from "@/ui/desktop/apps/edex/edexBootSound.ts";

const AUTO_DISMISS_MS = 2200;

interface EdexShellBootSplashProps {
  onComplete: () => void;
  bootSoundEnabled?: boolean;
  bootSoundVolume?: number;
  showBootQuip?: boolean;
}

/**
 * Short “interface loading” beat when entering the eDEX shell.
 * Skipped when `prefers-reduced-motion: reduce` (handled by parent) or user dismisses.
 */
export function EdexShellBootSplash({
  onComplete,
  bootSoundEnabled = false,
  bootSoundVolume = 18,
  showBootQuip = false,
}: EdexShellBootSplashProps): React.ReactElement {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const chimePlayedRef = useRef(false);
  onCompleteRef.current = onComplete;

  const [bootQuipLine, setBootQuipLine] = useState<string | null>(null);

  useEffect(() => {
    if (!showBootQuip) {
      setBootQuipLine(null);
      return;
    }
    const raw = t("edex.bootQuips", { returnObjects: true });
    const list = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
    if (!list.length) {
      setBootQuipLine(null);
      return;
    }
    setBootQuipLine(list[Math.floor(Math.random() * list.length)] ?? null);
  }, [showBootQuip, t]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    if (reduced || !bootSoundEnabled || chimePlayedRef.current) {
      return;
    }
    chimePlayedRef.current = true;
    playEdexBootChime(bootSoundVolume);
  }, [reduced, bootSoundEnabled, bootSoundVolume]);

  useEffect(() => {
    if (reduced) {
      finish();
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / AUTO_DISMISS_MS);
      setProgress(p);
      if (p >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [finish]);

  useEffect(() => {
    if (reduced) {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      document.getElementById("edex-boot-splash-skip")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [reduced]);

  return (
    <div
      className="edex-boot-splash fixed inset-0 z-[5500] flex flex-col items-center justify-center gap-6 px-6 text-center backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edex-boot-splash-title"
      aria-describedby="edex-boot-splash-desc"
    >
      <div className="font-mono text-[0.65rem] tracking-[0.45em] text-muted-foreground">
        {t("edex.bootSplash.brand")}
      </div>
      <h1
        id="edex-boot-splash-title"
        className="font-mono text-lg sm:text-xl tracking-[0.2em] text-foreground"
      >
        {t("edex.bootSplash.title")}
      </h1>
      <div
        id="edex-boot-splash-desc"
        className="max-w-md space-y-2 text-xs text-muted-foreground"
      >
        <p>{t("edex.bootSplash.hint")}</p>
        {bootQuipLine ? (
          <p className="font-mono text-[0.8rem] italic leading-snug tracking-wide text-muted-foreground/90">
            {bootQuipLine}
          </p>
        ) : null}
      </div>
      <div
        className="h-1.5 w-[min(280px,70vw)] overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label={t("edex.bootSplash.progressLabel")}
      >
        <div
          className="edex-boot-splash__bar h-full rounded-full"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <Button
        id="edex-boot-splash-skip"
        type="button"
        variant="outline"
        className="mt-2 min-h-11 cursor-pointer px-6"
        onClick={finish}
      >
        {t("edex.bootSplash.skip")}
      </Button>
    </div>
  );
}
