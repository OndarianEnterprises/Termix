import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils.ts";
import type { EdexKeyboardHudLayout } from "@/ui/desktop/apps/edex/edexSettings.ts";

const MAIN_ROW = [
  "KeyQ",
  "KeyW",
  "KeyE",
  "KeyR",
  "KeyT",
  "KeyY",
  "KeyU",
  "KeyI",
  "KeyO",
  "KeyP",
];

const LABELS: Record<string, string> = {
  KeyQ: "Q",
  KeyW: "W",
  KeyE: "E",
  KeyR: "R",
  KeyT: "T",
  KeyY: "Y",
  KeyU: "U",
  KeyI: "I",
  KeyO: "O",
  KeyP: "P",
  Space: "SPACE",
  ShiftLeft: "SHIFT",
  ShiftRight: "SHIFT",
  ControlLeft: "CTRL",
  ControlRight: "CTRL",
  AltLeft: "ALT",
  AltRight: "ALT",
  Tab: "TAB",
  Escape: "ESC",
  Backspace: "BKSP",
  Enter: "ENTER",
  ArrowUp: "UP",
  ArrowDown: "DN",
  ArrowLeft: "LF",
  ArrowRight: "RT",
};

function labelFor(code: string): string {
  return LABELS[code] ?? code.replace(/^Key/, "").replace(/^Digit/, "");
}

interface EdexKeyboardHudProps {
  enabled: boolean;
  layout: EdexKeyboardHudLayout;
}

export function EdexKeyboardHud({
  enabled,
  layout,
}: EdexKeyboardHudProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [active, setActive] = useState<string | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pulse = useCallback((code: string) => {
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
    }
    setActive(code);
    clearTimer.current = setTimeout(() => setActive(null), 420);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      pulse(e.code);
    };
    window.addEventListener("keydown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onDown, true);
      if (clearTimer.current) {
        clearTimeout(clearTimer.current);
      }
    };
  }, [enabled, pulse]);

  const layoutBadge = useMemo(
    () => (layout === "iso" ? "ISO" : "US"),
    [layout],
  );

  if (!enabled) {
    return null;
  }

  return (
    <div
      className="edex-keyboard-hud pointer-events-none absolute bottom-3 right-4 z-[40] flex flex-col items-end gap-1.5 text-[0.62rem] font-mono text-muted-foreground"
      aria-hidden
    >
      <div className="rounded border border-edge/60 bg-base/70 px-1 py-0.5 text-[0.5rem] tracking-[0.2em] text-foreground/70">
        {layoutBadge}
      </div>
      <div className="flex gap-0.5">
        {["Escape", "Tab", "ControlLeft", "AltLeft"].map((code) => (
          <kbd
            key={code}
            className={cn(
              "edex-keyboard-hud__key rounded border border-edge/80 bg-base/80 px-1.5 py-0.5 text-[0.58rem] text-foreground/90 shadow-sm",
              active === code && "edex-keyboard-hud__key--active",
            )}
          >
            {labelFor(code)}
          </kbd>
        ))}
        <kbd
          className={cn(
            "edex-keyboard-hud__key min-w-[4.5rem] rounded border border-edge/80 bg-base/80 px-2 py-0.5 text-center text-[0.58rem] text-foreground/90 shadow-sm",
            active === "Space" && "edex-keyboard-hud__key--active",
          )}
        >
          {labelFor("Space")}
        </kbd>
      </div>
      <div className="flex gap-0.5">
        {MAIN_ROW.map((code) => (
          <kbd
            key={code}
            className={cn(
              "edex-keyboard-hud__key min-w-[1.35rem] rounded border border-edge/80 bg-base/80 px-1 py-0.5 text-center text-[0.58rem] text-foreground/90 shadow-sm",
              active === code && "edex-keyboard-hud__key--active",
            )}
          >
            {labelFor(code)}
          </kbd>
        ))}
      </div>
      <div className="text-xs tracking-wide opacity-90">
        {t("edex.keyboardHud.shortcutsLegend")}
      </div>
    </div>
  );
}
