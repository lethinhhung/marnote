import { flattenEntries, type Entry } from "../../shared/domain/workspace";
export { flattenEntries };

export function relativeWorkspaceLink(from: string, target: Entry) {
  const source = from.split("/").filter(Boolean).slice(0, -1);
  const destination = target.path.split("/");
  while (source.length && destination.length && source[0] === destination[0]) {
    source.shift();
    destination.shift();
  }
  const relative = ([...source.map(() => ".."), ...destination].map(part => part === ".." ? part : encodeURIComponent(part))).join("/") || ".";
  return target.kind === "directory" ? `${relative}/` : relative;
}

export function resolveWorkspaceLink(from: string, href: string) {
  if (!href || /^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("#")) return null;
  let target: string;
  try { target = decodeURIComponent(href.split(/[?#]/, 1)[0]); } catch { return null; }
  if (!target) return null;
  const parts = (target.startsWith("/") ? [] : from.split("/").slice(0, -1));
  for (const part of target.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { if (!parts.length) return null; parts.pop(); }
    else parts.push(part);
  }
  return { path: parts.join("/"), kind: target.endsWith("/") ? "directory" as const : "file" as const };
}

export function findWorkspaceLink(entries: Entry[], from: string, href: string) {
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
}
