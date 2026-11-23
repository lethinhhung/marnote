import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, Home } from "lucide-react";
import type { UpdateEntryMetadataInput } from "../../../platform/workspace";
import { FileTree, type TreeEdit } from "../tree/FileTree";
import type { Entry, WorkspaceTree } from "../workspaceTypes";
import { uniqueCreatePath } from "../uniqueCreatePath";
import { useSearchExplorerActions } from "./useSearchExplorerActions";
import { MoveEntryDialog } from "./MoveEntryDialog";
import { TrashDialog } from "./TrashDialog";
import { FolderContextMenu } from "./FolderContextMenu";
import { SidebarTreeHeader } from "./SidebarTreeHeader";
import type { TrashItem } from "../../../platform/workspace";
import type { ExplorerSort } from "../sortEntries";
import "../../../shared/theme/sidebar-reference.css";

type Props = { tree: WorkspaceTree | null; selected: string; recent: string[]; width: number; collapsed: boolean; peekOpen: boolean; trash: TrashItem[]; onListTrash: () => void; onRestoreTrash: (id: string) => void; onEmptyTrash: () => void; onDefault: () => void; onOpen: (path: string) => void; onSelect: (e: Entry) => void; onTargetChange?: (path: string, kind: "note" | "folder") => void; onCreate: (p: string) => void; onCreateFolder: (p: string) => void; onRename: (p: string, n: string) => void; onDelete: (p: string) => void; onMove: (source: string, destination: string) => Promise<boolean>; onReorder: (parent: string, paths: string[]) => Promise<boolean>; onUpdateMetadata?: (path: string, metadata: UpdateEntryMetadataInput) => void };

function RecentWorkspaces({ tree, recent, onOpen }: { tree: WorkspaceTree | null; recent: string[]; onOpen: (path: string) => void }) {
  if (!recent.length) return null;
  return <div className="sidebar-workspaces"><label className="recent-workspaces"><span>Recent Workspaces</span><span className="recent-workspace-select"><select aria-label="Switch workspace" value={tree?.path || ""} onChange={e => e.target.value && onOpen(e.target.value)}>{tree && <option value={tree.path}>{tree.name}</option>}{recent.filter(p => p !== tree?.path).map(path => <option key={path} value={path}>{path.split(/[\\/]/).filter(Boolean).pop()}</option>)}</select><ChevronsUpDown size={14} aria-hidden="true" /></span></label></div>;
}

const StorageNotice = () => <p className="sidebar-empty">Workspace data is stored in this browser profile\u2019s site data. You can clear it in your browser\u2019s site data settings.</p>;
const EmptyState = ({ tree, hidden }: { tree: WorkspaceTree | null; hidden: boolean }) => hidden ? null : tree ? null : <p className="sidebar-empty">Your notes and folders will appear here.</p>;

function findEntry(entries: Entry[], path: string): Entry | undefined {
  for (const e of entries) { if (e.path === path) return e; const c = e.children && findEntry(e.children, path); if (c) return c; }
}

export function WorkspaceSidebar(props: Props) {
  const { tree } = props;
  const ref = useRef<HTMLElement>(null);
  const [edit, setEdit] = useState<TreeEdit | null>(null);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [folderMenu, setFolderMenu] = useState<{ path: string; kind: "note" | "folder" | "root"; x: number; y: number } | null>(null);
  const [movePath, setMovePath] = useState("");
  const [trashOpen, setTrashOpen] = useState(false);
  const [treeFocus, setTreeFocus] = useState<"note" | "folder" | "none">("note");
  const [hideFolders, setHideFolders] = useState(false);
  const [sort, setSort] = useState<ExplorerSort>("name");

  useEffect(() => { setTreeFocus("note"); props.onTargetChange?.(props.selected, "note"); }, [props.selected]);
  useEffect(() => { const r = () => { setTreeFocus("note"); props.onTargetChange?.(props.selected, "note"); }; document.addEventListener("marnote-focus-note", r); return () => document.removeEventListener("marnote-focus-note", r); }, [props.selected]);
  useEffect(() => { if (!folderMenu) return; const t = document.querySelector<HTMLButtonElement>(`.tree-item[data-path="${CSS.escape(folderMenu.path)}"]`); document.querySelector<HTMLButtonElement>(".folder-context-menu button")?.focus(); const c = (e: PointerEvent) => { if ((e.target as HTMLElement).closest?.(".emoji-picker-popover")) return; setFolderMenu(null); }; const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setFolderMenu(null); t?.focus(); } }; document.addEventListener("pointerdown", c); document.addEventListener("keydown", k); return () => { document.removeEventListener("pointerdown", c); document.removeEventListener("keydown", k); }; }, [folderMenu]);

  const selectFolder = (path: string) => { setSelectedFolder(path); setTreeFocus("folder"); props.onTargetChange?.(path, "folder"); };
  const clearTreeFocus = () => { setTreeFocus("none"); props.onTargetChange?.("", "folder"); };
  useEffect(() => { const n = (e: Event) => { const p = (e as CustomEvent<string>).detail; if (typeof p === "string") selectFolder(p); }; document.addEventListener("marnote-navigate-folder", n); return () => document.removeEventListener("marnote-navigate-folder", n); }, []);
  const selectNote = (e: Entry) => { setTreeFocus("note"); props.onTargetChange?.(e.path, "note"); props.onSelect(e); };

  const ff = treeFocus === "folder" && !!selectedFolder;
  const aPath = ff ? selectedFolder : props.selected;
  const aLabel = ff ? "folder" : "note";
  const nParent = ff ? selectedFolder : props.selected.split("/").slice(0, -1).join("/");

  const beginCreate = (k: "note" | "folder", p = selectedFolder) => setEdit({ kind: k, path: p ? `${p}/` : "", value: k === "note" ? "Untitled" : "New folder" });
  const beginCreateNote = () => beginCreate("note", nParent);
  useEffect(() => { const cn = () => setEdit({ kind: "note", path: nParent ? `${nParent}/` : "", value: "Untitled" }); document.addEventListener("marnote-create-note", cn); return () => document.removeEventListener("marnote-create-note", cn); }, [nParent]);
  const beginRename = (p = aPath, f = ff) => { if (p) setEdit({ kind: f ? "rename-folder" : "rename-note", path: p, value: p.split("/").pop() || p }); };

  useSearchExplorerActions({ setEdit, setSelectedFolder, setTreeFocus, setHideFolders, selected: props.selected, selectedFolder, onDelete: props.onDelete, onTargetChange: props.onTargetChange });

  const saveEdit = (name: string) => { if (!edit) return; if (edit.kind.startsWith("rename")) { const p = edit.path.split("/").slice(0, -1).join("/"); const n = [p, name].filter(Boolean).join("/"); props.onRename(edit.path, edit.kind === "rename-note" && !n.toLowerCase().endsWith(".md") ? `${n}.md` : n); } else { const p = [edit.path.replace(/\/$/, ""), name].filter(Boolean).join("/"); if (edit.kind === "note") props.onCreate(uniqueCreatePath(tree?.entries ?? [], p.toLowerCase().endsWith(".md") ? p : `${p}.md`)); else props.onCreateFolder(uniqueCreatePath(tree?.entries ?? [], p)); } setEdit(null); };

  const hidden = props.collapsed && !props.peekOpen;
  useEffect(() => { ref.current?.toggleAttribute("inert", hidden); }, [hidden]);
  useEffect(() => { if (hidden) { setTrashOpen(false); setMovePath(""); } }, [hidden]);

  function TreeSection() {
    if (!tree) return null;
    return <section className="sidebar-tree-section"><SidebarTreeHeader treeName={tree.name} sort={sort} onSortChange={setSort} hideFoldersWithoutNotes={hideFolders} onToggleHideFolders={() => setHideFolders(v => !v)} onCreateNote={beginCreateNote} onCreateFolder={() => beginCreate("folder")} onRename={beginRename} onDelete={() => { if (!aPath) return; const i = ff ? "folder and all its contents" : "note"; if (window.confirm(`Move this ${i} to the workspace trash?`)) { props.onDelete(aPath); if (ff) { setSelectedFolder(""); setTreeFocus("note"); } } }} actionLabel={aLabel} actionPath={aPath} isDesktop={false} /><FileTree entries={tree.entries} manualOrder={tree.manualOrder ?? {}} sort={sort} tagColors={tree.tags} selected={props.selected} selectedFolder={selectedFolder} focus={treeFocus} hideFoldersWithoutNotes={hideFolders} edit={edit} onEditSubmit={saveEdit} onEditCancel={() => setEdit(null)} onOpen={selectNote} onFolderSelect={selectFolder} onClearFocus={clearTreeFocus} onEntryContext={(p: string, k: "note" | "folder" | "root", x: number, y: number) => { if (k === "folder") selectFolder(p); if (k === "note") { setTreeFocus("note"); props.onTargetChange?.(p, "note"); } setFolderMenu({ path: p, kind: k, x: Math.max(8, Math.min(x, window.innerWidth - 200)), y: Math.max(8, Math.min(y, window.innerHeight - 180)) }); }} onMove={props.onMove} onReorder={props.onReorder} />{folderMenu && <FolderContextMenu folderMenu={folderMenu} tree={tree.entries} onUpdateMetadata={props.onUpdateMetadata ?? (() => {})} onClose={() => setFolderMenu(null)} onCreateNote={(p) => { setSelectedFolder(p); setTreeFocus(p ? "folder" : "note"); beginCreate("note", p); }} onCreateFolder={(p) => { setSelectedFolder(p); setTreeFocus(p ? "folder" : "note"); beginCreate("folder", p); }} onRename={(p, f) => { if (f) { setSelectedFolder(p); setTreeFocus("folder"); } else { setTreeFocus("note"); } beginRename(p, f); }} onMove={(p) => { setMovePath(p); }} onDelete={(p) => { props.onDelete(p); if (selectedFolder === p || selectedFolder.startsWith(`${p}/`)) { setSelectedFolder(""); setTreeFocus("note"); } }} />}</section>;
  }

  return <aside ref={ref} id="workspace-explorer" className={`sidebar${props.peekOpen ? " explorer-peek" : ""}`} aria-label="Explorer" aria-hidden={hidden} style={hidden ? { width: 0, flexBasis: 0, padding: 0, borderWidth: 0 } : { width: props.width, flexBasis: props.width, ["--explorer-width" as string]: `${props.width}px` }}><div className="sidebar-content"><button className="default-workspace" type="button" onClick={props.onDefault}><Home size={16} /> <span>My Notes</span></button><RecentWorkspaces tree={tree} recent={props.recent} onOpen={props.onOpen} /><StorageNotice /><TreeSection /><EmptyState tree={tree} hidden={hidden} />{movePath && tree && <MoveEntryDialog entries={tree.entries} path={movePath} folder={findEntry(tree.entries, movePath)?.kind === "directory"} onMove={props.onMove} onClose={() => setMovePath("")} />}{trashOpen && <TrashDialog items={props.trash} load={props.onListTrash} restore={props.onRestoreTrash} empty={props.onEmptyTrash} close={() => setTrashOpen(false)} />}</div></aside>;
}