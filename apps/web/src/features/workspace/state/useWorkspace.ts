import { useCallback, useState } from "react";
import {
  createFile,
  createFolder,
  deleteFile,
  emptyTrash as emptyTrashApi,
  listTrash,
  moveFile,
  openDefaultWorkspace,
  readFile,
  renameWorkspaceTag,
  restoreTrash,
  saveManualOrder,
  saveWorkspaceTags,
  updateEntryMetadata,
  writeFile,
  exportWorkspace,
  importWorkspace,
  requestPersistentStorage,
  getStorageEstimate,
} from "../../../platform/workspace";
import type { UpdateEntryMetadataInput } from "../../../platform/workspace";
import type { Entry, WorkspaceTree } from "../workspaceTypes";
import { saveWorkspace } from "./saveWorkspace";
import { updateSavedEntry, updateEntryEmptiness } from "./workspaceEntries";
import { isSameOrDescendant, rebasePath } from "./workspacePaths";
import type { TrashItem } from "../../../platform/workspace";

export function useWorkspace() {
  const [tree, setTree] = useState<WorkspaceTree | null>(null);
  const [note, setNote] = useState<{ path: string; content: string } | null>(null);
  const [error, setError] = useState("");
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const run = useCallback(async (task: () => Promise<void>) => {
    try {
      setError("");
      await task();
    } catch (e) {
      setError(String(e));
    }
  }, []);
  const open = (_target?: string) => run(async () => { setTree(await openDefaultWorkspace()); setNote(null); });
  const openDefault = () => run(async () => {
    const workspace = await openDefaultWorkspace();
    setTree(workspace);
    setNote(null);
  });
  const openLastOrDefault = () => run(async () => {
    const fallback = await openDefaultWorkspace();
    setTree(fallback);
    setNote(null);
    await requestPersistentStorage();
  });
  const select = (entry: Entry) => run(async () => { if (!tree) return; const result = await readFile(tree.path, entry.path); setNote({ path: result.path, content: result.content }); });
  const save = async (path: string, content: string, expected: string): Promise<boolean> => {
    if (!tree) return false;
    try {
      setError("");
      const result = await saveWorkspace(writeFile, tree.path, path, content, expected);
      if (!result.ok) { setError(String(result.error)); return false; }
      setTree(current => current ? { ...current, entries: updateSavedEntry(current.entries, path, content.length === 0, Date.now()) } : current);
      setNote(current => current?.path === path ? { path, content } : current);
      return true;
    } catch (e) { setError(String(e)); return false; }
  };
  const acceptExternal = (path: string, content: string) => {
    setTree(current => current ? { ...current, entries: updateEntryEmptiness(current.entries, path, content.length === 0) } : current);
    setNote(current => current?.path === path ? { path, content } : current);
  };
  const rebaseNote = (source: string, destination: string) => setNote(current => {
    if (!current) return current;
    const path = rebasePath(current.path, source, destination);
    return path === current.path ? current : { ...current, path };
  });
  const dropNote = (root: string) => setNote(current => current && isSameOrDescendant(current.path, root) ? null : current);
  const refresh = async () => { if (tree) await run(async () => setTree(await openDefaultWorkspace())); };
  const mutate = (task: () => Promise<void>) => run(async () => { await task(); await refresh(); });
  const renameOrMove = (p: string, n: string) => mutate(async () => { if (tree) await moveFile(tree.path, p, n); rebaseNote(p, n); });
  const move = async (source: string, destination: string) => {
    if (!tree) return false;
    setError("");
    try { await moveFile(tree.path, source, destination); }
    catch (e) { setError(String(e)); return false; }
    rebaseNote(source, destination);
    try { setTree(await openDefaultWorkspace()); } catch (e) { setError(String(e)); }
    return true;
  };
  const remove = (p: string) => mutate(async () => { if (tree) await deleteFile(tree.path, p); dropNote(p); });
  const refreshTrash = useCallback(async () => { setTrash([]); if (tree) try { setTrash(await listTrash(tree.path)); } catch (e) { setError(String(e)); } }, [tree?.path]);
  const restore = async (id: string) => { if (!tree) return; try { await restoreTrash(tree.path, id); await refresh(); await refreshTrash(); } catch (e) { setError(String(e)); } };
  const empty = async () => { if (!tree) return; try { await emptyTrashApi(tree.path); setTrash([]); } catch (e) { setError(String(e)); } };
  const create = (path: string) => run(async () => {
    if (!tree) return;
    const createdPath = await createFile(tree.path, path);
    const created = await readFile(tree.path, createdPath);
    setTree(await openDefaultWorkspace());
    setNote({ path: created.path, content: created.content });
  });
  const createDirectory = (path: string) => mutate(async () => {
    if (tree) await createFolder(tree.path, path);
  });
  const updateMetadata = (path: string, metadata: UpdateEntryMetadataInput) => mutate(async () => {
    if (tree) {
      await updateEntryMetadata(tree.path, path, metadata);
      if (metadata.tags) {
        const tags = { ...(tree.tags ?? {}) };
        metadata.tags.forEach(tag => { if (!tags[tag]) tags[tag] = "#74856b"; });
        await saveWorkspaceTags(tree.path, tags);
      }
    }
  });
  const updateTagColor = (name: string, color: string) => mutate(async () => {
    if (tree) await saveWorkspaceTags(tree.path, { ...(tree.tags ?? {}), [name]: color });
  });
  const editTag = (oldName: string, newName: string, color: string) => mutate(async () => {
    if (tree) await renameWorkspaceTag(tree.path, oldName, newName, color);
  });
  const reorder = async (parent: string, paths: string[]) => {
    if (!tree) return false;
    try { await saveManualOrder(tree.path, parent, paths); }
    catch (e) { setError(String(e)); return false; }
    try { setTree(await openDefaultWorkspace()); } catch (e) { setError(String(e)); }
    return true;
  };
  const clearNote = () => setNote(null);
  const exportWorkspaceData = async (): Promise<Blob> => {
    try {
      return await exportWorkspace();
    } catch (e) {
      setError(String(e));
      throw e;
    }
  };
  const importWorkspaceData = async (blob: Blob): Promise<void> => {
    try {
      await importWorkspace(blob);
      setTree(await openDefaultWorkspace());
      setNote(null);
      await refreshTrash();
    } catch (e) {
      setError(String(e));
      throw e;
    }
  };
  const requestPersistence = async (): Promise<boolean> => {
    return await requestPersistentStorage();
  };
  const getStorageInfo = async () => {
    return await getStorageEstimate();
  };
  return { tree, note, error, setError, open, openDefault, openLastOrDefault, recent: [], select, clearNote, save, acceptExternal, refresh, create, createDirectory, updateMetadata, updateTagColor, editTag, rename: renameOrMove, move, reorder, remove, trash, refreshTrash, restore, empty, exportWorkspace: exportWorkspaceData, importWorkspace: importWorkspaceData, requestPersistence, getStorageInfo };
}
