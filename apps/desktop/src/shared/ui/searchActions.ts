import type { WorkspaceTree } from "../domain/workspace";
import { flattenEntries, relativeWorkspaceLink } from "../../features/editor/workspaceLinks";
import { uniqueCreatePath } from "../../features/workspace/uniqueCreatePath";

export function createSearchActions(tree: WorkspaceTree | null, path: string, title: string, saveCurrent: () => Promise<boolean>, create: (path: string) => Promise<void>) {
  return {
    createNote: async (name: string) => {
      if (!tree || !await saveCurrent()) return;
      await create(uniqueCreatePath(tree.entries, `${name}.md`));
    },
    copyLink: async () => {
      const target = tree && flattenEntries(tree.entries).find(entry => entry.path === path);
      if (target) try { await navigator.clipboard.writeText(`[${title}](${relativeWorkspaceLink(path, target)})`); } catch { /* Clipboard access may be unavailable. */ }
    },
  };
}
