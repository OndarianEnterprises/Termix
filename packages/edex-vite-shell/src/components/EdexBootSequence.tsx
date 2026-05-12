import { useEffect, useRef, useState } from "react";
import type { EdexThemeRgb } from "../theme/loadEdexTheme";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface EdexBootSequenceProps {
  themeRgb: EdexThemeRgb;
  onDone: () => void;
}

/**
 * Shortened port of `displayLine` + `displayTitleScreen` from upstream `_renderer.js`.
 * Set `VITE_EDEX_SKIP_BOOT=1` to jump straight to the shell. `prefers-reduced-motion` skips animation.
 */
export function EdexBootSequence({ themeRgb, onDone }: EdexBootSequenceProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const skipBoot = import.meta.env.VITE_EDEX_SKIP_BOOT === "1";
  const [phase, setPhase] = useState<"log" | "title">("log");
  const [lines, setLines] = useState<string[]>([]);
  const finished = useRef(false);

  useEffect(() => {
    if (finished.current) return;
    if (prefersReducedMotion || skipBoot) {
      finished.current = true;
      onDone();
      return;
    }

    let cancelled = false;

    const run = async () => {
      const fullBoot = import.meta.env.VITE_EDEX_BOOT_FULL === "1";
      let bootLines: string[] = [];
      try {
        const res = await fetch("/edex-assets/misc/boot_log.txt");
        if (res.ok) {
          const text = await res.text();
          bootLines = text.split("\n").filter((l) => l.length > 0);
        }
      } catch {
        bootLines = ["Welcome to eDEX-UI!", "Kernel bootstrap…"];
      }

      const cap = fullBoot ? Math.min(bootLines.length, 88) : Math.min(bootLines.length, 16);
      for (let i = 0; i < cap; i++) {
        if (cancelled) return;
        setLines((prev) => [...prev, bootLines[i]!]);
        const pace = i < 4 ? 95 : i < 10 ? 42 : 22;
        await delay(pace);
      }

      if (cancelled) return;
      setPhase("title");
      await delay(80);

      if (cancelled) return;
      await delay(920);

      if (cancelled) return;
      finished.current = true;
      onDone();
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [onDone, prefersReducedMotion, skipBoot]);

  if (prefersReducedMotion || skipBoot) {
    return null;
  }

  if (phase === "log") {
    return (
      <section id="boot_screen" aria-label="Boot log">
        {lines.map((line, i) => (
          <span key={`${i}-${line.slice(0, 24)}`}>
            {line}
            <br />
          </span>
        ))}
      </section>
    );
  }

  return (
    <section id="boot_screen" className="center" aria-label="Boot title">
      <h1
        className="glitch"
        style={{
          border: `5px solid rgb(${themeRgb.r}, ${themeRgb.g}, ${themeRgb.b})`,
        }}
      >
        eDEX-UI
      </h1>
    </section>
  );
}
