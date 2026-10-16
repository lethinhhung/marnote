import { FolderOpen, FilePlus, Pencil, Trash2 } from "lucide-react";
import { FileTree } from "./FileTree";
import type { Entry, WorkspaceTree } from "./workspaceTypes";

type Props = { tree: WorkspaceTree | null; selected: string; onOpen: (path: string) => void; onSelect: (e: Entry) => void; onCreate: (p: string) => void; onRename: (p: string, n: string) => void; onDelete: (p: string) => void };
export function WorkspaceSidebar(props: Props) {
  const { tree } = props;
  const create = () => {
    if (!tree) return;
    const name = window.prompt("Workspace-relative Markdown path", "Untitled.md");
    if (!name?.trim()) return;
    const path = name.trim().replace(/^\/+/, "");
    props.onCreate(path.endsWith(".md") ? path : `${path}.md`);
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
      <button className="open-workspace" type="submit"><FolderOpen size={14} /> Open folder</button>
    </form>
    {tree && <><div className="sidebar-heading"><span>{tree.name}</span><div><button title="New Markdown note" onClick={create}><FilePlus size={15} /></button><button title="Rename / move selected" onClick={rename} disabled={!props.selected}><Pencil size={14} /></button><button title="Move selected to trash" onClick={() => props.selected && window.confirm("Move this file to the workspace trash?") && props.onDelete(props.selected)} disabled={!props.selected}><Trash2 size={14} /></button></div></div><FileTree entries={tree.entries} selected={props.selected} onOpen={props.onSelect} /></>}
    {!tree && <p className="sidebar-empty">Open a folder to browse Markdown files.</p>}
  </aside>;
}
