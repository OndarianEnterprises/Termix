import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useEdexMockFs } from "../context/EdexMockFsContext";
import { useEdexTermixHost } from "../context/EdexTermixHostContext";
import type { EdexThemeRgb } from "../theme/loadEdexTheme";
import {
  formatBytes,
  getParentPath,
  joinPath,
  listMockDir,
  MOCK_DISK_VOLUMES,
  normalizePath,
  type MockDiskVolume,
  type MockFsEntry,
} from "../fs/mockFsData";

export interface EdexFilesystemPanelProps {
  themeRgb: EdexThemeRgb;
}

type PanelRow =
  | { key: string; kind: "disks" }
  | { key: string; kind: "up" }
  | { key: string; kind: "disk"; disk: MockDiskVolume }
  | { key: string; kind: "entry"; entry: MockFsEntry };

const FOLDER_PATH = (
  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
);

const FILE_PATH = (
  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
);

const DISK_PATH = (
  <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z" />
);

const UP_PATH = <path d="M7 14l5-5 5 5H7z" />;

const SHOW_DISKS_PATH = (
  <>
    <path d="M4 17h6v3H4v-3zm10 0h6v3h-6v-3zM4 4h16v10H4V4z" />
    <path d="M7 7h10v4H7V7z" fillOpacity="0.35" />
  </>
);

function iconFill(rgb: EdexThemeRgb): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function iconGlyph(displayClass: string): ReactNode {
  switch (displayClass) {
    case "fs_disp_showDisks":
      return SHOW_DISKS_PATH;
    case "fs_disp_up":
      return UP_PATH;
    case "fs_disp_disk":
      return DISK_PATH;
    case "fs_disp_folder":
      return FOLDER_PATH;
    default:
      return FILE_PATH;
  }
}

function FileBlock({
  displayClass,
  name,
  typeLabel,
  sizeLabel,
  timeLabel,
  hidden,
  rgb,
  onActivate,
}: {
  displayClass: string;
  name: string;
  typeLabel: string;
  sizeLabel: string;
  timeLabel: string;
  hidden: boolean;
  rgb: EdexThemeRgb;
  onActivate: () => void;
}) {
  const fill = iconFill(rgb);
  return (
    <div
      className={`${displayClass}${hidden ? " hidden" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      <svg viewBox="0 0 24 24" fill={fill}>
        {iconGlyph(displayClass)}
      </svg>
      <h3>{name}</h3>
      <h4>{typeLabel}</h4>
      <h4>{sizeLabel}</h4>
      <h4>{timeLabel}</h4>
    </div>
  );
}

/**
 * Filesystem strip from `filesystem.class.js` + `filesystem.css`, backed by
 * in-memory mock paths (`/mock/...`). Phase B will swap listing for Termix file APIs.
 */
export function EdexFilesystemPanel({ themeRgb }: EdexFilesystemPanelProps) {
  const { t } = useTranslation();
  const host = useEdexTermixHost();
  const { cwd, setCwd } = useEdexMockFs();
  const [diskMode, setDiskMode] = useState(false);
  const [hideDotfiles, setHideDotfiles] = useState(false);
  const [listView, setListView] = useState(false);

  const sectionClass = [hideDotfiles ? "hideDotfiles" : "", listView ? "list-view" : ""]
    .filter(Boolean)
    .join(" ");

  const titleText = diskMode ? "Showing mock volumes" : normalizePath(cwd);

  const goUp = useCallback(() => {
    const p = getParentPath(cwd);
    if (p !== null) setCwd(p);
  }, [cwd, setCwd]);

  const openDir = useCallback(
    (name: string) => {
      setCwd(joinPath(cwd, name));
    },
    [cwd, setCwd],
  );

  const openDisk = useCallback(
    (vol: MockDiskVolume) => {
      setCwd(vol.path);
      setDiskMode(false);
    },
    [setCwd],
  );

  const rows: PanelRow[] = useMemo(() => {
    if (diskMode) {
      return MOCK_DISK_VOLUMES.map((d) => ({
        key: `disk-${d.path}`,
        kind: "disk" as const,
        disk: d,
      }));
    }
    const out: PanelRow[] = [{ key: "show-disks", kind: "disks" }];
    if (getParentPath(cwd) !== null) {
      out.push({ key: "go-up", kind: "up" });
    }
    for (const e of listMockDir(cwd)) {
      out.push({ key: `${e.kind}-${e.name}`, kind: "entry", entry: e });
    }
    return out;
  }, [cwd, diskMode]);

  return (
    <section id="filesystem" className={sectionClass} style={{ opacity: 1 }}>
      <h3 className="title">
        <p>FILESYSTEM</p>
        <p id="fs_disp_title_dir">{titleText}</p>
      </h3>

      {host?.onOpenFileManager ? (
        <div style={{ marginBottom: "0.5vh" }}>
          <button
            type="button"
            onClick={() => host.onOpenFileManager?.()}
            style={{
              cursor: "pointer",
              fontFamily: "var(--font_main), sans-serif",
              fontSize: "1.1vh",
              padding: "0.35vh 0.5vw",
              borderRadius: "0.2vh",
              border: `0.1vh solid rgb(${themeRgb.r}, ${themeRgb.g}, ${themeRgb.b})`,
              color: `rgb(${themeRgb.r}, ${themeRgb.g}, ${themeRgb.b})`,
              background: "rgba(0,0,0,0.25)",
            }}
          >
            {t("nav.openFileManager")}
          </button>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          marginBottom: "0.4vh",
          fontSize: "1.1vh",
        }}
      >
        <button
          type="button"
          style={{ cursor: "pointer", fontFamily: "inherit" }}
          onClick={() => setListView((v) => !v)}
        >
          {listView ? "Grid view" : "List view"}
        </button>
        <button
          type="button"
          style={{ cursor: "pointer", fontFamily: "inherit" }}
          onClick={() => setHideDotfiles((v) => !v)}
        >
          {hideDotfiles ? "Show dotfiles" : "Hide dotfiles"}
        </button>
      </div>

      <div id="fs_disp_container" className={diskMode ? "disks" : ""}>
        {rows.map((row) => {
          if (row.kind === "disks") {
            return (
              <FileBlock
                key={row.key}
                displayClass="fs_disp_showDisks"
                name="Show disks"
                typeLabel="--"
                sizeLabel="--"
                timeLabel="--"
                hidden={false}
                rgb={themeRgb}
                onActivate={() => setDiskMode(true)}
              />
            );
          }
          if (row.kind === "up") {
            return (
              <FileBlock
                key={row.key}
                displayClass="fs_disp_up"
                name="Go up"
                typeLabel="--"
                sizeLabel="--"
                timeLabel="--"
                hidden={false}
                rgb={themeRgb}
                onActivate={goUp}
              />
            );
          }
          if (row.kind === "disk") {
            const d = row.disk;
            return (
              <FileBlock
                key={row.key}
                displayClass="fs_disp_disk"
                name={d.name}
                typeLabel="volume"
                sizeLabel="--"
                timeLabel="--"
                hidden={false}
                rgb={themeRgb}
                onActivate={() => openDisk(d)}
              />
            );
          }
          const e = row.entry;
          const isDir = e.kind === "dir";
          const displayClass = isDir ? "fs_disp_folder" : "fs_disp_file";
          const typeLabel = isDir ? "folder" : "file";
          const sizeLabel = isDir ? "--" : formatBytes(e.size ?? 0);
          const timeLabel = "--";
          return (
            <FileBlock
              key={row.key}
              displayClass={displayClass}
              name={e.name}
              typeLabel={typeLabel}
              sizeLabel={sizeLabel}
              timeLabel={timeLabel}
              hidden={!!e.hidden}
              rgb={themeRgb}
              onActivate={() => {
                if (isDir) openDir(e.name);
              }}
            />
          );
        })}
      </div>

      <div id="fs_space_bar">
        <h1
          onClick={() => setDiskMode(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDiskMode(false);
            }
          }}
          role="button"
          tabIndex={0}
        >
          EXIT DISPLAY
        </h1>
        <h3>
          Mount <strong>/mock</strong> — mock usage{" "}
          <strong>42%</strong> (Phase A)
        </h3>
        <progress value={diskMode ? undefined : 42} max={100} />
      </div>
    </section>
  );
}
