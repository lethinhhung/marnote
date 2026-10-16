import { useState, type FormEvent } from "react";
import { FolderOpen, FilePlus, Pencil, Trash2 } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { FileTree } from "./FileTree";
import type { Entry, WorkspaceTree } from "./workspaceTypes";

type Props = { tree: WorkspaceTree | null; selected: string; onOpen: (path: string) => void; onSelect: (e: Entry) => void; onCreate: (p: string) => void; onRename: (p: string, n: string) => void; onDelete: (p: string) => void };
export function WorkspaceSidebar(props: Props) {
  const { tree } = props;
  const [browseError, setBrowseError] = useState("");
  const [creating, setCreating] = useState(false);
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
    props.onCreate(name.endsWith(".md") ? name : `${name}.md`);
    setCreating(false);
  };
  const rename = () => {
    if (!props.selected) return;
    const next = window.prompt("Rename or move to a workspace-relative path", props.selected);
    if (!next?.trim() || next === props.selected) return;
    props.onRename(props.selected, next.trim());
  };
  return <aside className="sidebar">
    <form className="workspace-open" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); props.onOpen(String(data.get("path") || "")); }}>
      <label htmlFor="workspace-path">Workspace folder</label><input id="workspace-path" name="path" defaultValue={tree?.path || ""} placeholder="/path/to/folder" />
      <button className="open-workspace" type="button" onClick={() => void browse()}><FolderOpen size={14} /> Browse folders…</button>
      <button className="open-workspace" type="submit"><FolderOpen size={14} /> Open folder</button>
      {browseError && <p className="sidebar-error" role="alert">{browseError}</p>}
    </form>
    {tree && <><div className="sidebar-heading"><span>{tree.name}</span><div><button title="New Markdown note" aria-label="New Markdown note" onClick={() => setCreating(value => !value)}><FilePlus size={15} /></button><button title="Rename / move selected" onClick={rename} disabled={!props.selected}><Pencil size={14} /></button><button title="Move selected to trash" onClick={() => props.selected && window.confirm("Move this file to the workspace trash?") && props.onDelete(props.selected)} disabled={!props.selected}><Trash2 size={14} /></button></div></div>{creating && <form className="new-note-form" onSubmit={create}><label htmlFor="new-note-path">New Markdown note</label><input id="new-note-path" name="new-note-path" autoFocus placeholder="Notes/Untitled.md" /><div><button type="button" onClick={() => setCreating(false)}>Cancel</button><button type="submit">Create note</button></div></form>}<FileTree entries={tree.entries} selected={props.selected} onOpen={props.onSelect} /></>}
    {!tree && <p className="sidebar-empty">Open a folder to browse Markdown files.</p>}
  </aside>;
}
