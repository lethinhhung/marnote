import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Entry } from "./workspaceTypes";
import { TreeEditor } from "./TreeEditor";
import { TreeRow } from "./TreeRow";
import { visibleEntries } from "./treeVisibility";
import { parentPath } from "./workspacePaths";
import { dropDestination } from "./treeDrop";
import { useTreeFolderFocus } from "./useTreeFolderFocus";
import { reorderedPaths, siblingPaths, sortEntries, type ExplorerSort } from "./sortEntries";

export type TreeEdit = { kind: "note" | "folder" | "rename-note" | "rename-folder"; path: string; value: string };
type Props = { entries: Entry[]; manualOrder: Record<string, string[]>; sort: ExplorerSort; selected: string; selectedFolder: string; focus: "note" | "folder" | "none"; hideFoldersWithoutNotes: boolean; edit: TreeEdit | null; tagColors?: Record<string, string>; onEditSubmit: (name: string) => void; onEditCancel: () => void; onOpen: (entry: Entry) => void; onFolderSelect: (path: string) => void; onClearFocus?: () => void; onEntryContext: (path: string, kind: "note" | "folder" | "root", x: number, y: number) => void; onMove: (source: string, destination: string) => Promise<boolean>; onReorder: (parent: string, paths: string[]) => Promise<boolean> };
type Drag = { path: string; x: number; y: number; moved: boolean };

export function FileTree(props: Props) {
  const [dragging, setDragging] = useState("");
  const [dropTarget, setDropTarget] = useState("");
  const [blankDropY, setBlankDropY] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(() => new Set(props.entries.filter(entry => entry.kind === "directory").map(entry => entry.path)));
  const focusPath = useTreeFolderFocus(setExpanded);
  const drag = useRef<Drag | null>(null);
  const moveHistory = useRef<Array<{ source: string; destination: string }>>([]);
  const undoing = useRef(false);
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
      setDropTarget("");
      setBlankDropY(null);
      if (!active.moved) return;
      skipClick.current = true;
      window.setTimeout(() => { skipClick.current = false; }, 0);
      const tree = document.querySelector(".file-tree");
      const bounds = tree?.getBoundingClientRect();
      if (!bounds || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return;
      const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>(".tree-item");
      const kind = row?.dataset.kind;
      const path = row?.dataset.path || "";
      if (props.sort === "manual" && row && path && parentPath(path) === parentPath(active.path) && path !== active.path) {
        const bounds = row.getBoundingClientRect();
        const after = event.clientY >= bounds.top + bounds.height * 0.75;
        const before = event.clientY <= bounds.top + bounds.height * 0.25;
        if (before || after) {
          const parent = parentPath(path);
          const paths = reorderedPaths(siblingPaths(props.entries, parent), active.path, path, after);
          if (paths.length) await props.onReorder(parent, paths);
          return;
        }
      }
      const folder = kind === "directory" ? path : parentPath(path);
      const name = active.path.split("/").pop() || "";
      const destination = [folder, name].filter(Boolean).join("/");
      if (destination && destination !== active.path && path !== active.path && !folder.startsWith(`${active.path}/`)) {
        if (folder) setExpanded(current => new Set(current).add(folder));
        if (await props.onMove(active.path, destination)) moveHistory.current.push({ source: active.path, destination });
      }
    };
    const undoMove = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z" || event.shiftKey || undoing.current) return;
      if ((event.target as HTMLElement).closest?.("input, textarea, [contenteditable='true'], .ProseMirror")) return;
      const last = moveHistory.current.pop();
      if (!last) return;
      event.preventDefault();
      event.stopPropagation();
      undoing.current = true;
      void props.onMove(last.destination, last.source).then(success => { if (!success) moveHistory.current.push(last); }).finally(() => { undoing.current = false; });
    };
    const move = (event: globalThis.PointerEvent) => {
      if (!drag.current) return;
      if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 5) {
        drag.current.moved = true;
        setDragging(drag.current.path);
      }
      if (!drag.current.moved) { setDropTarget(""); return; }
      const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>(".tree-item");
      const path = row?.dataset.path || "";
      if (row) {
        const canReorder = props.sort === "manual" && path !== drag.current.path && parentPath(path) === parentPath(drag.current.path);
        setDropTarget(dropDestination(drag.current.path, path, row.dataset.kind) || canReorder ? path : "");
        setBlankDropY(null);
      } else {
        const tree = document.querySelector<HTMLElement>(".file-tree");
        const bounds = tree?.getBoundingClientRect();
        const inTree = !!tree && !!bounds && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
        setDropTarget(inTree ? "__blank__" : "");
        setBlankDropY(inTree && tree && bounds ? event.clientY - bounds.top + tree.scrollTop : null);
      }
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("pointermove", move);
    window.addEventListener("keydown", undoMove);
    return () => { window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish); window.removeEventListener("pointermove", move); window.removeEventListener("keydown", undoMove); };
  }, [props.onMove, props.onReorder, props.entries, props.sort]);
  const start = (path: string, event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    skipClick.current = false;
    drag.current = { path, x: event.clientX, y: event.clientY, moved: false };
  };
  const click = (entry: Entry) => {
    if (skipClick.current) { skipClick.current = false; return; }
    document.dispatchEvent(new Event("marnote-clear-folder-focus"));
    if (entry.kind === "directory") props.onFolderSelect(entry.path);
    else props.onOpen(entry);
  };
  const entries = visibleEntries(sortEntries(props.entries, props.sort, props.manualOrder), props.hideFoldersWithoutNotes);
  const editor = props.edit;
  return (
    <ul className={`file-tree ${dragging ? "is-dragging" : ""}`}
      onClick={event => { if (!(event.target as HTMLElement).closest(".tree-item")) props.onClearFocus?.(); }}
      onContextMenu={event => { if ((event.target as HTMLElement).closest(".tree-item")) return; event.preventDefault(); props.onClearFocus?.(); props.onEntryContext("", "root", event.clientX, event.clientY); }}>
      {editor && (editor.kind === "note" || editor.kind === "folder") && !editor.path && <li><TreeEditor kind={editor.kind} value={editor.value} depth={0} onSubmit={props.onEditSubmit} onCancel={props.onEditCancel} /></li>}
      {entries.map(entry => <TreeRow key={entry.path} entry={entry} tagColors={props.tagColors ?? {}} selected={props.selected} selectedFolder={props.selectedFolder} focus={props.focus} dragging={dragging} dropTarget={dropTarget} focusPath={focusPath} expanded={expanded} onExpanded={setExpanded} depth={0} onStart={start} onClick={click} onEntryContext={props.onEntryContext} edit={editor} onEditSubmit={props.onEditSubmit} onEditCancel={props.onEditCancel} />)}
      {dropTarget === "__blank__" && blankDropY !== null && <li className="tree-drop-blank-line" style={{ top: blankDropY }} aria-hidden="true" />}
    </ul>
  );
}
