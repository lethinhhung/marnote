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

const domain = /^(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i;
const externalScheme = /^[a-z][a-z\d+.-]*:/i;

/** Check if a value is an external URL (has a scheme or is protocol-relative). */
export function isExternalUrl(value: string): boolean {
  return externalScheme.test(value) || value.startsWith("//");
}

/** Normalize a link URL: pass through externals and absolute paths, normalize bare domains to HTTPS. */
export function normalizeLinkUrl(value: string): string {
  const href = value.trim();
  if (isExternalUrl(href) || href.startsWith("/")) return href;
  if (href.startsWith("./") || href.startsWith("../") || href.endsWith("/") || /(?:^|\/)\.{0,2}[^/]*\.md(?:[?#].*)?$/i.test(href)) return href;
  return domain.test(href) ? `https://${href}` : href;
}
