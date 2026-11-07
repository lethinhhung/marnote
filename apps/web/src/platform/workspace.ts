import type { WorkspaceTree, WorkspaceEntryMetadata } from "../shared/domain/workspace";
import { normalizeWorkspacePath } from "@marnote/core";
import { findEntry, updateEntryInTree, addEntryToTree, moveEntryInTree, removeEntryFromTree, updateEntryMetadataInTree } from "./workspace/treeMutations";
import { getDB } from "./workspace/db";
import { QuotaExceededError, isQuotaError } from "./workspace/quota";

export { QuotaExceededError } from "./workspace/quota";

const DEFAULT_WORKSPACE_ID = "default";

export type ReadResult = { path: string; content: string; modifiedMs: number };
export type TrashItem = { id: string; path: string; kind: "file" | "directory"; restorable: boolean };
export type UpdateEntryMetadataInput = Partial<Pick<WorkspaceEntryMetadata, "tags" | "icon" | "favorite">>;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
}

async function getWorkspaceTree(): Promise<WorkspaceTree | null> {
  const db = await getDB();
  const record = await db.get("workspace", DEFAULT_WORKSPACE_ID);
  return record?.tree ?? null;
}

async function saveWorkspaceTree(tree: WorkspaceTree): Promise<void> {
  const db = await getDB();
  try {
    await db.put("workspace", {
      id: DEFAULT_WORKSPACE_ID,
      tree,
      updatedAt: Date.now(),
    });
  } catch (error) {
    if (isQuotaError(error)) {
      throw new QuotaExceededError("Failed to save workspace: storage quota exceeded");
    }
    throw error;
  }
}

async function getFile(workspaceId: string, path: string): Promise<{ content: string; modifiedMs: number } | null> {
  const db = await getDB();
  const normalizedPath = normalizePath(path);
  const record = await db.getFromIndex("files", "by-path", normalizedPath);
  if (record && record.workspaceId === workspaceId) {
    return { content: record.content, modifiedMs: record.modifiedMs };
  }
  return null;
}

async function putFile(workspaceId: string, path: string, content: string, modifiedMs: number): Promise<void> {
  const db = await getDB();
  const normalizedPath = normalizePath(path);
  const id = `${workspaceId}:${normalizedPath}`;
  try {
    await db.put("files", {
      id,
      workspaceId,
      path: normalizedPath,
      content,
      modifiedMs,
    });
  } catch (error) {
    if (isQuotaError(error)) {
      throw new QuotaExceededError("Failed to write file: storage quota exceeded");
    }
    throw error;
  }
}

async function deleteFileRecord(workspaceId: string, path: string): Promise<void> {
  const db = await getDB();
  const normalizedPath = normalizePath(path);
  const id = `${workspaceId}:${normalizedPath}`;
  await db.delete("files", id);
}

async function listFiles(workspaceId: string): Promise<Array<{ path: string; content: string; modifiedMs: number }>> {
  const db = await getDB();
  const records = await db.getAllFromIndex("files", "by-workspace", workspaceId);
  return records.map(r => ({ path: r.path, content: r.content, modifiedMs: r.modifiedMs }));
}

export async function openWorkspace(): Promise<WorkspaceTree> {
  const tree = await getWorkspaceTree();
  if (!tree) {
    throw new Error("Workspace not initialized");
  }
  return tree;
}

export async function openDefaultWorkspace(): Promise<WorkspaceTree> {
  let tree = await getWorkspaceTree();
  if (!tree) {
    tree = {
      name: "Notes",
      path: "/",
      entries: [],
      tags: {},
      manualOrder: {},
    };
    await saveWorkspaceTree(tree);
  }
  return tree;
}

export async function listWorkspace(): Promise<WorkspaceTree> {
  return openDefaultWorkspace();
}

export async function readFile(rootPath: string, path: string): Promise<ReadResult> {
  const tree = await getWorkspaceTree();
  if (!tree) throw new Error("Workspace not initialized");
  const file = await getFile(tree.path, path);
  if (!file) throw new Error(`File not found: ${path}`);
  return { path, content: file.content, modifiedMs: file.modifiedMs };
}

export type MarkdownDownloadResult = {
  content: string;
  filename: string;
};

export async function downloadNoteAsMarkdown(rootPath: string, path: string): Promise<MarkdownDownloadResult> {
  const result = await readFile(rootPath, path);
  const normalizedPath = path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
  const basename = normalizedPath.split("/").pop() || "note";
  const filename = basename.endsWith(".md") ? basename : `${basename}.md`;
  return { content: result.content, filename };
}

export async function writeFile(rootPath: string, path: string, content: string, expectedContent: string): Promise<void> {
  const tree = await getWorkspaceTree();
  if (!tree) throw new Error("Workspace not initialized");
  const file = await getFile(tree.path, path);
  if (file && file.content !== expectedContent) {
    throw new Error("File was modified externally");
  }
  await putFile(tree.path, path, content, Date.now());
  tree.entries = updateEntryInTree(tree.entries, path, content.length === 0, Date.now());
  await saveWorkspaceTree(tree);
}

export async function createFile(rootPath: string, path: string, content = ""): Promise<string> {
  const tree = await getWorkspaceTree();
  if (!tree) throw new Error("Workspace not initialized");
  const normalizedPath = normalizePath(path);
  await putFile(tree.path, normalizedPath, content, Date.now());
  tree.entries = addEntryToTree(tree.entries, normalizedPath, "file", content.length === 0, Date.now());
  await saveWorkspaceTree(tree);
  return normalizedPath;
}

export async function moveFile(rootPath: string, source: string, destination: string): Promise<void> {
  const tree = await getWorkspaceTree();
  if (!tree) throw new Error("Workspace not initialized");
  const normalizedSource = normalizePath(source);
  const normalizedDest = normalizePath(destination);
  const file = await getFile(tree.path, normalizedSource);
  if (!file) throw new Error(`File not found: ${source}`);
  await putFile(tree.path, normalizedDest, file.content, Date.now());
  await deleteFileRecord(tree.path, normalizedSource);
  tree.entries = moveEntryInTree(tree.entries, normalizedSource, normalizedDest);
  await saveWorkspaceTree(tree);
}

export async function deleteFile(rootPath: string, path: string): Promise<string> {
  const tree = await getWorkspaceTree();
  if (!tree) throw new Error("Workspace not initialized");
  const normalizedPath = normalizePath(path);
  const file = await getFile(tree.path, normalizedPath);
  if (!file) throw new Error(`File not found: ${path}`);
  await deleteFileRecord(tree.path, normalizedPath);
  const entry = findEntry(tree.entries, normalizedPath);
  if (entry?.metadata) {
    await addToTrash(tree.path, normalizedPath, "file", file.content, entry.metadata, true);
  }
  tree.entries = removeEntryFromTree(tree.entries, normalizedPath);
  await saveWorkspaceTree(tree);
  return normalizedPath;
}

export async function listTrash(rootPath: string): Promise<TrashItem[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex("trash", "by-workspace", rootPath);
  return records.map(r => ({ id: r.id, path: r.path, kind: r.kind, restorable: r.restorable }));
}

export async function restoreTrash(rootPath: string, id: string): Promise<void> {
  const db = await getDB();
  const record = await db.get("trash", id);
  if (!record || record.workspaceId !== rootPath) throw new Error("Trash item not found");
  if (record.kind === "file" && record.content !== undefined) {
    await putFile(rootPath, record.path, record.content, Date.now());
    const tree = await getWorkspaceTree();
    if (tree) {
      tree.entries = addEntryToTree(tree.entries, record.path, "file", false, Date.now(), record.metadata);
      await saveWorkspaceTree(tree);
    }
  }
  await db.delete("trash", id);
}

export async function emptyTrash(rootPath: string): Promise<void> {
  const db = await getDB();
  const records = await db.getAllFromIndex("trash", "by-workspace", rootPath);
  for (const record of records) {
    await db.delete("trash", record.id);
  }
}

export async function createFolder(rootPath: string, path: string): Promise<string> {
  const tree = await getWorkspaceTree();
  if (!tree) throw new Error("Workspace not initialized");
  const normalizedPath = normalizePath(path);
  tree.entries = addEntryToTree(tree.entries, normalizedPath, "directory", true, Date.now());
  await saveWorkspaceTree(tree);
  return normalizedPath;
}

export async function updateEntryMetadata(rootPath: string, path: string, metadata: UpdateEntryMetadataInput): Promise<void> {
  const tree = await getWorkspaceTree();
  if (!tree) throw new Error("Workspace not initialized");
  const normalizedPath = normalizePath(path);
  tree.entries = updateEntryMetadataInTree(tree.entries, normalizedPath, metadata);
  await saveWorkspaceTree(tree);
}

export async function saveWorkspaceTags(rootPath: string, tags: Record<string, string>): Promise<void> {
  const db = await getDB();
  const id = `${rootPath}:tags`;
  try {
    await db.put("tags", { id, workspaceId: rootPath, tags });
  } catch (error) {
    if (isQuotaError(error)) {
      throw new QuotaExceededError("Failed to save tags: storage quota exceeded");
    }
    throw error;
  }
  const tree = await getWorkspaceTree();
  if (tree) {
    tree.tags = tags;
    await saveWorkspaceTree(tree);
  }
}

export async function saveManualOrder(rootPath: string, parent: string, paths: string[]): Promise<void> {
  const db = await getDB();
  const id = `${rootPath}:${parent}`;
  try {
    await db.put("manualOrder", { id, workspaceId: rootPath, parent, paths });
  } catch (error) {
    if (isQuotaError(error)) {
      throw new QuotaExceededError("Failed to save manual order: storage quota exceeded");
    }
    throw error;
  }
  const tree = await getWorkspaceTree();
  if (tree) {
    tree.manualOrder = { ...tree.manualOrder, [parent]: paths };
    await saveWorkspaceTree(tree);
  }
}

export async function renameWorkspaceTag(rootPath: string, oldName: string, newName: string, color: string): Promise<void> {
  const tree = await getWorkspaceTree();
  if (!tree) throw new Error("Workspace not initialized");
  const tags = { ...(tree.tags ?? {}) };
  if (tags[oldName]) {
    delete tags[oldName];
    tags[newName] = color;
    tree.tags = tags;
    await saveWorkspaceTags(tree.path, tags);
    await saveWorkspaceTree(tree);
  }
}

async function addToTrash(
  workspaceId: string,
  path: string,
  kind: "file" | "directory",
  content: string | undefined,
  metadata: WorkspaceEntryMetadata | undefined,
  restorable: boolean
): Promise<void> {
  const db = await getDB();
  const id = generateId();
  try {
    await db.put("trash", {
      id,
      workspaceId,
      path,
      kind,
      content,
      metadata,
      deletedAt: Date.now(),
      restorable,
    });
  } catch (error) {
    if (isQuotaError(error)) {
      throw new QuotaExceededError("Failed to move to trash: storage quota exceeded");
    }
    throw error;
  }
}

export async function exportWorkspace(): Promise<Blob> {
  const tree = await getWorkspaceTree();
  if (!tree) throw new Error("Workspace not initialized");
  const files = await listFiles(tree.path);
  const trash = await listTrash(tree.path);
  const db = await getDB();
  const tagsRecord = await db.getFromIndex("tags", "by-workspace", tree.path);
  const orderRecords = await db.getAllFromIndex("manualOrder", "by-workspace-parent", tree.path);

  const exportData = {
    tree,
    files: files.map(f => ({ path: f.path, content: f.content, modifiedMs: f.modifiedMs })),
    trash: trash.map(t => t),
    tags: tagsRecord?.tags ?? {},
    manualOrder: Object.fromEntries(orderRecords.map(r => [r.parent, r.paths])),
    exportedAt: Date.now(),
    version: 1,
  };

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("workspace.json", JSON.stringify(exportData, null, 2));
  for (const file of files) {
    zip.file(`notes/${file.path}`, file.content);
  }
  return zip.generateAsync({ type: "blob" });
}

export function validateZipEntryPaths(zip: { files: Record<string, { dir: boolean }> }): void {
  for (const [zipPath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (zipPath === "workspace.json") continue;

    let relativePath: string;
    if (zipPath.startsWith("notes/")) {
      relativePath = zipPath.slice("notes/".length);
    } else {
relativePath = zipPath;
    }
    const normalized = normalizeWorkspacePath(relativePath);
    if (!normalized) {
      throw new Error(`Invalid path in archive: ${zipPath}`);
    }
  }
}

export async function importWorkspace(blob: Blob): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(blob);
  const workspaceFile = zip.file("workspace.json");
  if (!workspaceFile) throw new Error("Invalid workspace archive: missing workspace.json");
  const json = await workspaceFile.async("string");
  const data = JSON.parse(json);

  if (!data.tree || !data.files) throw new Error("Invalid workspace archive: missing required data");

  validateZipEntryPaths(zip);

  const db = await getDB();
  const tx = db.transaction(["workspace", "files", "trash", "tags", "manualOrder"], "readwrite");
  await tx.objectStore("workspace").clear();
  await tx.objectStore("files").clear();
  await tx.objectStore("trash").clear();
  await tx.objectStore("tags").clear();
  await tx.objectStore("manualOrder").clear();
  await tx.done;

  await saveWorkspaceTree(data.tree);
  for (const file of data.files) {
    await putFile(data.tree.path, file.path, file.content, file.modifiedMs);
  }
  if (data.trash) {
    for (const item of data.trash) {
      try {
        await db.put("trash", { ...item, workspaceId: data.tree.path, id: item.id });
      } catch (error) {
        if (isQuotaError(error)) {
          throw new QuotaExceededError("Failed to import trash: storage quota exceeded");
        }
        throw error;
      }
    }
  }
  if (data.tags) {
    await saveWorkspaceTags(data.tree.path, data.tags);
  }
  if (data.manualOrder) {
    for (const [parent, paths] of Object.entries(data.manualOrder)) {
      await saveManualOrder(data.tree.path, parent, paths as string[]);
    }
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return navigator.storage.persist();
  }
  return false;
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  }
  return null;
}
