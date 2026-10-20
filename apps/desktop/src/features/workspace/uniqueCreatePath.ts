import type { Entry } from "./workspaceTypes";

export function uniqueCreatePath(entries: Entry[], path: string): string {
  const parent = path.split("/").slice(0, -1).join("/").toLowerCase();
  const name = path.split("/").pop() || path;
  const extension = name.toLowerCase().endsWith(".md") ? ".md" : "";
  const stem = extension ? name.slice(0, -extension.length) : name;
  const siblings = entries.filter(entry => entry.path.split("/").slice(0, -1).join("/").toLowerCase() === parent);
  const existing = new Set(siblings.map(entry => entry.name.toLowerCase()));
  if (!existing.has(name.toLowerCase())) return path;
  let suffix = 1;
  while (existing.has(`${stem}-${suffix}${extension}`.toLowerCase())) suffix++;
  return [...path.split("/").slice(0, -1), `${stem}-${suffix}${extension}`].filter(Boolean).join("/");
}
