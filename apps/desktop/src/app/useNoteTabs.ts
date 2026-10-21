import { useEffect, useRef, useState } from "react";
import type { Entry, WorkspaceTree } from "../shared/domain/workspace";

type Note = { path: string; content: string } | null;
type Props = {
  tree: WorkspaceTree | null;
  note: Note;
  draft: string;
  setDraft: (value: string) => void;
  save: (path: string, draft: string, original: string) => Promise<boolean>;
  select: (entry: Entry) => void;
  clear: () => void;
};

function findEntry(entries: Entry[] = [], path: string): Entry | undefined {
  for (const entry of entries) {
    if (entry.path === path) return entry;
    const found = entry.children && findEntry(entry.children, path);
    if (found) return found;
  }
}

function notePaths(entries?: Entry[]): string[] {
  return (entries ?? []).flatMap(entry => entry.kind === "file" ? [entry.path] : notePaths(entry.children));
}

export function useNoteTabs({ tree, note, draft, setDraft, save, select, clear }: Props) {
  const [tabs, setTabs] = useState<string[]>([]);
  const drafts = useRef<Record<string, string>>({});
  const path = note?.path || "";
  useEffect(() => {
    if (!path || !note) { setDraft(""); return; }
    setTabs(current => current.includes(path) ? current : [...current, path]);
    drafts.current[path] ??= note.content;
    setDraft(drafts.current[path]);
  }, [path]);
  useEffect(() => {
    const available = new Set(notePaths(tree?.entries));
    setTabs(current => current.filter(tab => available.has(tab)));
  }, [tree]);
  const updateDraft = (value: string) => {
    if (path) drafts.current[path] = value;
    setDraft(value);
  };
  const saveCurrent = async () => !path || !note || draft === note.content || save(path, draft, note.content);
  const selectTab = async (target: string) => {
    const entry = findEntry(tree?.entries, target);
    if (!entry || entry.kind !== "file") return;
    if (!await saveCurrent()) return;
    select(entry);
  };
  const closeTab = async (target: string) => {
    if (target === path && !await saveCurrent()) return;
    const remaining = tabs.filter(tab => tab !== target);
    setTabs(remaining);
    if (target === path) {
      const next = remaining.at(-1);
      if (next) await selectTab(next);
      else clear();
    }
  };
  return { tabs, selectTab, closeTab, saveCurrent, updateDraft };
}
