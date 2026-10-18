import { useCallback, useState } from "react";
import { createFile, createFolder, deleteFile, listWorkspace, moveFile, openDefaultWorkspace, openWorkspace, readFile, writeFile } from "../shared/workspaceApi";
import type { Entry, WorkspaceTree } from "../shared/workspaceTypes";

function loadRecent(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem("marnote-workspaces") || "[]");
    return Array.isArray(value) ? value.filter((path): path is string => typeof path === "string") : [];
  } catch { return []; }
}

export function useWorkspace() {
  const [tree, setTree] = useState<WorkspaceTree | null>(null);
  const [note, setNote] = useState<{ path: string; content: string } | null>(null);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const run = useCallback(async (task: () => Promise<void>) => { try { setError(""); await task(); } catch (e) { setError(String(e)); } }, []);
  const remember = (path: string) => setRecent(current => { const next = [path, ...current.filter(item => item !== path)].slice(0, 5); localStorage.setItem("marnote-workspaces", JSON.stringify(next)); return next; });
  const open = (path: string) => run(async () => { setTree(await openWorkspace(path)); setNote(null); remember(path); });
  const openDefault = () => run(async () => { setTree(await openDefaultWorkspace()); setNote(null); });
  const select = (entry: Entry) => run(async () => { if (!tree) return; const result = await readFile(tree.path, entry.path); setNote({ path: result.path, content: result.content }); });
  const save = async (path: string, content: string, expected: string): Promise<boolean> => {
    if (!tree) return false;
    try {
      setError("");
      await writeFile(tree.path, path, content, expected);
      setNote(current => current?.path === path ? { path, content } : current);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };
  const acceptExternal = (path: string, content: string) => setNote(current => current?.path === path ? { path, content } : current);
  const refresh = async () => { if (tree) await run(async () => setTree(await listWorkspace(tree.path))); };
  const mutate = (task: () => Promise<void>) => run(async () => { await task(); await refresh(); });
  const renameOrMove = (p: string, n: string) => mutate(async () => { if (tree) await moveFile(tree.path, p, n); setNote(current => current && (current.path === p || current.path.startsWith(`${p}/`)) ? { ...current, path: `${n}${current.path.slice(p.length)}` } : current); });
  const move = async (source: string, destination: string) => {
    if (!tree) return false;
    setError("");
    try { await moveFile(tree.path, source, destination); }
    catch (e) { setError(String(e)); return false; }
    setNote(current => current && (current.path === source || current.path.startsWith(`${source}/`)) ? { ...current, path: `${destination}${current.path.slice(source.length)}` } : current);
    try { setTree(await listWorkspace(tree.path)); } catch (e) { setError(String(e)); }
    return true;
  };
  const remove = (p: string) => mutate(async () => { if (tree) await deleteFile(tree.path, p); setNote(current => current && (current.path === p || current.path.startsWith(`${p}/`)) ? null : current); });
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
  return { tree, note, error, setError, open, openDefault, recent, select, save, acceptExternal, refresh, create, createDirectory, rename: renameOrMove, move, remove };
}
