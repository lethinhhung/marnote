import type { Entry } from "./workspaceTypes";
import { flattenEntries } from "../../shared/domain/workspace";
import { parentPath } from "./state/workspacePaths";

export function uniqueCreatePath(entries: Entry[], path: string): string {
  const parent = parentPath(path).toLowerCase();
  const name = path.split("/").pop() || path;
  const extensionMatch = name.match(/\.md$/i);
  const extension = extensionMatch ? extensionMatch[0] : "";
  const stem = extension ? name.slice(0, -extension.length) : name;
  const allEntries = flattenEntries(entries);
  const siblings = allEntries.filter(entry => parentPath(entry.path).toLowerCase() === parent);
  const existing = new Set<string>();
  for (const entry of siblings) {
    const entryName = entry.name.toLowerCase();
    existing.add(entryName);
    if (entry.kind === "file") {
      const entryExtensionMatch = entry.name.match(/\.md$/i);
      const entryExtension = entryExtensionMatch ? entryExtensionMatch[0] : "";
      const entryStem = entryExtension ? entry.name.slice(0, -entryExtension.length) : entry.name;
      existing.add(entryStem.toLowerCase());
    }
  }
  if (!existing.has(name.toLowerCase()) && !existing.has(stem.toLowerCase())) return path;
  let suffix = 1;
  while (existing.has(`${stem}-${suffix}${extension}`.toLowerCase()) || existing.has(`${stem}-${suffix}`.toLowerCase())) suffix++;
  return [...parentPath(path).split("/"), `${stem}-${suffix}${extension}`].filter(Boolean).join("/");
}
