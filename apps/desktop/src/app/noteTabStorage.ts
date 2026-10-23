import type { Entry } from "../shared/domain/workspace";

export type SavedTabs = { tabs: string[]; recent: string[]; active: string; drafts: Record<string, string>; originals?: Record<string, string>; dirty?: string[] };
export const storageKey = (root: string) => `marnote-tabs:${root}`;

export function findEntry(entries: Entry[] = [], path: string): Entry | undefined {
  for (const entry of entries) {
    if (entry.path === path) return entry;
    const found = entry.children && findEntry(entry.children, path);
    if (found) return found;
  }
}
export function notePaths(entries?: Entry[]): string[] { return (entries ?? []).flatMap(entry => entry.kind === "file" ? [entry.path] : notePaths(entry.children)); }
export function readSaved(root: string): SavedTabs {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(root)) || "{}");
    return { tabs: Array.isArray(saved.tabs) ? saved.tabs : [], recent: Array.isArray(saved.recent) ? saved.recent : [], active: typeof saved.active === "string" ? saved.active : "", drafts: saved.drafts && typeof saved.drafts === "object" ? saved.drafts : {}, originals: saved.originals && typeof saved.originals === "object" ? saved.originals : {}, dirty: Array.isArray(saved.dirty) ? saved.dirty : [] };
  } catch { return { tabs: [], recent: [], active: "", drafts: {} }; }
}
export function persistTabs(root: string, tabs: string[], active: string, drafts: Record<string, string>, originals: Record<string, string>, dirty: Set<string>, recent: string[]) {
  localStorage.setItem(storageKey(root), JSON.stringify({ tabs, recent, active, drafts, originals, dirty: [...dirty] } satisfies SavedTabs));
}
