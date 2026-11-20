import type { WorkspaceEntryMetadata } from "../../shared/domain/workspace";

type UpdateEntryMetadataInput = Partial<Pick<WorkspaceEntryMetadata, "tags" | "icon" | "favorite">>;

export type Entry = {
  name: string;
  path: string;
  kind: "directory" | "file";
  isEmpty?: boolean;
  modifiedMs?: number;
  metadata?: WorkspaceEntryMetadata;
  children?: Entry[];
};

export function findEntry(entries: Entry[], path: string): Entry | undefined {
  for (const entry of entries) {
    if (entry.path === path) return entry;
    if (entry.children) {
      const found = findEntry(entry.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

export function updateEntryInTree(
  entries: Entry[],
  targetPath: string,
  isEmpty: boolean,
  modifiedMs: number
): Entry[] {
  return entries.map((entry) => {
    if (entry.path === targetPath) {
      return { ...entry, isEmpty, modifiedMs };
    }
    if (entry.children) {
      return { ...entry, children: updateEntryInTree(entry.children, targetPath, isEmpty, modifiedMs) };
    }
    return entry;
  });
}

export function addEntryToTree(
  entries: Entry[],
  targetPath: string,
  kind: "file" | "directory",
  isEmpty: boolean,
  modifiedMs: number,
  metadata?: WorkspaceEntryMetadata
): Entry[] {
  const parts = targetPath.split("/").filter(Boolean);
  if (parts.length === 1) {
    const name = parts[0];
    const exists = entries.some((e) => e.path === targetPath);
    if (exists) return entries;
    return [
      ...entries,
      { name, path: targetPath, kind, isEmpty, modifiedMs, metadata, children: kind === "directory" ? [] : undefined },
    ];
  }
  const parentPath = parts.slice(0, -1).join("/");
  return entries.map((entry) => {
    if (entry.path === parentPath && entry.kind === "directory") {
      const newChildren = addEntryToTree(entry.children ?? [], targetPath, kind, isEmpty, modifiedMs, metadata);
      return { ...entry, children: newChildren };
    }
    if (entry.children) {
      return { ...entry, children: addEntryToTree(entry.children, targetPath, kind, isEmpty, modifiedMs, metadata) };
    }
    return entry;
  });
}

export function moveEntryInTree(entries: Entry[], sourcePath: string, destPath: string): Entry[] {
  let movedEntry: Entry | null = null;
  const removeResult = entries
    .map((entry) => {
      if (entry.path === sourcePath) {
        movedEntry = { ...entry, path: destPath, name: destPath.split("/").pop() || destPath };
        return null;
      }
      if (entry.children) {
        const newChildren = moveEntryInTree(entry.children, sourcePath, destPath);
        if (newChildren !== entry.children) {
          return { ...entry, children: newChildren };
        }
      }
      return entry;
    })
    .filter((entry): entry is Entry => entry !== null);

  const entryToMove = movedEntry;
  if (!entryToMove) return removeResult;

  const destParts = destPath.split("/").filter(Boolean);
  if (destParts.length === 1) {
    return [...removeResult, entryToMove];
  }
  const parentPath = destParts.slice(0, -1).join("/");
  return removeResult.map((entry) => {
    if (entry.path === parentPath && entry.kind === "directory") {
      return { ...entry, children: [...(entry.children ?? []), entryToMove] };
    }
    if (entry.children) {
      return { ...entry, children: moveEntryInTree(entry.children, sourcePath, destPath) };
    }
    return entry;
  });
}

export function removeEntryFromTree(entries: Entry[], targetPath: string): Entry[] {
  return entries
    .map((entry) => {
      if (entry.path === targetPath) return null;
      if (entry.children) {
        const newChildren = removeEntryFromTree(entry.children, targetPath);
        if (newChildren !== entry.children) return { ...entry, children: newChildren };
      }
      return entry;
    })
    .filter(Boolean) as Entry[];
}

export function updateEntryMetadataInTree(
  entries: Entry[],
  targetPath: string,
  metadata: UpdateEntryMetadataInput
): Entry[] {
  return entries.map((entry) => {
    if (entry.path === targetPath) {
      return { ...entry, metadata: { ...entry.metadata, ...metadata } };
    }
    if (entry.children) {
      return { ...entry, children: updateEntryMetadataInTree(entry.children, targetPath, metadata) };
    }
    return entry;
  });
}
