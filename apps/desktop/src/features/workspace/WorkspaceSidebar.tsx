import { useEffect, useRef, useState } from "react";
import { File, FilePlus, FileText, Folder, FolderOpen, FolderPlus, Home, Pencil, Trash2, Eye, EyeOff, Tag, Star, ChevronsUpDown } from "lucide-react";
import { isDesktop, openWorkspaceFolder } from "../../platform/dialog";
import type { UpdateEntryMetadataInput } from "../../platform/workspace";
import { FileTree, type TreeEdit } from "./FileTree";
import type { Entry, WorkspaceTree } from "./workspaceTypes";
import { EmojiPicker } from "../../shared/ui/EmojiPicker";
import { requestTagEdit } from "../../shared/ui/tagEditRequest";
import { uniqueCreatePath } from "./uniqueCreatePath";
import { useSearchExplorerActions } from "./useSearchExplorerActions";
import { MoveEntryDialog } from "./MoveEntryDialog";
import { TrashDialog } from "./TrashDialog";
import type { TrashItem } from "../../platform/workspace";
import type { ExplorerSort } from "./sortEntries";
import "../../shared/theme/sidebar-reference.css";
type Props = { tree: WorkspaceTree | null; selected: string; recent: string[]; width: number; collapsed: boolean; peekOpen: boolean; trash: TrashItem[]; onListTrash: () => void; onRestoreTrash: (id: string) => void; onEmptyTrash: () => void; onDefault: () => void; onOpen: (path: string) => void; onSelect: (e: Entry) => void; onTargetChange?: (path: string, kind: "note" | "folder") => void; onCreate: (p: string) => void; onCreateFolder: (p: string) => void; onRename: (p: string, n: string) => void; onDelete: (p: string) => void; onMove: (source: string, destination: string) => Promise<boolean>; onReorder: (parent: string, paths: string[]) => Promise<boolean>; onUpdateMetadata?: (path: string, metadata: UpdateEntryMetadataInput) => void };
export function WorkspaceSidebar(props: Props) {
  const { tree } = props;
  const sidebarRef = useRef<HTMLElement>(null);
  const [browseError, setBrowseError] = useState("");
  const [edit, setEdit] = useState<TreeEdit | null>(null);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [folderMenu, setFolderMenu] = useState<{ path: string; kind: "note" | "folder" | "root"; x: number; y: number } | null>(null);
  const [movePath, setMovePath] = useState("");
  const [trashOpen, setTrashOpen] = useState(false);
  const [treeFocus, setTreeFocus] = useState<"note" | "folder" | "none">("note");
  const [hideFoldersWithoutNotes, setHideFoldersWithoutNotes] = useState(false);
  const [sort, setSort] = useState<ExplorerSort>("name");
  useEffect(() => { setTreeFocus("note"); props.onTargetChange?.(props.selected, "note"); }, [props.selected]);
  useEffect(() => { const restoreNote = () => { setTreeFocus("note"); props.onTargetChange?.(props.selected, "note"); }; document.addEventListener("marnote-focus-note", restoreNote); return () => document.removeEventListener("marnote-focus-note", restoreNote); }, [props.selected]);
  useEffect(() => { if (!folderMenu) return; const trigger = document.querySelector<HTMLButtonElement>(`.tree-item[data-path="${CSS.escape(folderMenu.path)}"]`); document.querySelector<HTMLButtonElement>(".folder-context-menu button")?.focus(); const close = (event: PointerEvent) => { if ((event.target as HTMLElement).closest?.(".emoji-picker-popover")) return; setFolderMenu(null); }; const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setFolderMenu(null); trigger?.focus(); } }; document.addEventListener("pointerdown", close); document.addEventListener("keydown", key); return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); }; }, [folderMenu]);
  const selectFolder = (path: string) => { setSelectedFolder(path); setTreeFocus("folder"); props.onTargetChange?.(path, "folder"); };
  const clearTreeFocus = () => { setTreeFocus("none"); props.onTargetChange?.("", "folder"); };
  useEffect(() => { const navigate = (event: Event) => { const path = (event as CustomEvent<string>).detail; if (typeof path === "string") selectFolder(path); }; document.addEventListener("marnote-navigate-folder", navigate); return () => document.removeEventListener("marnote-navigate-folder", navigate); }, []);
  const selectNote = (entry: Entry) => { setTreeFocus("note"); props.onTargetChange?.(entry.path, "note"); props.onSelect(entry); };
  const menuEntry = (entries: Entry[], path: string): Entry | undefined => {
    for (const entry of entries) {
      if (entry.path === path) return entry;
      const child = entry.children && menuEntry(entry.children, path);
      if (child) return child;
    }
  };
  const updateMenuMetadata = (metadata: UpdateEntryMetadataInput) => {
    if (!folderMenu || !props.onUpdateMetadata) return;
    props.onUpdateMetadata(folderMenu.path, metadata);
    setFolderMenu(null);
  };
  const folderFocused = treeFocus === "folder" && !!selectedFolder;
  const actionPath = folderFocused ? selectedFolder : props.selected;
  const actionLabel = folderFocused ? "folder" : "note";
  const noteParent = folderFocused ? selectedFolder : props.selected.split("/").slice(0, -1).join("/");
  const browse = async () => {
    setBrowseError("");
    if (!isDesktop()) {
      setBrowseError("Folder browsing works in the Marnote desktop app. Start it with pnpm --filter @marnote/desktop desktop:dev.");
      return;
    }
    try {
      const path = await openWorkspaceFolder({ defaultPath: tree?.path, title: "Open workspace folder" });
      if (typeof path === "string") props.onOpen(path);
    } catch (error) {
      setBrowseError(`Could not open folder picker: ${String(error)}`);
    }
  };
  const beginCreate = (kind: "note" | "folder", parent = selectedFolder) => setEdit({ kind, path: parent ? `${parent}/` : "", value: kind === "note" ? "Untitled" : "New folder" });
  const beginCreateNote = () => beginCreate("note", noteParent);
  useEffect(() => {
    const createNote = () => setEdit({ kind: "note", path: noteParent ? `${noteParent}/` : "", value: "Untitled" });
    document.addEventListener("marnote-create-note", createNote);
    return () => document.removeEventListener("marnote-create-note", createNote);
  }, [noteParent]);
  const beginRename = (path = actionPath, folder = folderFocused) => { if (path) setEdit({ kind: folder ? "rename-folder" : "rename-note", path, value: path.split("/").pop() || path }); };
  useSearchExplorerActions({ setEdit, setSelectedFolder, setTreeFocus, setHideFolders: setHideFoldersWithoutNotes, selected: props.selected, selectedFolder, onDelete: props.onDelete, onTargetChange: props.onTargetChange });
  const saveEdit = (name: string) => {
    if (!edit) return;
    if (edit.kind.startsWith("rename")) {
      const parent = edit.path.split("/").slice(0, -1).join("/");
      const next = [parent, name].filter(Boolean).join("/");
      props.onRename(edit.path, edit.kind === "rename-note" && !next.toLowerCase().endsWith(".md") ? `${next}.md` : next);
    } else {
      const path = [edit.path.replace(/\/$/, ""), name].filter(Boolean).join("/");
      if (edit.kind === "note") props.onCreate(uniqueCreatePath(tree?.entries ?? [], path.toLowerCase().endsWith(".md") ? path : `${path}.md`));
      else props.onCreateFolder(uniqueCreatePath(tree?.entries ?? [], path));
    }
    setEdit(null);
  };
  const hidden = props.collapsed && !props.peekOpen;
  useEffect(() => { sidebarRef.current?.toggleAttribute("inert", hidden); }, [hidden]);
  useEffect(() => { if (hidden) { setTrashOpen(false); setMovePath(""); } }, [hidden]);
  return <aside ref={sidebarRef} id="workspace-explorer" className={`sidebar${props.peekOpen ? " explorer-peek" : ""}`} aria-label="Explorer" aria-hidden={hidden} style={hidden ? { width: 0, flexBasis: 0, padding: 0, borderWidth: 0 } : { width: props.width, flexBasis: props.width, ["--explorer-width" as string]: `${props.width}px` }}>
    <div className="sidebar-content">
    <button className="default-workspace" type="button" onClick={props.onDefault}><Home size={16} /> <span>My Notes</span></button>
    <div className="sidebar-workspaces">{props.recent.length > 0 && <label className="recent-workspaces"><span>Recent Workspaces</span><span className="recent-workspace-select"><select aria-label="Switch workspace" value={tree?.path || ""} onChange={event => event.target.value && props.onOpen(event.target.value)}>{tree && <option value={tree.path}>{tree.name}</option>}{props.recent.filter(path => path !== tree?.path).map(path => <option key={path} value={path}>{path.split(/[\\/]/).filter(Boolean).pop()}</option>)}</select><ChevronsUpDown size={14} aria-hidden="true" /></span></label>}
    <div className="workspace-open">
      <button className="open-workspace" type="button" onClick={() => void browse()}><FolderOpen size={14} /> Open workspace...</button>
      <button className="open-workspace" type="button" disabled={!tree} onClick={() => setTrashOpen(true)}><Trash2 size={14} /> Workspace trash</button>
      {browseError && <p className="sidebar-error" role="alert">{browseError}</p>}
    </div></div>
    {tree && <section className="sidebar-tree-section"><div className="sidebar-heading"><span>{tree.name}</span><div><select className="explorer-sort" aria-label="Sort Explorer" value={sort} onChange={event => setSort(event.target.value as ExplorerSort)}><option value="name">Name</option><option value="modified">Recently modified</option><option value="manual">Manual order</option></select><button type="button" title={hideFoldersWithoutNotes ? "Show folders without notes" : "Hide folders without notes"} aria-label={hideFoldersWithoutNotes ? "Show folders without notes" : "Hide folders without notes"} aria-pressed={hideFoldersWithoutNotes} onClick={() => setHideFoldersWithoutNotes(value => !value)}>{hideFoldersWithoutNotes ? <EyeOff size={15} /> : <Eye size={15} />}</button><button title="New Markdown note" aria-label="New Markdown note" onClick={beginCreateNote}><FilePlus size={15} /></button><button title="New folder" aria-label="New folder" onClick={() => beginCreate("folder")}><FolderPlus size={15} /></button><button title={`Rename / move selected ${actionLabel}`} aria-label={`Rename / move selected ${actionLabel}`} onClick={() => beginRename()} disabled={!actionPath}><Pencil size={14} /></button><button title={`Move selected ${actionLabel} to trash`} aria-label={`Move selected ${actionLabel} to trash`} onClick={() => { if (!actionPath) return; const item = folderFocused ? "folder and all its contents" : "note"; if (window.confirm(`Move this ${item} to the workspace trash?`)) { props.onDelete(actionPath); if (folderFocused) { setSelectedFolder(""); setTreeFocus("note"); } }} } disabled={!actionPath}><Trash2 size={14} /></button></div></div>
      <FileTree entries={tree.entries} manualOrder={tree.manualOrder ?? {}} sort={sort} tagColors={tree.tags} selected={props.selected} selectedFolder={selectedFolder} focus={treeFocus} hideFoldersWithoutNotes={hideFoldersWithoutNotes} edit={edit} onEditSubmit={saveEdit} onEditCancel={() => setEdit(null)} onOpen={selectNote} onFolderSelect={selectFolder} onClearFocus={clearTreeFocus} onEntryContext={(path, kind, x, y) => { if (kind === "folder") selectFolder(path); if (kind === "note") { setTreeFocus("note"); props.onTargetChange?.(path, "note"); } setFolderMenu({ path, kind, x: Math.max(8, Math.min(x, window.innerWidth - 200)), y: Math.max(8, Math.min(y, window.innerHeight - 180)) }); }} onMove={props.onMove} onReorder={props.onReorder} />
      {folderMenu && <div className="folder-context-menu" role="menu" style={{ left: folderMenu.x, top: folderMenu.y }} onPointerDown={event => event.stopPropagation()}>
        {folderMenu.kind !== "root" && props.onUpdateMetadata && <>
          <button role="menuitem" onClick={() => { const entry = menuEntry(tree?.entries ?? [], folderMenu.path); const value = window.prompt("Tags (comma separated)", entry?.metadata?.tags?.join(", ") ?? ""); if (value !== null) updateMenuMetadata({ tags: value.split(",").map(tag => tag.trim()).filter(Boolean) }); }}><Tag size={14} />Assign tags</button>
          {(menuEntry(tree?.entries ?? [], folderMenu.path)?.metadata?.tags ?? []).map(tag => <button key={tag} role="menuitem" onClick={() => { setFolderMenu(null); requestTagEdit(tag); }}><Pencil size={14} />Edit #{tag}</button>)}
          <span className="folder-emoji-action" onClick={event => { if ((event.target as HTMLElement).closest(".emoji-picker")) return; (event.currentTarget.querySelector(".emoji-picker > button") as HTMLButtonElement | null)?.click(); }}><EmojiPicker value={menuEntry(tree?.entries ?? [], folderMenu.path)?.metadata?.icon} label={`Choose ${folderMenu.kind} emoji`} fallback={folderMenu.kind === "folder" ? <Folder size={14} /> : menuEntry(tree?.entries ?? [], folderMenu.path)?.isEmpty ? <File size={14} /> : <FileText size={14} />} onChange={icon => updateMenuMetadata({ icon })} />Choose emoji icon</span>
          <button role="menuitem" onClick={() => { const entry = menuEntry(tree?.entries ?? [], folderMenu.path); updateMenuMetadata({ favorite: !entry?.metadata?.favorite }); }}><Star size={14} />{menuEntry(tree?.entries ?? [], folderMenu.path)?.metadata?.favorite ? "Remove favorite" : "Add favorite"}</button>
        </>}
        {folderMenu.kind !== "note" && <><button role="menuitem" onClick={() => { setSelectedFolder(folderMenu.path); setTreeFocus(folderMenu.path ? "folder" : "note"); beginCreate("note", folderMenu.path); setFolderMenu(null); }}><FilePlus size={15} />New note{folderMenu.path ? " here" : ""}</button>
        <button role="menuitem" onClick={() => { setSelectedFolder(folderMenu.path); setTreeFocus(folderMenu.path ? "folder" : "note"); beginCreate("folder", folderMenu.path); setFolderMenu(null); }}><FolderPlus size={15} />{folderMenu.path ? "New subfolder" : "New folder"}</button></>}
        {folderMenu.kind === "folder" && <button role="menuitem" onClick={() => { setSelectedFolder(folderMenu.path); setTreeFocus("folder"); beginRename(folderMenu.path, true); setFolderMenu(null); }}><Pencil size={14} />Rename</button>}
        {folderMenu.kind === "note" && <button role="menuitem" onClick={() => { setTreeFocus("note"); beginRename(folderMenu.path, false); setFolderMenu(null); }}><Pencil size={14} />Rename</button>}
        {folderMenu.kind !== "root" && <button role="menuitem" onClick={() => { setMovePath(folderMenu.path); setFolderMenu(null); }}><FolderPlus size={14} />Move to folder…</button>}
        {folderMenu.kind !== "root" && <button role="menuitem" className="danger" onClick={() => { const path = folderMenu.path; const kind = folderMenu.kind; setFolderMenu(null); const item = kind === "folder" ? "folder and all its contents" : "note"; if (window.confirm(`Move this ${item} to the workspace trash?`)) { props.onDelete(path); if (kind === "folder" && (selectedFolder === path || selectedFolder.startsWith(`${path}/`))) { setSelectedFolder(""); setTreeFocus("note"); } } }}><Trash2 size={14} />Move to trash</button>}
      </div>}</section>}
    {!tree && <p className="sidebar-empty">Your notes and folders will appear here.</p>}
    {movePath && tree && <MoveEntryDialog entries={tree.entries} path={movePath} folder={menuEntry(tree.entries, movePath)?.kind === "directory"} onMove={props.onMove} onClose={() => setMovePath("")} />}
    {trashOpen && <TrashDialog items={props.trash} load={props.onListTrash} restore={props.onRestoreTrash} empty={props.onEmptyTrash} close={() => setTrashOpen(false)} />}
    </div>
  </aside>;
}
