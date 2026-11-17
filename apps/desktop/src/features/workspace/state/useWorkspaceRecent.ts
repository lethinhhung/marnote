import { useCallback, useState } from "react";
import type { WorkspaceTree } from "../workspaceTypes";
import { openWorkspace, openDefaultWorkspace } from "../../../platform/workspace";
import { loadRecentWorkspaces, rememberRecentWorkspace } from "./recentWorkspaces";

type Options = {
  setTree: (tree: WorkspaceTree | null) => void;
  setNote: (note: { path: string; content: string } | null) => void;
  setError: (message: string) => void;
};

export function useWorkspaceRecent({ setTree, setNote, setError }: Options) {
  const [recent, setRecent] = useState<string[]>(loadRecentWorkspaces);
  const run = useCallback(async (task: () => Promise<void>) => {
    try { setError(""); await task(); } catch (e) { setError(String(e)); }
  }, [setError]);
  const remember = useCallback((path: string) => setRecent(current => rememberRecentWorkspace(current, path)), []);
  const open = (path: string) => run(async () => { setTree(await openWorkspace(path)); setNote(null); remember(path); });
  const openDefault = () => run(async () => {
    const workspace = await openDefaultWorkspace();
    setTree(workspace);
    setNote(null);
    remember(workspace.path);
  });
  const openLastOrDefault = () => run(async () => {
    const latest = loadRecentWorkspaces()[0];
    if (latest) {
      const opened = await openWorkspace(latest).catch(() => null);
      if (opened) { setTree(opened); setNote(null); remember(latest); return; }
    }
    const fallback = await openDefaultWorkspace();
    setTree(fallback);
    setNote(null);
    remember(fallback.path);
  });
  return { open, openDefault, openLastOrDefault, recent };
}
