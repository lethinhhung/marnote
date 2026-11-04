import type { Entry } from "./workspaceTypes";
import { flattenEntries } from "../../shared/domain/workspace";
import { parentPath } from "./state/workspacePaths";

export function uniqueCreatePath(entries: Entry[], path: string): string {
  const parent = parentPath(path).toLowerCase();
  const name = path.split("/").pop() || path;
  const extension = name.toLowerCase().endsWith(".md") ? ".md" : "";
  const stem = extension ? name.slice(0, -extension.length) : name;
  const allEntries = flattenEntries(entries);
  const siblings = allEntries.filter(entry => parentPath(entry.path).toLowerCase() === parent);
  const existing = new Set(siblings.map(entry => entry.name.toLowerCase()));
  if (!existing.has(name.toLowerCase())) return path;
  let suffix = 1;
  while (existing.has(`${stem}-${suffix}${extension}`.toLowerCase())) suffix++;
  return [...parentPath(path).split("/"), `${stem}-${suffix}${extension}`].filter(Boolean).join("/");
}
