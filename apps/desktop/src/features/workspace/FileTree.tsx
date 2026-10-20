import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronDown, ChevronRight, File, FileText, Folder, Star } from "lucide-react";
import type { Entry } from "./workspaceTypes";
import { TreeEditor } from "./TreeEditor";
import { visibleEntries } from "./treeVisibility";
import { parentPath } from "./workspacePaths";
import { tagStyle } from "../../shared/ui/tagStyle";
import { requestTagEdit } from "../../shared/ui/tagEditRequest";

function formatTimestamp(ms?: number): string | null {
  if (!ms) return null;
  const date = new Date(ms);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export type TreeEdit = { kind: "note" | "folder" | "rename-note" | "rename-folder"; path: string; value: string };
type Props = { entries: Entry[]; selected: string; selectedFolder: string; focus: "note" | "folder"; hideFoldersWithoutNotes: boolean; edit: TreeEdit | null; tagColors?: Record<string, string>; onEditSubmit: (name: string) => void; onEditCancel: () => void; onOpen: (entry: Entry) => void; onFolderSelect: (path: string) => void; onEntryContext: (path: string, kind: "note" | "folder" | "root", x: number, y: number) => void; onMove: (source: string, destination: string) => Promise<boolean> };
type Drag = { path: string; x: number; y: number; moved: boolean };

export function FileTree(props: Props) {
  const [dragging, setDragging] = useState("");
  const [expanded, setExpanded] = useState(() => new Set(props.entries.filter(entry => entry.kind === "directory").map(entry => entry.path)));
  const drag = useRef<Drag | null>(null);
  const skipClick = useRef(false);
  useEffect(() => {
    if (!props.edit) return;
    const target = props.edit.kind.startsWith("rename") ? props.edit.path : props.edit.path.replace(/\/$/, "");
    const parts = target.split("/").filter(Boolean);
    const ancestors = props.edit.kind.startsWith("rename") ? parts.slice(0, -1) : parts;
    setExpanded(current => { const next = new Set(current); ancestors.forEach((_, index) => next.add(ancestors.slice(0, index + 1).join("/"))); return next; });
  }, [props.edit]);
  useEffect(() => {
    if (!props.selectedFolder) return;
    const parts = props.selectedFolder.split("/").filter(Boolean);
    setExpanded(current => { const next = new Set(current); parts.forEach((_, index) => next.add(parts.slice(0, index + 1).join("/"))); return next; });
  }, [props.selectedFolder]);
  useEffect(() => {
    const finish = async (event: globalThis.PointerEvent) => {
      const active = drag.current;
      if (!active) return;
      drag.current = null;
      setDragging("");
      if (!active.moved) return;
      skipClick.current = true;
      window.setTimeout(() => { skipClick.current = false; }, 0);
      const tree = document.querySelector(".file-tree");
      const bounds = tree?.getBoundingClientRect();
      if (!bounds || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return;
      const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>(".tree-item");
      const kind = row?.dataset.kind;
      const path = row?.dataset.path || "";
      const folder = kind === "directory" ? path : parentPath(path);
      const name = active.path.split("/").pop() || "";
      const destination = [folder, name].filter(Boolean).join("/");
      if (destination && destination !== active.path && path !== active.path && !folder.startsWith(`${active.path}/`)) {
        if (folder) setExpanded(current => new Set(current).add(folder));
        await props.onMove(active.path, destination);
      }
    };
    const move = (event: globalThis.PointerEvent) => {
      if (!drag.current) return;
      if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 5) {
        drag.current.moved = true;
        setDragging(drag.current.path);
      }
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("pointermove", move);
    return () => { window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish); window.removeEventListener("pointermove", move); };
  }, [props.onMove]);
  const start = (path: string, event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    skipClick.current = false;
    drag.current = { path, x: event.clientX, y: event.clientY, moved: false };
  };
  const click = (entry: Entry) => {
    if (skipClick.current) { skipClick.current = false; return; }
    if (entry.kind === "directory") props.onFolderSelect(entry.path);
    else props.onOpen(entry);
  };
  const entries = visibleEntries(props.entries, props.hideFoldersWithoutNotes);
  const editor = props.edit;
  return <ul className="file-tree" onContextMenu={event => { if ((event.target as HTMLElement).closest(".tree-item")) return; event.preventDefault(); props.onEntryContext("", "root", event.clientX, event.clientY); }}>{editor && (editor.kind === "note" || editor.kind === "folder") && !editor.path && <li><TreeEditor kind={editor.kind} value={editor.value} depth={0} onSubmit={props.onEditSubmit} onCancel={props.onEditCancel} /></li>}{entries.map(entry => <TreeRow key={entry.path} entry={entry} tagColors={props.tagColors ?? {}} selected={props.selected} selectedFolder={props.selectedFolder} focus={props.focus} dragging={dragging} expanded={expanded} onExpanded={setExpanded} depth={0} onStart={start} onClick={click} onEntryContext={props.onEntryContext} edit={editor} onEditSubmit={props.onEditSubmit} onEditCancel={props.onEditCancel} />)}</ul>;
}

function TreeRow({ entry, selected, selectedFolder, focus, dragging, expanded, onExpanded, depth, onStart, onClick, onEntryContext, edit, onEditSubmit, onEditCancel, tagColors }: { entry: Entry; selected: string; selectedFolder: string; focus: "note" | "folder"; dragging: string; expanded: Set<string>; onExpanded: (update: (current: Set<string>) => Set<string>) => void; depth: number; onStart: (path: string, event: PointerEvent<HTMLButtonElement>) => void; onClick: (entry: Entry) => void; onEntryContext: Props["onEntryContext"]; edit: TreeEdit | null; onEditSubmit: (name: string) => void; onEditCancel: () => void; tagColors: Record<string, string> }) {
  const folder = entry.kind === "directory";
  const isExpanded = expanded.has(entry.path);
  const selectedClass = folder ? focus === "folder" && selectedFolder === entry.path ? "selected-folder" : "" : focus === "note" && selected === entry.path ? "selected" : "";
  const meta = entry.metadata;
  const tags = meta?.tags && meta.tags.length > 0 ? meta.tags : null;
  const folderCreated = folder && meta?.createdMs ? formatTimestamp(meta.createdMs) : null;
  const folderUpdated = folder && meta?.updatedMs ? formatTimestamp(meta.updatedMs) : null;
  return <li>
    {edit?.path === entry.path ? <TreeEditor kind={folder ? "folder" : "note"} value={edit.value} depth={depth} onSubmit={onEditSubmit} onCancel={onEditCancel} /> : <button data-kind={entry.kind} data-path={entry.path} className={`tree-item ${selectedClass} ${dragging === entry.path ? "dragging" : ""}`} style={{ paddingLeft: 6 }} onPointerDown={event => { if (event.button !== 0) { event.preventDefault(); return; } onStart(entry.path, event); }} onContextMenu={event => { event.preventDefault(); event.stopPropagation(); onEntryContext(entry.path, folder ? "folder" : "note", event.clientX, event.clientY); }} onClick={() => { if (folder) onExpanded(current => { const next = new Set(current); if (next.has(entry.path)) next.delete(entry.path); else next.add(entry.path); return next; }); onClick(entry); }} title={[entry.path, folderCreated && `Created ${folderCreated}`, folderUpdated && `Updated ${folderUpdated}`].filter(Boolean).join("\n")}>
      {folder ? isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} /> : <span className="tree-indent" />}
      {entry.metadata?.icon ? <span className="tree-icon-emoji" style={{ fontSize: 14 }}>{entry.metadata.icon}</span> : folder ? <Folder size={14} /> : entry.isEmpty ? <File size={14} /> : <FileText size={14} />}
      <span className="tree-item-name">{entry.name}</span>
      {tags && <span className="tree-folder-tags">{tags.map(tag => { const color = tagColors[tag] ?? "#526b58"; return <span key={tag} role="button" tabIndex={0} className="tree-folder-tag" style={tagStyle(color)} onClick={event => { event.stopPropagation(); requestTagEdit(tag); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); requestTagEdit(tag); } }} title={`Edit ${tag}`}>#{tag}</span>; })}</span>}
      {(folderCreated || folderUpdated) && <span className="tree-folder-timestamps" aria-hidden="true">{folderCreated && <span className="tree-folder-timestamp">{folderCreated}</span>}{folderUpdated && <span className="tree-folder-timestamp">{folderUpdated}</span>}</span>}
      {entry.metadata?.favorite && <Star size={12} fill="currentColor" className="tree-favorite" data-testid="tree-favorite" />}
    </button>}
    {folder && isExpanded && (!!entry.children?.length || edit?.path === `${entry.path}/`) && <ul className="tree-children">{entry.children?.map(child => <TreeRow key={child.path} entry={child} tagColors={tagColors} selected={selected} selectedFolder={selectedFolder} focus={focus} dragging={dragging} expanded={expanded} onExpanded={onExpanded} depth={depth + 1} onStart={onStart} onClick={onClick} onEntryContext={onEntryContext} edit={edit} onEditSubmit={onEditSubmit} onEditCancel={onEditCancel} />)}{edit?.path === `${entry.path}/` && <li><TreeEditor kind={edit.kind === "note" ? "note" : "folder"} value={edit.value} depth={depth + 1} onSubmit={onEditSubmit} onCancel={onEditCancel} /></li>}</ul>}
  </li>;
}
