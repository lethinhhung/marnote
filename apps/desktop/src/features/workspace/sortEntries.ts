import type { Entry } from "./workspaceTypes";

export type ExplorerSort = "name" | "modified" | "manual";
export function siblingPaths(entries: Entry[], parent: string): string[] {
  if (!parent) return entries.map(entry => entry.path);
  const folder = entries.find(entry => entry.path === parent);
  if (folder) return (folder.children ?? []).map(entry => entry.path);
  for (const entry of entries) {
    const paths = siblingPaths(entry.children ?? [], parent);
    if (paths.length) return paths;
  }
  return [];
}

export function reorderedPaths(paths: string[], source: string, target: string, after: boolean): string[] {
  const next = paths.filter(path => path !== source);
  const index = next.indexOf(target);
  next.splice(index + (after ? 1 : 0), 0, source);
  return next;
}

export function getSiblingPathsInOrder(
  entries: Entry[],
  parent: string,
  mode: ExplorerSort,
  order: Record<string, string[]>,
): string[] {
  const siblings = siblingPaths(entries, parent);
  if (mode !== "manual") return siblings;
  const manual = order[parent] ?? [];
  const manualSet = new Set(manual);
  const remaining = siblings.filter(p => !manualSet.has(p)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return [...manual, ...remaining];
}

const byName = (a: Entry, b: Entry) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

export function sortEntries(entries: Entry[], mode: ExplorerSort, order: Record<string, string[]>, parent = ""): Entry[] {
  const ranked = (a: Entry, b: Entry) => {
    const folders = Number(b.kind === "directory") - Number(a.kind === "directory");
    if (folders) return folders;
    if (mode === "modified" && (a.modifiedMs ?? 0) !== (b.modifiedMs ?? 0)) return (b.modifiedMs ?? 0) - (a.modifiedMs ?? 0);
    if (mode === "manual") {
      const paths = order[parent] ?? [];
      const ai = paths.indexOf(a.path);
      const bi = paths.indexOf(b.path);
      if (ai !== bi && ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
    }
    return byName(a, b);
  };
  return [...entries].sort(ranked).map(entry => ({
    ...entry,
    children: entry.children ? sortEntries(entry.children, mode, order, entry.path) : undefined,
  }));
}
