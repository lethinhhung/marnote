import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, File, Plus, X } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

type Props = { paths: string[]; icons?: Record<string, ReactNode>; dirtyPath?: string; activePath: string; onSelect: (path: string) => void; onClose: (path: string) => void; onCloseOthers: (path: string) => void; onCloseAll: () => void; onCreate: () => void; onReorder: (from: string, to: string) => void; canCreate: boolean };
type Menu = { path: string; x: number; y: number } | null;

export function NoteTabs({ paths, icons = {}, dirtyPath, activePath, onSelect, onClose, onCloseOthers, onCloseAll, onCreate, onReorder, canCreate }: Props) {
  const [menu, setMenu] = useState<Menu>(null);
  const [dragging, setDragging] = useState("");
  const [dropTarget, setDropTarget] = useState("");
  const [edges, setEdges] = useState({ left: false, right: false });
  const list = useRef<HTMLDivElement>(null);
  const stopDrag = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!(event.target as HTMLElement).closest(".note-tab-menu")) setMenu(null); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setMenu(null); };
    document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", key); stopDrag.current?.(); };
  }, []);
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const update = () => setEdges({ left: element.scrollLeft > 2, right: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 });
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { element.removeEventListener("scroll", update); observer.disconnect(); };
  }, [paths.length]);
  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>, path: string) => {
    if (event.button !== 0 || event.pointerType === "touch" || (event.target as HTMLElement).closest(".note-tab-close")) return;
    const origin = { x: event.clientX, y: event.clientY };
    let moved = false;
    let over = path;
    const move = (pointer: PointerEvent) => {
      if (!moved && Math.hypot(pointer.clientX - origin.x, pointer.clientY - origin.y) < 5) return;
      moved = true;
      setDragging(path);
      const target = document.elementFromPoint(pointer.clientX, pointer.clientY)?.closest<HTMLElement>(".note-tab")?.dataset.path;
      setDropTarget(target && target !== path ? target : "");
      if (target && target !== over) { onReorder(path, target); over = target; }
      pointer.preventDefault();
    };
    const finish = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish);
      if (moved) { suppressClick.current = true; window.setTimeout(() => { suppressClick.current = false; }, 0); }
      stopDrag.current = null; setDragging(""); setDropTarget("");
    };
    stopDrag.current?.();
    stopDrag.current = finish;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };
  const showMenu = (path: string, x: number, y: number) => { setMenu({ path, x: Math.max(8, Math.min(x, window.innerWidth - 190)), y: Math.max(8, Math.min(y, window.innerHeight - 120)) }); };
  return <nav className="note-tabs" aria-label="Open notes" onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
    <div className="note-tabs-list" ref={list} role="tablist" onWheel={event => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.currentTarget.scrollLeft += event.deltaY;
        event.preventDefault();
      }
    }}>
      {paths.map(path => {
        const title = path.split("/").pop() || path;
        const active = path === activePath;
        return <div key={path} data-path={path} className={`note-tab ${active ? "active" : ""} ${dragging === path ? "dragging" : ""} ${dropTarget === path ? "drop-target" : ""}`} onPointerDown={event => beginDrag(event, path)} onContextMenu={event => { event.preventDefault(); showMenu(path, event.clientX, event.clientY); }}>
          <button type="button" role="tab" aria-selected={active} title={`${path} · Drag to reorder`} onClick={() => onSelect(path)}>
            <span className="note-tab-icon" aria-hidden="true">{icons[path] || <File size={14} />}</span><span>{title}</span>
          </button>
          {dirtyPath === path && <span className="note-tab-dirty" role="img" aria-label="Unsaved changes" title="Unsaved changes" />}
          <button className="note-tab-close" type="button" aria-label={`Close ${title}`} onClick={() => onClose(path)}><X size={12} /></button>
        </div>;
      })}
      <button className="note-tab-add" type="button" aria-label="New note" title="New note" disabled={!canCreate} onClick={onCreate}><Plus size={15} /></button>
    </div>
    {edges.left && <button className="note-tabs-edge left" type="button" aria-label="Show previous tabs" onClick={() => list.current?.scrollBy({ left: -220, behavior: "smooth" })}><ChevronLeft size={15} /></button>}
    {edges.right && <button className="note-tabs-edge right" type="button" aria-label="Show more tabs" onClick={() => list.current?.scrollBy({ left: 220, behavior: "smooth" })}><ChevronRight size={15} /></button>}
    {menu && <div className="note-tab-menu" role="menu" style={{ left: menu.x, top: menu.y }} onPointerDown={event => event.stopPropagation()}>
      <button role="menuitem" onClick={() => { onClose(menu.path); setMenu(null); }}>Close</button>
      <button role="menuitem" onClick={() => { onCloseOthers(menu.path); setMenu(null); }}>Close others</button>
      <button role="menuitem" onClick={() => { onCloseAll(); setMenu(null); }}>Close all</button>
    </div>}
  </nav>;
}
