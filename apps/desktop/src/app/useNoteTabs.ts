import { useCallback, useEffect, useRef, useState } from "react";
import type { Entry, WorkspaceTree } from "../shared/domain/workspace";
import { findEntry, notePaths, persistTabs, readSaved, storageKey } from "./noteTabStorage";
import { resolveDrafts } from "./resolveDrafts";
type Note = { path: string; content: string } | null;
type Props = { tree: WorkspaceTree | null; note: Note; draft: string; setDraft: (value: string) => void; save: (path: string, draft: string, original: string) => Promise<boolean>; select: (entry: Entry) => void; clear: () => void; manual: boolean; askUnsaved: (names: string[], onAction: (name: string, action: "save" | "discard") => Promise<boolean>) => Promise<boolean> };
export function useNoteTabs({ tree, note, draft, setDraft, save, select, clear, manual, askUnsaved }: Props) {
  const [tabs, setTabs] = useState<string[]>([]);
  const [loadedRoot, setLoadedRoot] = useState("");
  const recent = useRef<string[]>([]);
  const drafts = useRef<Record<string, string>>({});
  const originals = useRef<Record<string, string>>({});
  const dirtyDrafts = useRef<Set<string>>(new Set());
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
    originals.current = Object.fromEntries(Object.entries(saved.originals ?? {}).filter(([key]) => available.has(key)));
    dirtyDrafts.current = new Set((saved.dirty ?? []).filter(key => available.has(key)));
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
      originals.current[path] ??= note.content;
      if (value === note.content) { dirtyDrafts.current.delete(path); originals.current[path] = note.content; }
      else { dirtyDrafts.current.add(path); originals.current[path] ??= note.content; }
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
    if (path) {
      drafts.current[path] = draft;
      if (draft === note?.content) { dirtyDrafts.current.delete(path); if (note) originals.current[path] = note.content; }
      else dirtyDrafts.current.add(path);
      if (note) originals.current[path] ??= note.content;
    }
    persistTabs(tree.path, tabs, path || lastActive.current, drafts.current, originals.current, dirtyDrafts.current, recent.current);
  }, [tree?.path, loadedRoot, tabs, path, draft]);
  const updateDraft = useCallback((value: string) => {
    if (path) {
      drafts.current[path] = value;
      if (note) originals.current[path] ??= note.content;
      value === note?.content ? dirtyDrafts.current.delete(path) : dirtyDrafts.current.add(path);
    }
    setDraft(value);
  }, [path, note, setDraft]);
  const saveCurrent = useCallback(async () => {
    if (path && note) {
      drafts.current[path] = draft;
      originals.current[path] ??= note.content;
      draft === note.content ? dirtyDrafts.current.delete(path) : dirtyDrafts.current.add(path);
    }
    const pending = [...dirtyDrafts.current];
    if (!pending.length) return true;
    const resolve = (name: string, action: "save" | "discard") => resolveDrafts({ paths: [name], actions: { [name]: action }, treePath: tree?.path, tabs, active: path, drafts: drafts.current, originals: originals.current, dirty: dirtyDrafts.current, recent: recent.current, save, setDraft });
    if (manual) return askUnsaved(pending, resolve);
    for (const item of pending) if (!await resolve(item, "save")) return false;
    return true;
  }, [path, note, draft, manual, askUnsaved, save, setDraft, tree, tabs]);
  const selectTab = useCallback(async (target: string) => {
    const entry = findEntry(tree?.entries, target);
    if (!entry || entry.kind !== "file") return;
    if (!manual && !await saveCurrent()) return;
    if (path) {
      drafts.current[path] = draft;
      if (note) originals.current[path] ??= note.content;
      draft === note?.content ? dirtyDrafts.current.delete(path) : dirtyDrafts.current.add(path);
    }
    recent.current = [...recent.current.filter(item => item !== target), target];
    lastActive.current = target;
    select(entry);
  }, [tree, saveCurrent, manual, path, note, draft, select]);
  const closeTabs = useCallback(async (targets: string[]) => {
    if (!await saveCurrent()) return;
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
