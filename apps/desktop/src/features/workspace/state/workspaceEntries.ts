import type { Entry } from "../workspaceTypes";

function updateEntries(entries: Entry[], path: string, mutate: (entry: Entry) => Entry): Entry[] {
  return entries.map((entry) =>
    entry.path === path
      ? mutate(entry)
      : { ...entry, children: entry.children ? updateEntries(entry.children, path, mutate) : undefined },
  );
}

export function updateSavedEntry(entries: Entry[], path: string, isEmpty: boolean, updatedMs: number): Entry[] {
  return updateEntries(entries, path, (entry) => ({
    ...entry,
    isEmpty,
    metadata: { ...entry.metadata, createdMs: entry.metadata?.createdMs ?? updatedMs, updatedMs },
  }));
}

export function updateEntryEmptiness(entries: Entry[], path: string, isEmpty: boolean): Entry[] {
  return updateEntries(entries, path, (entry) => ({ ...entry, isEmpty }));
}
