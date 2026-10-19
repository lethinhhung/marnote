import { useCallback, useState } from "react";
import { createFile, createFolder, deleteFile, listWorkspace, moveFile, openDefaultWorkspace, openWorkspace, readFile, renameWorkspaceTag, saveWorkspaceTags, updateEntryMetadata, writeFile } from "../../platform/workspace";
import type { UpdateEntryMetadataInput } from "../../platform/workspace";
import type { Entry, WorkspaceTree } from "./workspaceTypes";
import { loadRecentWorkspaces, rememberRecentWorkspace } from "./recentWorkspaces";
import { isSameOrDescendant, rebasePath } from "./workspacePaths";
import { saveWorkspace } from "./saveWorkspace";

export function useWorkspace() {
  const [tree, setTree] = useState<WorkspaceTree | null>(null);
  const [note, setNote] = useState<{ path: string; content: string } | null>(null);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<string[]>(loadRecentWorkspaces);
  const run = useCallback(async (task: () => Promise<void>) => { try { setError(""); await task(); } catch (e) { setError(String(e)); } }, []);
  const remember = (path: string) => setRecent(current => rememberRecentWorkspace(current, path));
  const open = (path: string) => run(async () => { setTree(await openWorkspace(path)); setNote(null); remember(path); });
  const openDefault = () => run(async () => { setTree(await openDefaultWorkspace()); setNote(null); });
  const select = (entry: Entry) => run(async () => { if (!tree) return; const result = await readFile(tree.path, entry.path); setNote({ path: result.path, content: result.content }); });
  const save = async (path: string, content: string, expected: string): Promise<boolean> => {
    if (!tree) return false;
    try {
      setError("");
      const result = await saveWorkspace(writeFile, tree.path, path, content, expected);
      if (!result.ok) { setError(String(result.error)); return false; }
      setNote(current => current?.path === path ? { path, content } : current);
      return true;
    } catch (e) { setError(String(e)); return false; }
  };
  const acceptExternal = (path: string, content: string) => setNote(current => current?.path === path ? { path, content } : current);
  const rebaseNote = (source: string, destination: string) => setNote(current => {
    if (!current) return current;
    const path = rebasePath(current.path, source, destination);
    return path === current.path ? current : { ...current, path };
  });
  const dropNote = (root: string) => setNote(current => current && isSameOrDescendant(current.path, root) ? null : current);
  const refresh = async () => { if (tree) await run(async () => setTree(await listWorkspace(tree.path))); };
  const mutate = (task: () => Promise<void>) => run(async () => { await task(); await refresh(); });
  const renameOrMove = (p: string, n: string) => mutate(async () => { if (tree) await moveFile(tree.path, p, n); rebaseNote(p, n); });
  const move = async (source: string, destination: string) => {
    if (!tree) return false;
    setError("");
    try { await moveFile(tree.path, source, destination); }
    catch (e) { setError(String(e)); return false; }
    rebaseNote(source, destination);
    try { setTree(await listWorkspace(tree.path)); } catch (e) { setError(String(e)); }
    return true;
  };
  const remove = (p: string) => mutate(async () => { if (tree) await deleteFile(tree.path, p); dropNote(p); });
  const create = (path: string) => run(async () => {
    if (!tree) return;
    await createFile(tree.path, path);
    const created = await readFile(tree.path, path);
    setTree(await listWorkspace(tree.path));
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
  const clearNote = () => setNote(null);
  return { tree, note, error, setError, open, openDefault, recent, select, clearNote, save, acceptExternal, refresh, create, createDirectory, updateMetadata, updateTagColor, editTag, rename: renameOrMove, move, remove };
}
