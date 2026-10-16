import { useEffect, useState, type FormEvent } from "react";
import { FolderOpen, Home, FilePlus, FolderPlus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { FileTree } from "./FileTree";
import type { Entry, WorkspaceTree } from "./workspaceTypes";

type Props = { tree: WorkspaceTree | null; selected: string; recent: string[]; onDefault: () => void; onOpen: (path: string) => void; onSelect: (e: Entry) => void; onCreate: (p: string) => void; onCreateFolder: (p: string) => void; onRename: (p: string, n: string) => void; onDelete: (p: string) => void; onMove: (source: string, destination: string) => Promise<boolean> };
export function WorkspaceSidebar(props: Props) {
  const { tree } = props;
  const [browseError, setBrowseError] = useState("");
  const [creating, setCreating] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [treeFocus, setTreeFocus] = useState<"note" | "folder">("note");
  const [hideFoldersWithoutNotes, setHideFoldersWithoutNotes] = useState(false);
  useEffect(() => setTreeFocus("note"), [props.selected]);
  useEffect(() => { const restoreNote = () => setTreeFocus("note"); document.addEventListener("marnote-focus-note", restoreNote); return () => document.removeEventListener("marnote-focus-note", restoreNote); }, []);
  const selectFolder = (path: string) => { setSelectedFolder(path); setTreeFocus("folder"); };
  const selectNote = (entry: Entry) => { setTreeFocus("note"); props.onSelect(entry); };
  const browse = async () => {
    setBrowseError("");
    if (!isTauri()) {
      setBrowseError("Folder browsing works in the Marnote desktop app. Start it with pnpm --filter @marnote/desktop desktop:dev.");
      return;
    }
    try {
      const path = await openDialog({ directory: true, multiple: false, defaultPath: tree?.path, title: "Open workspace folder" });
      if (typeof path === "string") props.onOpen(path);
    } catch (error) {
      setBrowseError(`Could not open folder picker: ${String(error)}`);
    }
  };
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("new-note-path") || "").trim().replace(/^\/+/, "");
    if (!name) return;
    const destination = selectedFolder && !name.startsWith(`${selectedFolder}/`) ? `${selectedFolder}/${name}` : name;
    props.onCreate(destination.endsWith(".md") ? destination : `${destination}.md`);
    setCreating(false);
  };
  const submitPath = (event: FormEvent<HTMLFormElement>, field: string, action: (path: string) => void) => {
    event.preventDefault();
    const path = String(new FormData(event.currentTarget).get(field) || "").trim().replace(/^\/+/, "");
    if (path) action(path);
    event.currentTarget.reset();
  };
  return <aside className="sidebar">
    <button className="default-workspace" type="button" onClick={props.onDefault}><Home size={14} /> My Notes</button>
    {props.recent.length > 0 && <label className="recent-workspaces">Recent workspaces<select aria-label="Switch workspace" value={tree?.path || ""} onChange={event => event.target.value && props.onOpen(event.target.value)}>{tree && <option value={tree.path}>{tree.name}</option>}{props.recent.filter(path => path !== tree?.path).map(path => <option key={path} value={path}>{path.split(/[\\/]/).filter(Boolean).pop()}</option>)}</select></label>}
    <div className="workspace-open">
      <button className="open-workspace" type="button" onClick={() => void browse()}><FolderOpen size={14} /> Open workspace…</button>
      {browseError && <p className="sidebar-error" role="alert">{browseError}</p>}
    </div>
    {tree && <><div className="sidebar-heading"><span>{tree.name}</span><div><button type="button" title={hideFoldersWithoutNotes ? "Show folders without notes" : "Hide folders without notes"} aria-label={hideFoldersWithoutNotes ? "Show folders without notes" : "Hide folders without notes"} aria-pressed={hideFoldersWithoutNotes} onClick={() => setHideFoldersWithoutNotes(value => !value)}>{hideFoldersWithoutNotes ? <EyeOff size={15} /> : <Eye size={15} />}</button><button title="New Markdown note" aria-label="New Markdown note" onClick={() => { setCreating(value => !value); setCreatingFolder(false); }}><FilePlus size={15} /></button><button title="New folder" aria-label="New folder" onClick={() => { setCreatingFolder(value => !value); setCreating(false); }}><FolderPlus size={15} /></button><button title="Rename / move selected" aria-label="Rename / move selected" onClick={() => setRenaming(value => !value)} disabled={!props.selected}><Pencil size={14} /></button><button title="Move selected to trash" aria-label="Move selected to trash" onClick={() => props.selected && window.confirm("Move this file to the workspace trash?") && props.onDelete(props.selected)} disabled={!props.selected}><Trash2 size={14} /></button></div></div>
      {creating && <form className="new-note-form" onSubmit={create}><label htmlFor="new-note-path">New Markdown note{selectedFolder ? ` in ${selectedFolder}` : " in workspace root"}</label><input id="new-note-path" name="new-note-path" autoFocus placeholder="Untitled.md" /><div><button type="button" onClick={() => setCreating(false)}>Cancel</button><button type="submit">Create note</button></div></form>}
      {creatingFolder && <form className="new-note-form" onSubmit={event => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get("new-folder-path") || "").trim().replace(/^\/+/, ""); if (name) props.onCreateFolder([selectedFolder, name].filter(Boolean).join("/")); event.currentTarget.reset(); }}><label htmlFor="new-folder-path">New folder{selectedFolder ? ` in ${selectedFolder}` : " in workspace root"}</label><input id="new-folder-path" name="new-folder-path" autoFocus placeholder="Folder name" /><div><button type="button" onClick={() => setCreatingFolder(false)}>Cancel</button><button type="submit">Create folder</button></div></form>}
      {renaming && <form className="new-note-form" onSubmit={event => { submitPath(event, "rename-path", path => props.onRename(props.selected, path.toLowerCase().endsWith(".md") ? path : `${path}.md`)); setRenaming(false); }}><label htmlFor="rename-path">Rename or move selected</label><input id="rename-path" name="rename-path" autoFocus defaultValue={props.selected} /><div><button type="button" onClick={() => setRenaming(false)}>Cancel</button><button type="submit">Rename</button></div></form>}
      <FileTree entries={tree.entries} selected={props.selected} selectedFolder={selectedFolder} focus={treeFocus} hideFoldersWithoutNotes={hideFoldersWithoutNotes} onOpen={selectNote} onFolderSelect={selectFolder} onMove={props.onMove} /></>}
    {!tree && <p className="sidebar-empty">Your notes and folders will appear here.</p>}
  </aside>;
}
