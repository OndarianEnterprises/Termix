import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardLayoutDocument } from "../contracts/keyboardLayout";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { edexAssetsUrl } from "../utils/edexAssetsUrl";

/** Matches `keyboard.class.js` `this.ctrlseq` (index 1..length-1 used for `~~~CTRLSEQn~~~`). */
const CTRLSEQ = [
  "",
  "\x1b",
  "\x1c",
  "\x1d",
  "\x1e",
  "\x1f",
  "\x11",
  "\x17",
  "\x12",
  "\x12",
  "\x19",
  "\x15",
  "\x10",
  "\x01",
  "\x13",
  "\x04",
  "\x06",
  "\x1a",
  "\x18",
  "\x03",
  "\x16",
  "\x02",
] as const;

function substCtrlSeq(s: string): string {
  let out = s;
  for (let i = 1; i < CTRLSEQ.length; i++) {
    const token = `~~~CTRLSEQ${i}~~~`;
    const repl = CTRLSEQ[i] ?? "";
    out = out.split(token).join(repl);
  }
  return out;
}

function substKeyStrings(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = substCtrlSeq(v);
  }
  return out;
}

const ICON_PREFIX = "ESCAPED|-- ICON: ";

function iconSvg(iconName: string): ReactNode {
  switch (iconName) {
    case "ARROW_UP":
      return (
        <svg viewBox="0 0 24.00 24.00">
          <path
            fillOpacity="1"
            d="m12.00004 7.99999 4.99996 5h-2.99996v4.00001h-4v-4.00001h-3z"
          />
          <path
            strokeLinejoin="round"
            fillOpacity="0.65"
            d="m4 3h16c1.1046 0 1-0.10457 1 1v16c0 1.1046 0.1046 1-1 1h-16c-1.10457 0-1 0.1046-1-1v-16c0-1.10457-0.10457-1 1-1zm0 1v16h16v-16z"
          />
        </svg>
      );
    case "ARROW_LEFT":
      return (
        <svg viewBox="0 0 24.00 24.00">
          <path
            fillOpacity="1"
            d="m7.500015 12.499975 5-4.99996v2.99996h4.00001v4h-4.00001v3z"
          />
          <path
            strokeLinejoin="round"
            fillOpacity="0.65"
            d="m4 3h16c1.1046 0 1-0.10457 1 1v16c0 1.1046 0.1046 1-1 1h-16c-1.10457 0-1 0.1046-1-1v-16c0-1.10457-0.10457-1 1-1zm0 1v16h16v-16z"
          />
        </svg>
      );
    case "ARROW_DOWN":
      return (
        <svg viewBox="0 0 24.00 24.00">
          <path
            fillOpacity="1"
            d="m12 17-4.99996-5h2.99996v-4.00001h4v4.00001h3z"
          />
          <path
            strokeLinejoin="round"
            fillOpacity="0.65"
            d="m4 3h16c1.1046 0 1-0.10457 1 1v16c0 1.1046 0.1046 1-1 1h-16c-1.10457 0-1 0.1046-1-1v-16c0-1.10457-0.10457-1 1-1zm0 1v16h16v-16z"
          />
        </svg>
      );
    case "ARROW_RIGHT":
      return (
        <svg viewBox="0 0 24.00 24.00">
          <path
            fillOpacity="1"
            d="m16.500025 12.500015-5 4.99996v-2.99996h-4.00001v-4h4.00001v-3z"
          />
          <path
            strokeLinejoin="round"
            fillOpacity="0.65"
            d="m4 3h16c1.1046 0 1-0.10457 1 1v16c0 1.1046 0.1046 1-1 1h-16c-1.10457 0-1 0.1046-1-1v-16c0-1.10457-0.10457-1 1-1zm0 1v16h16v-16z"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24.00 24.00">
          <path
            fill="#ff0000"
            fillOpacity="1"
            d="M 8.27125,2.9978L 2.9975,8.27125L 2.9975,15.7275L 8.27125,21.0012L 15.7275,21.0012C 17.485,19.2437 21.0013,15.7275 21.0013,15.7275L 21.0013,8.27125L 15.7275,2.9978M 9.10125,5L 14.9025,5L 18.9988,9.10125L 18.9988,14.9025L 14.9025,18.9988L 9.10125,18.9988L 5,14.9025L 5,9.10125M 9.11625,7.705L 7.705,9.11625L 10.5912,12.0025L 7.705,14.8825L 9.11625,16.2937L 12.0025,13.4088L 14.8825,16.2937L 16.2938,14.8825L 13.4087,12.0025L 16.2938,9.11625L 14.8825,7.705L 12.0025,10.5913"
          />
        </svg>
      );
  }
}

function escAttr(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function findKeyEl(
  container: HTMLElement,
  e: KeyboardEvent,
): Element | NodeListOf<Element> | null {
  const physkey = e.key === '"' ? '\\"' : e.key;

  let key = container.querySelector(
    `div.keyboard_key[data-cmd="${escAttr(physkey)}"]`,
  );
  if (!key) {
    key = container.querySelector(
      `div.keyboard_key[data-shift_cmd="${escAttr(physkey)}"]`,
    );
  }

  if (!key && e.code === "ShiftLeft") {
    key = container.querySelector(
      'div.keyboard_key[data-cmd="ESCAPED|-- SHIFT: LEFT"]',
    );
  }
  if (!key && e.code === "ShiftRight") {
    key = container.querySelector(
      'div.keyboard_key[data-cmd="ESCAPED|-- SHIFT: RIGHT"]',
    );
  }
  if (!key && e.code === "ControlLeft") {
    key = container.querySelector(
      'div.keyboard_key[data-cmd="ESCAPED|-- CTRL: LEFT"]',
    );
  }
  if (!key && e.code === "ControlRight") {
    key = container.querySelector(
      'div.keyboard_key[data-cmd="ESCAPED|-- CTRL: RIGHT"]',
    );
  }
  if (!key && e.code === "AltLeft") {
    key = container.querySelector(
      'div.keyboard_key[data-cmd="ESCAPED|-- FN: ON"]',
    );
  }
  if (!key && e.code === "AltRight") {
    key = container.querySelector(
      'div.keyboard_key[data-cmd="ESCAPED|-- ALT: RIGHT"]',
    );
  }
  if (!key && e.code === "CapsLock") {
    key = container.querySelector(
      'div.keyboard_key[data-cmd="ESCAPED|-- CAPSLCK: ON"]',
    );
  }
  if (!key && e.code === "Escape") {
    key = container.querySelector('div.keyboard_key[data-cmd="\x1b"]');
  }
  if (!key && e.code === "Backspace") {
    key = container.querySelector('div.keyboard_key[data-cmd="\x08"]');
  }
  if (!key && e.code === "ArrowUp") {
    key = container.querySelector('div.keyboard_key[data-cmd="\x1bOA"]');
  }
  if (!key && e.code === "ArrowLeft") {
    key = container.querySelector('div.keyboard_key[data-cmd="\x1bOD"]');
  }
  if (!key && e.code === "ArrowDown") {
    key = container.querySelector('div.keyboard_key[data-cmd="\x1bOB"]');
  }
  if (!key && e.code === "ArrowRight") {
    key = container.querySelector('div.keyboard_key[data-cmd="\x1bOC"]');
  }
  if (!key && e.code === "Enter") {
    return container.querySelectorAll("div.keyboard_key.keyboard_enter");
  }

  if (!key) {
    key = container.querySelector(
      `div.keyboard_key[data-ctrl_cmd="${escAttr(e.key)}"]`,
    );
  }
  if (!key) {
    key = container.querySelector(
      `div.keyboard_key[data-alt_cmd="${escAttr(e.key)}"]`,
    );
  }

  return key;
}

function dataCmdProps(k: Record<string, string>): Record<string, string> {
  const props: Record<string, string> = {};
  for (const [prop, val] of Object.entries(k)) {
    if (prop.endsWith("cmd")) {
      props[`data-${prop}`] = val;
    }
  }
  return props;
}

function KeyboardKey({ raw }: { raw: Record<string, unknown> }) {
  const k = substKeyStrings(raw);
  const name = k.name ?? "";

  if (name.startsWith(ICON_PREFIX)) {
    const iconName = name.slice(ICON_PREFIX.length);
    return (
      <div className="keyboard_key" {...dataCmdProps(k)}>
        {iconSvg(iconName)}
      </div>
    );
  }

  if (k.cmd === "\r") {
    return (
      <div className="keyboard_key keyboard_enter" {...dataCmdProps(k)}>
        <h1>{name}</h1>
      </div>
    );
  }

  if (k.cmd === " ") {
    return (
      <div
        className="keyboard_key"
        id="keyboard_spacebar"
        {...dataCmdProps(k)}
      />
    );
  }

  return (
    <div className="keyboard_key" {...dataCmdProps(k)}>
      <h5>{k.altshift_name ?? ""}</h5>
      <h4>{k.fn_name ?? ""}</h4>
      <h3>{k.alt_name ?? ""}</h3>
      <h2>{k.shift_name ?? ""}</h2>
      <h1>{k.name ?? ""}</h1>
    </div>
  );
}

export interface EdexOnScreenKeyboardProps {
  /** Base name without `.json` under `/edex-assets/kb_layouts/`. */
  layoutId?: string;
}

export function EdexOnScreenKeyboard({
  layoutId: layoutIdProp,
}: EdexOnScreenKeyboardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLElement | null>(null);
  const [layout, setLayout] = useState<KeyboardLayoutDocument | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const layoutId = useMemo(
    () =>
      (layoutIdProp ??
        import.meta.env.VITE_EDEX_KB_LAYOUT ??
        "en-US") as string,
    [layoutIdProp],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    void (async () => {
      try {
        const res = await fetch(
          edexAssetsUrl(`kb_layouts/${encodeURIComponent(layoutId)}.json`),
        );
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }
        const json = (await res.json()) as KeyboardLayoutDocument;
        if (!cancelled) setLayout(json);
      } catch (e) {
        if (!cancelled) {
          setLayout(null);
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [layoutId]);

  const clearActiveKeys = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    root.querySelectorAll("div.keyboard_key.active").forEach((el: Element) => {
      el.classList.remove("active");
    });
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !layout) return;

    const onBlur = () => {
      clearActiveKeys();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.getModifierState("AltGraph") && e.code === "AltRight") {
        const left = root.querySelector(
          'div.keyboard_key[data-cmd="ESCAPED|-- CTRL: LEFT"]',
        );
        if (left) left.className = "keyboard_key";
      }

      if (e.code === "ControlLeft" || e.code === "ControlRight") {
        root.dataset.isCtrlOn = "true";
      }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        root.dataset.isShiftOn = "true";
      }
      if (e.code === "AltLeft" || e.code === "AltRight") {
        root.dataset.isAltOn = "true";
      }
      if (e.code === "CapsLock") {
        root.dataset.isCapsLckOn =
          root.dataset.isCapsLckOn !== "true" ? "true" : "false";
      }

      const key = findKeyEl(root, e);
      if (!key) return;

      if (key instanceof NodeList) {
        key.forEach((el) => {
          el.className = "keyboard_key active keyboard_enter";
        });
      } else {
        const enter = key.classList.contains("keyboard_enter");
        key.className = enter
          ? "keyboard_key active keyboard_enter"
          : "keyboard_key active";
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control" && e.getModifierState("AltGraph")) return;

      if (e.code === "ControlLeft" || e.code === "ControlRight") {
        root.dataset.isCtrlOn = "false";
      }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        root.dataset.isShiftOn = "false";
      }
      if (e.code === "AltLeft" || e.code === "AltRight") {
        root.dataset.isAltOn = "false";
      }

      const key = findKeyEl(root, e);
      if (!key) return;

      const release = (el: Element) => {
        if (prefersReducedMotion) {
          if (el.classList.contains("keyboard_enter")) {
            el.className = "keyboard_key keyboard_enter";
          } else {
            el.className = "keyboard_key";
          }
          return;
        }
        if (el.classList.contains("keyboard_enter")) {
          el.className = "keyboard_key blink keyboard_enter";
          window.setTimeout(() => {
            el.className = "keyboard_key keyboard_enter";
          }, 100);
        } else {
          el.className = "keyboard_key blink";
          window.setTimeout(() => {
            el.className = "keyboard_key";
          }, 100);
        }
      };

      if (key instanceof NodeList) {
        key.forEach(release);
      } else {
        release(key);
      }
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [layout, clearActiveKeys, prefersReducedMotion]);

  const rowEntries = useMemo(() => {
    if (!layout) return [];
    return Object.entries(layout);
  }, [layout]);

  if (loadError) {
    return (
      <div id="edex_keyboard_shell">
        <section id="keyboard" aria-label="On-screen keyboard">
          <p style={{ padding: "0.5rem", fontSize: "12px", opacity: 0.75 }}>
            Keyboard layout failed to load ({layoutId}): {loadError}
          </p>
        </section>
      </div>
    );
  }

  if (!layout) {
    return (
      <div id="edex_keyboard_shell">
        <section id="keyboard" aria-label="On-screen keyboard">
          <p style={{ padding: "0.5rem", fontSize: "12px", opacity: 0.6 }}>
            Loading keyboard…
          </p>
        </section>
      </div>
    );
  }

  return (
    <div id="edex_keyboard_shell">
      <section
        ref={containerRef}
        id="keyboard"
        aria-label="On-screen keyboard"
        data-is-shift-on="false"
        data-is-caps-lck-on="false"
        data-is-alt-on="false"
        data-is-ctrl-on="false"
        data-is-fn-on="false"
        data-password-mode="false"
      >
        {rowEntries.map(([rowId, keys]) => (
          <div className="keyboard_row" id={rowId} key={rowId}>
            {keys.map((raw, index) => (
              <KeyboardKey key={`${rowId}-${index}`} raw={raw} />
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
