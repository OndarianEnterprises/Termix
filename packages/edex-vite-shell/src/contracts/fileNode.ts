/**
 * Remote file or directory entry (Termix file manager API shape, subset for eDEX strip).
 */

export type FileNodeKind = "file" | "dir" | "symlink" | "unknown";

export interface FileNode {
  /** Absolute path on the remote (POSIX-style in Termix). */
  path: string;
  name: string;
  kind: FileNodeKind;
  sizeBytes?: number | null;
  mtimeMs?: number | null;
  /** Unix mode when available (e.g. 0o755). */
  modeUnix?: number | null;
  hidden?: boolean;
}
