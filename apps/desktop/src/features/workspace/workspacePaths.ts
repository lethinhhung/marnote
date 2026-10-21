export function isSameOrDescendant(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

/** Parent folder of a workspace-relative path; root-level items have no parent. */
export function parentPath(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

export function rebasePath(path: string, source: string, destination: string): string {
  if (!isSameOrDescendant(path, source)) return path;
  return `${destination}${path.slice(source.length)}`;
}
