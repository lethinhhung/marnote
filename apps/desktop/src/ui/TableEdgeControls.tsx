import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";

type Target = { wrapper: HTMLElement; table: HTMLTableElement };
type Position = { right: { top: number; left: number }; bottom: { top: number; left: number } };

export function TableEdgeControls({ editor, children }: { editor: Editor; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const hover = (event: PointerEvent<HTMLDivElement>) => {
    const element = event.target instanceof HTMLElement ? event.target : null;
    if (element?.closest(".table-edge-add")) return;
    const wrapper = element?.closest<HTMLElement>(".tableWrapper");
    const table = wrapper?.querySelector("table");
    if (wrapper && table) setTarget({ wrapper, table });
    else setTarget(null);
  };
  useEffect(() => {
    if (!target) return;
    const container = host.current;
    if (!container) return;
    const update = () => {
      const bounds = target.wrapper.getBoundingClientRect();
      const tableBounds = target.table.getBoundingClientRect();
      const origin = container.getBoundingClientRect();
      setPosition({
        right: { top: tableBounds.top - origin.top + tableBounds.height / 2 - 13, left: tableBounds.right - origin.left - 14 },
        bottom: { top: bounds.bottom - origin.top - 14, left: bounds.left - origin.left + bounds.width / 2 - 25 },
      });
    };
    update();
    editor.on("transaction", update);
    target.wrapper.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(target.wrapper);
    observer.observe(target.table);
    return () => {
      editor.off("transaction", update);
      target.wrapper.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [editor, target]);
  const add = (edge: "row" | "column") => {
    if (!target) return;
    const bounds = target.wrapper.getBoundingClientRect();
    const tableBounds = target.table.getBoundingClientRect();
    const point = edge === "row"
      ? { left: bounds.left + bounds.width / 2, top: bounds.bottom - 30 }
      : { left: tableBounds.right - 8, top: tableBounds.top + tableBounds.height / 2 };
    const hovered = document.elementFromPoint(point.left, point.top)?.closest<HTMLTableCellElement>("td, th");
    const fallback = edge === "row"
      ? target.table.querySelector("tr:last-child th, tr:last-child td")
      : target.table.querySelector("tr:first-child th:last-child, tr:first-child td:last-child");
    const cell = hovered || fallback;
    const cellBounds = cell?.getBoundingClientRect();
    if (!cellBounds) return;
    const pos = editor.view.posAtCoords({ left: cellBounds.left + Math.min(8, cellBounds.width / 2), top: cellBounds.top + Math.min(8, cellBounds.height / 2) })?.pos;
    if (pos === undefined) return;
    const chain = editor.chain().focus().setTextSelection(pos);
    if (edge === "row") chain.addRowAfter().run();
    else chain.addColumnAfter().run();
  };
  return <div ref={host} className="table-edge-host" onPointerOver={hover} onPointerLeave={() => { setTarget(null); setPosition(null); }}>{children}
    {target && position && <>
      <button className="table-edge-add table-edge-column" type="button" style={position.right} aria-label="Add column to table" title="Add column" onPointerDown={event => event.preventDefault()} onClick={() => add("column")}>+</button>
      <button className="table-edge-add table-edge-row" type="button" style={position.bottom} aria-label="Add row to table" title="Add row" onPointerDown={event => event.preventDefault()} onClick={() => add("row")}>+</button>
    </>}
  </div>;
}
