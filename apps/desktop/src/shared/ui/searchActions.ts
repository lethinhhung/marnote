import type { Entry, WorkspaceTree } from "../domain/workspace";
import { flattenEntries, relativeWorkspaceLink } from "../../features/editor/links/workspaceLinks";
import { uniqueCreatePath } from "../../features/workspace/uniqueCreatePath";

export type CopyNoteValue = "link" | "relative-path" | "full-path";
export type SearchTargetAction = CopyNoteValue | "content" | "rename" | "remove";

export function createSearchActions(tree: WorkspaceTree | null, path: string, title: string, saveCurrent: () => Promise<boolean>, create: (path: string) => Promise<void>) {
  const target = (targetPath: string) => tree && flattenEntries(tree.entries).find(entry => entry.path === targetPath);
  return {
    createNote: async (name: string) => {
      if (!tree || !await saveCurrent()) return;
      await create(uniqueCreatePath(tree.entries, `${name}.md`));
    },
    copy: async (value: CopyNoteValue) => {
      const entry = target(path);
      if (entry && tree) await copyEntry(tree.path, path, entry, title, value);
    },
    copyTarget: async (entry: Entry, value: SearchTargetAction, content = "") => {
      if (!tree) return;
      if (value === "content") { await copyText(content); return; }
      if (value === "rename" || value === "remove") return;
      await copyEntry(tree.path, path, entry, entry.name.replace(/\.md$/i, ""), value);
    },
  };
}

async function copyEntry(root: string, from: string, target: Entry, title: string, value: CopyNoteValue) {
  if (value === "relative-path") { await copyText(target.path); return; }
  if (value === "full-path") { const separator = root.includes("\\") ? "\\" : "/"; const path = target.path.replace(/[\\/]/g, separator); await copyText(`${root.replace(/[\\/]$/, "")}${separator}${path}`); return; }
  const href = relativeWorkspaceLink(from, target);
  const markdown = `[${title}](${href})`;
  try {
    if (navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
      const plain = new Blob([markdown], { type: "text/plain" });
      const html = new Blob([`<a href="${escapeAttribute(href)}">${escapeHtml(title)}</a>`,], { type: "text/html" });
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": plain, "text/html": html })]);
    } else await navigator.clipboard.writeText(markdown);
  } catch { try { await navigator.clipboard.writeText(markdown); } catch { /* Clipboard access may be unavailable. */ } }
}

async function copyText(value: string) { try { await navigator.clipboard.writeText(value); } catch { /* Clipboard access may be unavailable. */ } }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character); }
const escapeAttribute = escapeHtml;
