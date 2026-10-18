export function isSameOrDescendant(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

export function rebasePath(path: string, source: string, destination: string): string {
  if (!isSameOrDescendant(path, source)) return path;
  return `${destination}${path.slice(source.length)}`;
}
