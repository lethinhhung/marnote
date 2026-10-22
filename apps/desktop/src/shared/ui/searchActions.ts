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
      if (!target) return;
      const href = relativeWorkspaceLink(path, target);
      const markdown = `[${title}](${href})`;
      try {
        if (navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
          const plain = new Blob([markdown], { type: "text/plain" });
          const html = new Blob([`<a href="${escapeAttribute(href)}">${escapeHtml(title)}</a>`], { type: "text/html" });
          await navigator.clipboard.write([new ClipboardItem({ "text/plain": plain, "text/html": html })]);
        } else await navigator.clipboard.writeText(markdown);
      } catch {
        try { await navigator.clipboard.writeText(markdown); } catch { /* Clipboard access may be unavailable. */ }
      }
    },
  };
}

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character); }
const escapeAttribute = escapeHtml;
