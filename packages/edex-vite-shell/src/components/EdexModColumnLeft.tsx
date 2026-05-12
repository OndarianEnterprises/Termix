import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { EdexThemeRgb } from "../theme/loadEdexTheme";
import { mockBattery, mockHardwareIdentity } from "../mock/mockHostMetrics";
import { EdexModHostMetricsStack } from "./EdexModHostMetricsStack";
import { EdexModTermixQuickStrip } from "./EdexModTermixQuickStrip";

const COLUMN_CHILD_ANIM: CSSProperties = {
  animationPlayState: "running",
};

function monthAbbr(m: number): string {
  return (
    ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][
      m
    ] ?? "???"
  );
}

function formatUptimeShort(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  let s = totalSeconds - days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  const hh = hours < 10 ? `0${hours}` : String(hours);
  const mm = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${days}<span style="opacity:0.5;">d</span>${hh}<span style="opacity:0.5;">:</span>${mm}`;
}

function EdexModClock() {
  const [html, setHtml] = useState("");

  useEffect(() => {
    const tick = () => {
      const time = new Date();
      const h = time.getHours();
      const m = time.getMinutes();
      const s = time.getSeconds();
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
      const clockString = `${pad(h)}:${pad(m)}:${pad(s)}`;
      const chars = clockString.split("");
      const inner = chars
        .map((c) => (c === ":" ? `<em>${c}</em>` : `<span>${c}</span>`))
        .join("");
      setHtml(inner);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div id="mod_clock">
      <h1 id="mod_clock_text" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function EdexModSysinfo() {
  const sessionStart = useRef(Date.now());
  const [year, setYear] = useState(1970);
  const [monthDay, setMonthDay] = useState("JAN 1");
  const [uptimeHtml, setUptimeHtml] = useState(
    "0<span style=\"opacity:0.5;\">d</span>00<span style=\"opacity:0.5;\">:</span>00",
  );
  const [power, setPower] = useState("88%");

  useEffect(() => {
    const apply = () => {
      const time = new Date();
      setYear(time.getFullYear());
      setMonthDay(`${monthAbbr(time.getMonth())} ${time.getDate()}`);
    };
    apply();
    const id = window.setInterval(apply, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - sessionStart.current) / 1000);
      setUptimeHtml(formatUptimeShort(elapsed));
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = () => {
      const b = mockBattery(Date.now());
      setPower(b.percent === null ? "--%" : `${b.percent}%`);
    };
    tick();
    const id = window.setInterval(tick, 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div id="mod_sysinfo">
      <div>
        <h1>{year}</h1>
        <h2>{monthDay}</h2>
      </div>
      <div>
        <h1>UPTIME</h1>
        <h2 dangerouslySetInnerHTML={{ __html: uptimeHtml }} />
      </div>
      <div>
        <h1>TYPE</h1>
        <h2>web (mock)</h2>
      </div>
      <div>
        <h1>POWER</h1>
        <h2>{power}</h2>
      </div>
    </div>
  );
}

function EdexModHardwareInspector() {
  const hw = mockHardwareIdentity();
  return (
    <div id="mod_hardwareInspector">
      <div id="mod_hardwareInspector_inner">
        <div>
          <h1>MANUFACTURER</h1>
          <h2 id="mod_hardwareInspector_manufacturer">{hw.manufacturer}</h2>
        </div>
        <div>
          <h1>MODEL</h1>
          <h2 id="mod_hardwareInspector_model">{hw.model}</h2>
        </div>
        <div>
          <h1>CHASSIS</h1>
          <h2 id="mod_hardwareInspector_chassis">{hw.chassis}</h2>
        </div>
      </div>
    </div>
  );
}

export interface EdexModColumnLeftProps {
  themeRgb: EdexThemeRgb;
}

/**
 * Left system column: clock, sysinfo, hardware, CPU/RAM/top processes, Termix quick actions.
 * Network (`net`) is rendered under the globe in `EdexMainShellLayout`.
 */
export function EdexModColumnLeft({ themeRgb }: EdexModColumnLeftProps) {
  return (
    <section className="mod_column activated" id="mod_column_left">
      <h3 className="title">
        <p>PANEL</p>
        <p>SYSTEM</p>
      </h3>
      <div style={{ ...COLUMN_CHILD_ANIM, width: "100%" }}>
        <EdexModClock />
        <EdexModSysinfo />
        <EdexModHardwareInspector />
        <EdexModHostMetricsStack
          themeRgb={themeRgb}
          placement="left"
          sections={["cpu", "ram", "top"]}
        />
        <EdexModTermixQuickStrip themeRgb={themeRgb} />
      </div>
    </section>
  );
}
