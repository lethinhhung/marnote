export function isSameOrDescendant(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

export function parentPath(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

export function rebasePath(path: string, source: string, destination: string): string {
  if (!isSameOrDescendant(path, source)) return path;
  return `${destination}${path.slice(source.length)}`;
}

export function ancestorPaths(path: string, includeLeaf = false): string[] {
  const parts = path.split("/").filter(Boolean);
  const end = includeLeaf ? parts.length : parts.length - 1;
  return parts.slice(0, end).map((_, index) => parts.slice(0, index + 1).join("/"));
}