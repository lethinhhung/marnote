import { useCallback, useEffect, useRef, useState } from "react";
import type { Entry, WorkspaceTree } from "../shared/domain/workspace";

type Note = { path: string; content: string } | null;
type SavedTabs = { tabs: string[]; recent: string[]; active: string; drafts: Record<string, string> };
type Props = { tree: WorkspaceTree | null; note: Note; draft: string; setDraft: (value: string) => void; save: (path: string, draft: string, original: string) => Promise<boolean>; select: (entry: Entry) => void; clear: () => void };
const storageKey = (root: string) => `marnote-tabs:${root}`;

function findEntry(entries: Entry[] = [], path: string): Entry | undefined {
  for (const entry of entries) {
    if (entry.path === path) return entry;
    const found = entry.children && findEntry(entry.children, path);
    if (found) return found;
  }
}
function notePaths(entries?: Entry[]): string[] { return (entries ?? []).flatMap(entry => entry.kind === "file" ? [entry.path] : notePaths(entry.children)); }
function readSaved(root: string): SavedTabs {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(root)) || "{}");
    return { tabs: Array.isArray(saved.tabs) ? saved.tabs : [], recent: Array.isArray(saved.recent) ? saved.recent : [], active: typeof saved.active === "string" ? saved.active : "", drafts: saved.drafts && typeof saved.drafts === "object" ? saved.drafts : {} };
  } catch { return { tabs: [], recent: [], active: "", drafts: {} }; }
}

export function useNoteTabs({ tree, note, draft, setDraft, save, select, clear }: Props) {
  const [tabs, setTabs] = useState<string[]>([]);
  const [loadedRoot, setLoadedRoot] = useState("");
  const recent = useRef<string[]>([]);
  const drafts = useRef<Record<string, string>>({});
  const restored = useRef("");
  const lastActive = useRef("");
  const hydratingDraft = useRef<{ path: string; value: string } | null>(null);
  const path = note?.path || "";
  useEffect(() => {
    if (!tree) return;
    const available = new Set(notePaths(tree.entries));
    const saved = readSaved(tree.path);
    const valid = saved.tabs.filter(tab => available.has(tab));
    drafts.current = Object.fromEntries(Object.entries(saved.drafts ?? {}).filter(([key]) => available.has(key)));
    recent.current = (saved.recent ?? []).filter(tab => valid.includes(tab));
    lastActive.current = saved.active || "";
    setTabs(valid);
    restored.current = tree.path;
    setLoadedRoot(tree.path);
    const active = available.has(saved.active) ? saved.active : recent.current.at(-1) || valid.at(-1);
    if (active) select(findEntry(tree.entries, active)!);
  }, [tree?.path]);
  useEffect(() => {
    if (!tree || loadedRoot !== tree.path || restored.current !== tree.path) return;
    const available = new Set(notePaths(tree.entries));
    setTabs(current => {
      const valid = current.filter(tab => available.has(tab));
      return valid.length === current.length ? current : valid;
    });
    if (path && note) {
      setTabs(current => current.includes(path) ? current : [...current, path]);
      recent.current = [...recent.current.filter(item => item !== path), path];
      const value = drafts.current[path] ?? note.content;
      drafts.current[path] = value;
      hydratingDraft.current = { path, value };
      setDraft(value);
    }
  }, [tree, path, note, loadedRoot]);
  useEffect(() => {
    if (!tree || loadedRoot !== tree.path || restored.current !== tree.path) return;
    const hydration = hydratingDraft.current;
    if (path && hydration?.path === path) {
      if (draft !== hydration.value) return;
      hydratingDraft.current = null;
    }
    if (path) drafts.current[path] = draft;
    localStorage.setItem(storageKey(tree.path), JSON.stringify({ tabs, recent: recent.current, active: path || lastActive.current, drafts: drafts.current } satisfies SavedTabs));
  }, [tree?.path, loadedRoot, tabs, path, draft]);
  const updateDraft = useCallback((value: string) => { if (path) drafts.current[path] = value; setDraft(value); }, [path, setDraft]);
  const saveCurrent = useCallback(async () => !path || !note || draft === note.content || save(path, draft, note.content), [path, note, draft, save]);
  const selectTab = useCallback(async (target: string) => {
    const entry = findEntry(tree?.entries, target);
    if (!entry || entry.kind !== "file" || !await saveCurrent()) return;
    if (path) drafts.current[path] = draft;
    recent.current = [...recent.current.filter(item => item !== target), target];
    lastActive.current = target;
    select(entry);
  }, [tree, saveCurrent, path, draft, select]);
  const closeTabs = useCallback(async (targets: string[]) => {
    if (targets.includes(path) && !await saveCurrent()) return;
    const closing = new Set(targets);
    const remaining = tabs.filter(tab => !closing.has(tab));
    setTabs(remaining);
    recent.current = recent.current.filter(tab => remaining.includes(tab));
    if (closing.has(path)) {
      const next = [...recent.current].reverse().find(tab => remaining.includes(tab));
      if (next) {
        lastActive.current = next;
        const entry = findEntry(tree?.entries, next);
        if (entry) { recent.current = [...recent.current.filter(item => item !== next), next]; select(entry); }
      } else { lastActive.current = ""; clear(); }
    }
  }, [path, saveCurrent, tabs, select, tree, clear]);
  const reorder = (from: string, to: string) => setTabs(current => { const next = [...current]; const source = next.indexOf(from); const target = next.indexOf(to); if (source < 0 || target < 0) return current; next.splice(target, 0, ...next.splice(source, 1)); return next; });
  return { tabs, selectTab, closeTab: (target: string) => closeTabs([target]), closeOthers: (target: string) => closeTabs(tabs.filter(tab => tab !== target)), closeAll: () => closeTabs(tabs), saveCurrent, updateDraft, reorder, create: async () => { if (await saveCurrent()) document.dispatchEvent(new CustomEvent("marnote-create-note")); } };
}
