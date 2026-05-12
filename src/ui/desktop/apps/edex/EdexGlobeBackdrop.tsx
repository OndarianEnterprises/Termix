import React from "react";
import { cn } from "@/lib/utils.ts";
import type { EdexGlobeMarker } from "@/ui/desktop/apps/edex/edexGlobeMarkers.ts";

interface EdexGlobeBackdropProps {
  markers?: readonly EdexGlobeMarker[];
}

/**
 * Decorative globe for the eDEX shell (CSS). Optional `markers` show SSH hosts
 * as stable pseudo-positions on the disk (not true geography).
 */
export function EdexGlobeBackdrop({
  markers = [],
}: EdexGlobeBackdropProps): React.ReactElement {
  return (
    <div
      className="edex-globe-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="edex-globe-backdrop__shell">
        <div className="edex-globe-backdrop__orb" />
        {markers.map((m) => (
          <span
            key={m.id}
            className={cn(
              "edex-globe-marker",
              m.status === "online" && "edex-globe-marker--online",
              m.status === "offline" && "edex-globe-marker--offline",
              m.status === "unknown" && "edex-globe-marker--unknown",
            )}
            style={{ left: `${m.leftPct}%`, top: `${m.topPct}%` }}
          />
        ))}
      </div>
    </div>
  );
}
