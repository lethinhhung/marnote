import type { WorkspaceTree } from "../domain/workspace";
import { flattenEntries, relativeWorkspaceLink } from "../../features/editor/workspaceLinks";
import { uniqueCreatePath } from "../../features/workspace/uniqueCreatePath";

export type CopyNoteValue = "link" | "relative-path" | "full-path";

export function createSearchActions(tree: WorkspaceTree | null, path: string, title: string, saveCurrent: () => Promise<boolean>, create: (path: string) => Promise<void>) {
  return {
    createNote: async (name: string) => {
      if (!tree || !await saveCurrent()) return;
      await create(uniqueCreatePath(tree.entries, `${name}.md`));
    },
    copy: async (value: CopyNoteValue) => {
      const target = tree && flattenEntries(tree.entries).find(entry => entry.path === path);
      if (!target) return;
      if (value === "relative-path") { await copyText(target.path); return; }
      if (value === "full-path") { const separator = tree.path.includes("\\") ? "\\" : "/"; await copyText(`${tree.path.replace(/[\\/]$/, "")}${separator}${target.path}`); return; }
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

async function copyText(value: string) { try { await navigator.clipboard.writeText(value); } catch { /* Clipboard access may be unavailable. */ } }

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character); }
const escapeAttribute = escapeHtml;
