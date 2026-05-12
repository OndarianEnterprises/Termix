import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type EdexModalLevel = "info" | "warning" | "error" | "custom";

export interface EdexModalPopupProps {
  id: string;
  level: EdexModalLevel;
  title: string;
  /** Main body (wrapped in h5 when `plainMessage` is true). */
  content: ReactNode;
  /** When true, content is plain text / fragment inside `<h5>`. */
  plainMessage?: boolean;
  augmentedUi: string;
  zIndex: number;
  isFocused: boolean;
  isClosing: boolean;
  initialLeft: number;
  initialTop: number;
  buttons: { label: string; onClick: () => void }[];
  onFocus: () => void;
  onMouseDownCapture: () => void;
}

function levelClass(level: EdexModalLevel): string {
  if (level === "custom") return "modal_popup info custom";
  return `modal_popup ${level}`;
}

export function EdexModalPopup({
  id,
  level,
  title,
  content,
  plainMessage = true,
  augmentedUi,
  zIndex,
  isFocused,
  isClosing,
  initialLeft,
  initialTop,
  buttons,
  onFocus,
  onMouseDownCapture,
}: EdexModalPopupProps) {
  const dragFromH1 = useRef(false);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
  });
  const [pos, setPos] = useState({ left: initialLeft, top: initialTop });

  useLayoutEffect(() => {
    setPos({ left: initialLeft, top: initialTop });
  }, [initialLeft, initialTop]);

  const onMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current;
    setPos({
      left: d.originLeft + (e.clientX - d.startX),
      top: d.originTop + (e.clientY - d.startY),
    });
  }, []);

  const onUp = useCallback(() => {
    dragFromH1.current = false;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }, [onMove]);

  const onH1MouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragFromH1.current = true;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originLeft: pos.left,
        originTop: pos.top,
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onMove, onUp, pos.left, pos.top],
  );

  useEffect(() => () => window.removeEventListener("mousemove", onMove), [onMove]);
  useEffect(() => () => window.removeEventListener("mouseup", onUp), [onUp]);

  const cls =
    `${levelClass(level)}${isFocused ? " focus" : ""}${isClosing ? " blink" : ""}`;

  return (
    <div
      id={`modal_${id}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={cls}
      style={{
        zIndex,
        position: "absolute",
        left: pos.left,
        top: pos.top,
      }}
      {...{ "augmented-ui": augmentedUi }}
      onMouseDown={() => {
        onMouseDownCapture();
        onFocus();
      }}
    >
      <h1 onMouseDown={onH1MouseDown}>{title}</h1>
      {plainMessage ? <h5>{content}</h5> : content}
      <div>
        {buttons.map((b, i) => (
          <button key={`${b.label}-${i}`} type="button" onClick={() => b.onClick()}>
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
