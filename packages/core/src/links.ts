import { normalizeWorkspacePath } from "./workspace.js";

/** Resolve a portable relative Markdown link to a workspace path. */
export function resolveNoteLink(sourcePath: string, target: string): string | null {
  const decoded = safeDecode(target.trim());
  if (!decoded || /^(?:[a-z]+:|\/\/)/i.test(decoded) || decoded.startsWith("/")) return null;
  const clean = decoded.split(/[?#]/, 1)[0];
  if (!clean) return null;
  const source = normalizeWorkspacePath(sourcePath);
  if (!source) return null;
  const parent = source.split("/").slice(0, -1).join("/");
  const relative = parent ? `${parent}/${clean}` : clean;
  const normalized = normalizeWorkspacePath(relative);
  if (!normalized) return null;
  return /\.md$/i.test(normalized) ? normalized : `${normalized}.md`;
}

/** Extract standard local Markdown links, leaving external URLs out. */
export function extractNoteLinks(markdown: string, sourcePath: string): string[] {
  const result = new Set<string>();
  const pattern = /(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g;
  for (const match of markdown.matchAll(pattern)) {
    const resolved = resolveNoteLink(sourcePath, match[1] ?? "");
    if (resolved) result.add(resolved);
  }
  return [...result];
}

function safeDecode(value: string): string | null {
  try { return decodeURIComponent(value); } catch { return null; }
}
