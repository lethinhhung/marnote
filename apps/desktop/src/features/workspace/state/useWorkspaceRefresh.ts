import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { listWorkspace } from "../../../platform/workspace";
import type { WorkspaceTree } from "../workspaceTypes";
import { sameWorkspaceTree } from "./workspaceTreeSnapshot";

export function useWorkspaceRefresh(
  tree: WorkspaceTree | null,
  setTree: Dispatch<SetStateAction<WorkspaceTree | null>>,
  setError: (value: string) => void,
) {
  const refreshing = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    if (!tree || refreshing.current) return;
    refreshing.current = true;
    try {
      const next = await listWorkspace(tree.path);
      setTree((current) => (current && sameWorkspaceTree(current, next) ? current : next));
      if (!silent) setError("");
    } catch (e) {
      if (!silent) setError(String(e));
    } finally {
      refreshing.current = false;
    }
  }, [tree?.path, setTree, setError]);

  useEffect(() => {
    if (!tree) return;
    const timer = window.setInterval(() => { void refresh(true); }, 2500);
    return () => window.clearInterval(timer);
  }, [tree?.path, refresh]);

  return { refresh };
}
