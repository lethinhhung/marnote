import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Entry } from "./workspaceTypes";
import { parentPath } from "./state/workspacePaths";
import { dropDestination } from "./treeDrop";
import { reorderedPaths, siblingPaths, type ExplorerSort } from "./sortEntries";

/** Drop target marker used while a drag hovers blank space inside the tree. */
export const BLANK_DROP_TARGET = "__blank__";

type Drag = { path: string; x: number; y: number; moved: boolean };
type DragStartEvent = { button: number; clientX: number; clientY: number };

type Options = {
  entries: Entry[];
  sort: ExplorerSort;
  setExpanded: Dispatch<SetStateAction<Set<string>>>;
  onMove: (source: string, destination: string) => Promise<boolean>;
  onReorder: (parent: string, paths: string[]) => Promise<boolean>;
};

/**
 * Drag and drop behavior for the explorer tree: pointer tracking, drop target
 * resolution, manual reordering, moving items, and undoing the last move.
 */
export function useTreeDragDrop({ entries, sort, setExpanded, onMove, onReorder }: Options) {
  const [dragging, setDragging] = useState("");
  const [dropTarget, setDropTarget] = useState("");
  const [blankDropY, setBlankDropY] = useState<number | null>(null);
  const drag = useRef<Drag | null>(null);
  const moveHistory = useRef<Array<{ source: string; destination: string }>>([]);
  const undoing = useRef(false);
  const skipClick = useRef(false);

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
      const bounds = document.querySelector(".file-tree")?.getBoundingClientRect();
      if (!bounds || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return;
      const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>(".tree-item");
      const kind = row?.dataset.kind;
      const path = row?.dataset.path || "";
      const sameParent = row && path && parentPath(path) === parentPath(active.path) && path !== active.path;
      if (sort === "manual" && sameParent && (kind === "file" || kind === "directory")) {
        const rowBounds = row.getBoundingClientRect();
        const after = event.clientY >= rowBounds.top + rowBounds.height / 2;
        const edgeDrop = event.clientY <= rowBounds.top + rowBounds.height * 0.25 || event.clientY >= rowBounds.top + rowBounds.height * 0.75;
        if (kind === "file" || edgeDrop) {
          const parent = parentPath(path);
          const paths = reorderedPaths(siblingPaths(entries, parent), active.path, path, after);
          if (paths.length) await onReorder(parent, paths);
          return;
        }
      }
      const folder = kind === "directory" ? path : parentPath(path);
      const destination = path ? dropDestination(active.path, path, kind) : active.path.split("/").pop() || "";
      if (destination && destination !== active.path) {
        if (folder) setExpanded(current => new Set(current).add(folder));
        if (await onMove(active.path, destination)) moveHistory.current.push({ source: active.path, destination });
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
      void onMove(last.destination, last.source).then(success => { if (!success) moveHistory.current.push(last); }).finally(() => { undoing.current = false; });
    };
    const trackPointer = (event: globalThis.PointerEvent) => {
      if (!drag.current) return;
      if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 5) {
        drag.current.moved = true;
        setDragging(drag.current.path);
      }
      if (!drag.current.moved) { setDropTarget(""); return; }
      const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>(".tree-item");
      const path = row?.dataset.path || "";
      if (row) {
        const canReorder = sort === "manual" && path !== drag.current.path && parentPath(path) === parentPath(drag.current.path) && (row.dataset.kind === "file" || row.dataset.kind === "directory");
        setDropTarget(dropDestination(drag.current.path, path, row.dataset.kind) || canReorder ? path : "");
        setBlankDropY(null);
      } else {
        const tree = document.querySelector<HTMLElement>(".file-tree");
        const bounds = tree?.getBoundingClientRect();
        const inTree = !!tree && !!bounds && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
        setDropTarget(inTree ? BLANK_DROP_TARGET : "");
        setBlankDropY(inTree && tree && bounds ? event.clientY - bounds.top + tree.scrollTop : null);
      }
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("pointermove", trackPointer);
    window.addEventListener("keydown", undoMove);
    return () => { window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish); window.removeEventListener("pointermove", trackPointer); window.removeEventListener("keydown", undoMove); };
  }, [onMove, onReorder, entries, sort, setExpanded]);

  const start = (path: string, event: DragStartEvent) => { if (event.button !== 0) return; skipClick.current = false; drag.current = { path, x: event.clientX, y: event.clientY, moved: false }; };

  const consumeSkipClick = () => { const skip = skipClick.current; skipClick.current = false; return skip; };

  return { dragging, dropTarget, blankDropY, start, consumeSkipClick };
}
