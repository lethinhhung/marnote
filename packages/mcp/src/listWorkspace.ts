import { promises as fs } from "fs";
import type { Dirent } from "fs";
import { resolve } from "path";
import { isMarkdownFile, ResolvedWorkspace } from "./workspace.js";
import { isHiddenWorkspaceEntry } from "./workspaceEntries.js";

export interface ListedEntry {
  name: string;
  path: string;
  kind: "directory" | "file";
}

export interface WorkspacePage {
  entries: ListedEntry[];
  offset: number;
  nextOffset: number | null;
}

const MAX_PAGE_SIZE = 500;

export async function listWorkspace(
  workspace: ResolvedWorkspace,
  offset = 0,
  limit = 200
): Promise<WorkspacePage> {
  const pageSize = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const start = Math.max(0, offset);
  const collected: ListedEntry[] = [];
  let skipped = 0;

  function collect(entry: ListedEntry): void {
    if (skipped < start) skipped += 1;
    else if (collected.length <= pageSize) collected.push(entry);
  }

  async function visit(directory: string, parent = ""): Promise<void> {
    if (collected.length > pageSize) return;
    let items: Dirent[];
    try {
      items = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    items.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      if (collected.length > pageSize) return;
      if (item.isSymbolicLink() || isHiddenWorkspaceEntry(item.name)) continue;
      const path = parent ? `${parent}/${item.name}` : item.name;
      if (item.isDirectory()) {
        collect({ name: item.name, path, kind: "directory" });
        await visit(resolve(directory, item.name), path);
      } else if (item.isFile() && isMarkdownFile(item.name)) {
        collect({ name: item.name, path, kind: "file" });
      }
    }
  }

  await visit(workspace.root);
  const entries = collected.slice(start, start + pageSize);
  return {
    entries,
    offset: start,
    nextOffset: collected.length > start + pageSize ? start + pageSize : null,
  };
}
