export type MockFsEntryKind = "dir" | "file";

export interface MockFsEntry {
  name: string;
  kind: MockFsEntryKind;
  /** File size in bytes (files only). */
  size?: number;
  hidden?: boolean;
}

/** Mock volume list (Phase A — no real block devices). */
export interface MockDiskVolume {
  name: string;
  path: string;
}

export const MOCK_DISK_VOLUMES: MockDiskVolume[] = [
  { name: "Primary (mock)", path: "/mock" },
  { name: "Data (mock)", path: "/mock/data" },
];

const TREE: Record<string, MockFsEntry[]> = {
  "/mock": [
    { name: "home", kind: "dir" },
    { name: "etc", kind: "dir" },
    { name: "data", kind: "dir" },
    { name: "readme.txt", kind: "file", size: 2048 },
  ],
  "/mock/home": [
    { name: "projects", kind: "dir" },
    { name: "notes.md", kind: "file", size: 890 },
    { name: ".profile", kind: "file", hidden: true, size: 120 },
  ],
  "/mock/home/projects": [
    { name: "termix", kind: "dir" },
    { name: "edex-ui", kind: "dir" },
    { name: "Makefile", kind: "file", size: 640 },
  ],
  "/mock/home/projects/termix": [
    { name: "package.json", kind: "file", size: 4200 },
    { name: "README.md", kind: "file", size: 3100 },
  ],
  "/mock/home/projects/edex-ui": [
    { name: "package.json", kind: "file", size: 2100 },
  ],
  "/mock/etc": [
    { name: "hosts", kind: "file", size: 220 },
    { name: "nginx", kind: "dir" },
  ],
  "/mock/etc/nginx": [{ name: "nginx.conf", kind: "file", size: 1800 }],
  "/mock/data": [
    { name: "backups", kind: "dir" },
    { name: "archive.tgz", kind: "file", size: 12_500_000 },
  ],
  "/mock/data/backups": [{ name: "daily.sql", kind: "file", size: 4_000_000 }],
};

export function listMockDir(path: string): MockFsEntry[] {
  const norm = normalizePath(path);
  return [...(TREE[norm] ?? [])];
}

export function normalizePath(p: string): string {
  const parts = p.split("/").filter(Boolean);
  return `/${parts.join("/")}`;
}

export function joinPath(dir: string, name: string): string {
  return normalizePath(`${normalizePath(dir)}/${name}`);
}

export function getParentPath(path: string): string | null {
  const norm = normalizePath(path);
  if (norm === "/mock") return null;
  const parts = norm.split("/").filter(Boolean);
  parts.pop();
  if (parts.length === 0) return null;
  return `/${parts.join("/")}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"] as const;
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k)),
  );
  return `${parseFloat((bytes / k ** i).toFixed(i === 0 ? 0 : 2))} ${sizes[i]}`;
}
