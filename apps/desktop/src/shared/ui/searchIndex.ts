import { flattenEntries, isMarkdown, type WorkspaceTree } from "../domain/workspace";
import type { ReadResult } from "../../platform/workspace";

type CachedNote = { modifiedMs?: number; content: string };
const indexes = new Map<string, Map<string, CachedNote>>();

export function updateSearchIndexContent(root: string, path: string, content: string, modifiedMs?: number) {
  const index = indexes.get(root) ?? new Map<string, CachedNote>();
  indexes.set(root, index);
  index.set(path, { modifiedMs, content });
}

export async function loadSearchIndex(tree: WorkspaceTree, read: (root: string, path: string) => Promise<ReadResult>) {
  const index = indexes.get(tree.path) ?? new Map<string, CachedNote>();
  indexes.set(tree.path, index);
  const notes = flattenEntries(tree.entries).filter(isMarkdown);
  await Promise.all(notes.map(async entry => {
    const cached = index.get(entry.path);
    if (cached && cached.modifiedMs === entry.modifiedMs) return;
    try {
      const result = await read(tree.path, entry.path);
      index.set(entry.path, { modifiedMs: result.modifiedMs, content: result.content });
    } catch {
      if (!cached) index.set(entry.path, { modifiedMs: entry.modifiedMs, content: "" });
    }
  }));
  const paths = new Set(notes.map(entry => entry.path));
  for (const path of index.keys()) if (!paths.has(path)) index.delete(path);
  return Object.fromEntries([...index].map(([path, note]) => [path, note.content]));
}
