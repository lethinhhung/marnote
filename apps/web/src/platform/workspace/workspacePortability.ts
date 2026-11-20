import { normalizeWorkspacePath } from "@marnote/core";
import { getDB } from "./db";
import { QuotaExceededError, isQuotaError } from "./quota";
import { getWorkspaceTree, saveWorkspaceTree, putFile, listFiles, listTrash } from "../workspace";

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
    files: files.map((f: { path: string; content: string; modifiedMs: number }) => ({ path: f.path, content: f.content, modifiedMs: f.modifiedMs })),
    trash: trash.map((t: { id: string; path: string; kind: "file" | "directory"; restorable: boolean }) => t),
    tags: tagsRecord?.tags ?? {},
    manualOrder: Object.fromEntries(orderRecords.map((r: { parent: string; paths: string[] }) => [r.parent, r.paths])),
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

async function saveWorkspaceTags(
  workspaceId: string,
  tags: Record<string, string>
): Promise<void> {
  const db = await getDB();
  const id = `${workspaceId}:tags`;
  try {
    await db.put("tags", { id, workspaceId, tags });
  } catch (error) {
    if (isQuotaError(error)) {
      throw new QuotaExceededError("Failed to save tags: storage quota exceeded");
    }
    throw error;
  }
}

async function saveManualOrder(
  workspaceId: string,
  parent: string,
  paths: string[]
): Promise<void> {
  const db = await getDB();
  const id = `${workspaceId}:${parent}`;
  try {
    await db.put("manualOrder", { id, workspaceId, parent, paths });
  } catch (error) {
    if (isQuotaError(error)) {
      throw new QuotaExceededError("Failed to save manual order: storage quota exceeded");
    }
    throw error;
  }
}