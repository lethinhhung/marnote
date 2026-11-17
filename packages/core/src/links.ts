import { flattenEntries, normalizeWorkspacePath, type Entry } from "./workspace.js";

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

/** Generate a relative workspace link from one entry to another. */
export function relativeWorkspaceLink(from: string, target: Entry): string {
  const source = from.split("/").filter(Boolean).slice(0, -1);
  const destination = target.path.split("/");
  while (source.length && destination.length && source[0] === destination[0]) {
    source.shift();
    destination.shift();
  }
  const relative = ([...source.map(() => ".."), ...destination].map(part => part === ".." ? part : encodeURIComponent(part))).join("/") || ".";
  return target.kind === "directory" ? `${relative}/` : relative;
}

/** Resolve a workspace-relative link to a target path and kind. */
export function resolveWorkspaceLink(from: string, href: string): { path: string; kind: "directory" | "file" } | null {
  if (!href || isExternalUrl(href) || href.startsWith("#")) return null;
  let target: string;
  try { target = decodeURIComponent(href.split(/[?#]/, 1)[0]); } catch { return null; }
  if (!target) return null;
  const parts = (target.startsWith("/") ? [] : from.split("/").slice(0, -1));
  for (const part of target.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { if (!parts.length) return null; parts.pop(); }
    else parts.push(part);
  }
  return { path: parts.join("/"), kind: target.endsWith("/") ? "directory" : "file" };
}

/** Find a workspace entry matching the given link from the current note. */
export function findWorkspaceLink(entries: Entry[], from: string, href: string): Entry | undefined {
  const candidates = [href];
  try {
    const url = new URL(href, window.location.href);
    const localHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (url.origin === window.location.origin || localHost) candidates.push(url.pathname, url.pathname.replace(/^\//, ""));
  } catch { /* Relative workspace paths are resolved below. */ }
  const available = new Map(flattenEntries(entries).map(entry => [entry.path, entry]));
  for (const candidate of candidates) {
    const resolved = resolveWorkspaceLink(from, candidate);
    const entry = resolved && available.get(resolved.path);
    if (entry) return entry;
    if (candidate.startsWith("/")) {
      const relative = resolveWorkspaceLink(from, candidate.slice(1));
      const relativeEntry = relative && available.get(relative.path);
      if (relativeEntry) return relativeEntry;
    }
  }
  return undefined;
}

export { flattenEntries };
