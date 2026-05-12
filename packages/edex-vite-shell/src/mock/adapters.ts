import type { FileNode } from "../contracts/fileNode";
import { joinPath, type MockFsEntry } from "../fs/mockFsData";

export function mockFsEntryToFileNode(parentDir: string, entry: MockFsEntry): FileNode {
  return {
    path: joinPath(parentDir, entry.name),
    name: entry.name,
    kind: entry.kind === "dir" ? "dir" : "file",
    sizeBytes: entry.size ?? null,
    hidden: entry.hidden,
  };
}
