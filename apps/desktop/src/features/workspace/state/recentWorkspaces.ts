const STORAGE_KEY = "marnote-workspaces";
const LIMIT = 5;

export function loadRecentWorkspaces(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((path): path is string => typeof path === "string") : [];
  } catch { return []; }
}

export function rememberRecentWorkspace(current: string[], path: string): string[] {
  const next = [path, ...current.filter(item => item !== path)].slice(0, LIMIT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
