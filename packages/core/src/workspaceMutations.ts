import type { Entry } from "./workspace.js";

export type SaveResult = { ok: true } | { ok: false; error: unknown };
export type WriteWorkspaceFile = (root: string, path: string, content: string, expected: string) => Promise<void>;

export async function saveWorkspace(
  write: WriteWorkspaceFile,
  root: string,
  path: string,
  content: string,
  expected: string,
): Promise<SaveResult> {
  try {
    await write(root, path, content, expected);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function updateEntries(entries: Entry[], path: string, mutate: (entry: Entry) => Entry): Entry[] {
  return entries.map((entry) => entry.path === path
    ? mutate(entry)
    : { ...entry, children: entry.children ? updateEntries(entry.children, path, mutate) : undefined });
}

export function updateSavedEntry(entries: Entry[], path: string, isEmpty: boolean, updatedMs: number): Entry[] {
  return updateEntries(entries, path, (entry) => ({
    ...entry,
    isEmpty,
    modifiedMs: updatedMs,
    metadata: { ...entry.metadata, createdMs: entry.metadata?.createdMs ?? updatedMs, updatedMs },
  }));
}

export function updateEntryEmptiness(entries: Entry[], path: string, isEmpty: boolean): Entry[] {
  return updateEntries(entries, path, (entry) => ({ ...entry, isEmpty }));
}
