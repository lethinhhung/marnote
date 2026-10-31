import { promises as fs } from "fs";
import { resolve } from "path";
import { isMarkdownFile } from "./workspacePaths.js";
import type { WorkspaceEntry } from "./workspaceTypes.js";

const EXCLUDED_NAMES = new Set([".marnote-trash", ".marnote"]);

export async function collectWorkspaceEntries(dir: string, base: string): Promise<WorkspaceEntry[]> {
  const entries: WorkspaceEntry[] = [];
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isSymbolicLink() || EXCLUDED_NAMES.has(item.name)) continue;
      const fullPath = resolve(dir, item.name);
      const relativePath = fullPath.replace(base, "").replace(/^\/+/, "").replace(/\\/g, "/");
      const isDirectory = item.isDirectory();
      if (isDirectory || isMarkdownFile(fullPath)) {
        entries.push({
          name: item.name,
          path: relativePath,
          kind: isDirectory ? "directory" : "file",
          children: isDirectory ? await collectWorkspaceEntries(fullPath, base) : undefined,
        });
      }
    }
  } catch {
    // Directory might not be readable, return empty
  }

  entries.sort((a, b) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();
    if (aLower < bLower) return -1;
    if (aLower > bLower) return 1;
    return 0;
  });
  return entries;
}
