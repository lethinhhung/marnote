import type { Entry } from "./workspaceTypes";

export function containsNote(entry: Entry): boolean {
  return entry.kind === "file" ? entry.path.toLowerCase().endsWith(".md") : (entry.children || []).some(containsNote);
}

export function visibleEntries(entries: Entry[], hideFoldersWithoutNotes: boolean): Entry[] {
  return entries.flatMap(entry => {
    if (entry.kind === "file") return [entry];
    const children = visibleEntries(entry.children || [], hideFoldersWithoutNotes);
    return hideFoldersWithoutNotes && !containsNote(entry) ? [] : [{ ...entry, children }];
  });
}
