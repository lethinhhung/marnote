import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import type { Entry } from "./workspaceTypes";
import { TreeEditor } from "./TreeEditor";

export type TreeEdit = { kind: "note" | "folder" | "rename-note" | "rename-folder"; path: string; value: string };
type Props = { entries: Entry[]; selected: string; selectedFolder: string; focus: "note" | "folder"; hideFoldersWithoutNotes: boolean; edit: TreeEdit | null; onEditSubmit: (name: string) => void; onEditCancel: () => void; onOpen: (entry: Entry) => void; onFolderSelect: (path: string) => void; onFolderContext: (path: string, x: number, y: number) => void; onMove: (source: string, destination: string) => Promise<boolean> };
type Drag = { path: string; x: number; y: number; moved: boolean };

function containsNote(entry: Entry): boolean {
  return entry.kind === "file" ? entry.path.toLowerCase().endsWith(".md") : (entry.children || []).some(containsNote);
}

function visibleEntries(entries: Entry[], hideFoldersWithoutNotes: boolean): Entry[] {
  return entries.flatMap(entry => {
    if (entry.kind === "file") return [entry];
    const children = visibleEntries(entry.children || [], hideFoldersWithoutNotes);
    return hideFoldersWithoutNotes && !containsNote(entry) ? [] : [{ ...entry, children }];
  });
}

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
      const folder = kind === "directory" ? path : path.slice(0, path.lastIndexOf("/"));
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
  return <ul className="file-tree" onContextMenu={event => { if ((event.target as HTMLElement).closest(".tree-item")) return; event.preventDefault(); props.onFolderContext("", event.clientX, event.clientY); }}>{editor && (editor.kind === "note" || editor.kind === "folder") && !editor.path && <li><TreeEditor kind={editor.kind} value={editor.value} depth={0} onSubmit={props.onEditSubmit} onCancel={props.onEditCancel} /></li>}{entries.map(entry => <TreeRow key={entry.path} entry={entry} selected={props.selected} selectedFolder={props.selectedFolder} focus={props.focus} dragging={dragging} expanded={expanded} onExpanded={setExpanded} depth={0} onStart={start} onClick={click} onFolderContext={props.onFolderContext} edit={editor} onEditSubmit={props.onEditSubmit} onEditCancel={props.onEditCancel} />)}</ul>;
}

function TreeRow({ entry, selected, selectedFolder, focus, dragging, expanded, onExpanded, depth, onStart, onClick, onFolderContext, edit, onEditSubmit, onEditCancel }: { entry: Entry; selected: string; selectedFolder: string; focus: "note" | "folder"; dragging: string; expanded: Set<string>; onExpanded: (update: (current: Set<string>) => Set<string>) => void; depth: number; onStart: (path: string, event: PointerEvent<HTMLButtonElement>) => void; onClick: (entry: Entry) => void; onFolderContext: Props["onFolderContext"]; edit: TreeEdit | null; onEditSubmit: (name: string) => void; onEditCancel: () => void }) {
  const folder = entry.kind === "directory";
  const isExpanded = expanded.has(entry.path);
  const selectedClass = folder ? focus === "folder" && selectedFolder === entry.path ? "selected-folder" : "" : focus === "note" && selected === entry.path ? "selected" : "";
  return <li>
    {edit?.path === entry.path ? <TreeEditor kind={folder ? "folder" : "note"} value={edit.value} depth={depth} onSubmit={onEditSubmit} onCancel={onEditCancel} /> : <button data-kind={entry.kind} data-path={entry.path} className={`tree-item ${selectedClass} ${dragging === entry.path ? "dragging" : ""}`} style={{ paddingLeft: 5 + depth * 14 }} onPointerDown={event => onStart(entry.path, event)} onContextMenu={event => { if (!folder) return; event.preventDefault(); event.stopPropagation(); onFolderContext(entry.path, event.clientX, event.clientY); }} onClick={() => { if (folder) onExpanded(current => { const next = new Set(current); if (next.has(entry.path)) next.delete(entry.path); else next.add(entry.path); return next; }); onClick(entry); }} title={entry.path}>
      {folder ? isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span className="tree-indent" />}
      {folder ? <Folder size={15} /> : <FileText size={15} />}<span>{entry.name}</span>
    </button>}
    {folder && isExpanded && (!!entry.children?.length || edit?.path === `${entry.path}/`) && <ul>{entry.children?.map(child => <TreeRow key={child.path} entry={child} selected={selected} selectedFolder={selectedFolder} focus={focus} dragging={dragging} expanded={expanded} onExpanded={onExpanded} depth={depth + 1} onStart={onStart} onClick={onClick} onFolderContext={onFolderContext} edit={edit} onEditSubmit={onEditSubmit} onEditCancel={onEditCancel} />)}{edit?.path === `${entry.path}/` && <li><TreeEditor kind={edit.kind === "note" ? "note" : "folder"} value={edit.value} depth={depth + 1} onSubmit={onEditSubmit} onCancel={onEditCancel} /></li>}</ul>}
  </li>;
}
