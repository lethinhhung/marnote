import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { applyColumnWidth, resizeTarget, type ResizeGesture } from "./tableResize";

type Target = { wrapper: HTMLElement; table: HTMLTableElement };
type Position = { right: { top: number; left: number }; bottom: { top: number; left: number } };

export function TableEdgeControls({ editor, children, resizeEnabled }: { editor: Editor; children: ReactNode; resizeEnabled: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const drag = useRef<ResizeGesture | null>(null);
  const hoveredCell = useRef<HTMLTableCellElement | null>(null);
  useEffect(() => {
    if (resizeEnabled) return;
    const active = drag.current;
    drag.current = null;
    host.current?.classList.remove("is-column-resizing");
    if (active && host.current?.hasPointerCapture(active.pointerId)) host.current.releasePointerCapture(active.pointerId);
    hoveredCell.current?.classList.remove("table-resize-hover");
    hoveredCell.current = null;
  }, [resizeEnabled]);
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
      const visibleLeft = bounds.left + target.wrapper.clientLeft;
      const visibleRight = visibleLeft + target.wrapper.clientWidth;
      const buttonLeft = Math.max(visibleLeft + 13, Math.min(tableBounds.right, visibleRight - 8));
      const visibleTableLeft = Math.max(tableBounds.left, visibleLeft);
      const visibleTableRight = Math.min(tableBounds.right, visibleRight);
      const rightLeft = resizeEnabled ? buttonLeft - origin.left - 13 : tableBounds.right - origin.left - 14;
      const bottomLeft = resizeEnabled
        ? (visibleTableLeft + visibleTableRight) / 2 - origin.left - 13
        : bounds.left - origin.left + bounds.width / 2 - 25;
      setPosition({
        right: { top: tableBounds.top - origin.top + tableBounds.height / 2 - 13, left: rightLeft },
        bottom: { top: bounds.bottom - origin.top - 14, left: bottomLeft },
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
    const rows = target.table.querySelectorAll("tr"), row = edge === "row" ? rows.item(rows.length - 1) : rows.item(0);
    const cells = row?.querySelectorAll<HTMLTableCellElement>("th, td");
    const cell = edge === "row" ? cells?.item(0) : cells?.item(Math.max(0, (cells?.length ?? 1) - 1));
    const cellBounds = cell?.getBoundingClientRect();
    if (!cellBounds) return;
    const pos = editor.view.posAtCoords({ left: cellBounds.left + Math.min(8, cellBounds.width / 2), top: cellBounds.top + Math.min(8, cellBounds.height / 2) })?.pos;
    if (pos === undefined) return;
    const chain = editor.chain().focus().setTextSelection(pos);
    if (edge === "row") chain.addRowAfter().run();
    else chain.addColumnAfter().run();
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizeEnabled) {
      hoveredCell.current?.classList.remove("table-resize-hover");
      hoveredCell.current = null;
      return;
    }
    if (drag.current) {
      applyColumnWidth(editor, drag.current, drag.current.startWidth + event.clientX - drag.current.startX);
      return;
    }
    const container = host.current;
    const found = container && resizeTarget(editor, container, event.nativeEvent);
    if (hoveredCell.current !== (found?.cellElement ?? null)) {
      hoveredCell.current?.classList.remove("table-resize-hover");
      hoveredCell.current = found?.cellElement ?? null;
      hoveredCell.current?.classList.add("table-resize-hover");
    }
  };
  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizeEnabled || event.button !== 0 || !host.current) return;
    const found = resizeTarget(editor, host.current, event.nativeEvent);
    if (!found) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current = { ...found.gesture, pointerId: event.pointerId };
    event.currentTarget.classList.add("is-column-resizing");
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const stopResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    applyColumnWidth(editor, drag.current, drag.current.startWidth + event.clientX - drag.current.startX);
    drag.current = null;
    event.currentTarget.classList.remove("is-column-resizing");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const leave = () => {
    if (drag.current) return;
    hoveredCell.current?.classList.remove("table-resize-hover");
    hoveredCell.current = null;
    setTarget(null);
    setPosition(null);
  };
  return <div ref={host} className="table-edge-host" onPointerOver={hover} onPointerMove={move} onPointerDown={startResize} onPointerUp={stopResize} onPointerCancel={stopResize} onPointerLeave={leave}>{children}
    {target && position && <>
      <button className="table-edge-add table-edge-column" type="button" style={position.right} aria-label="Add column to table" title="Add column" onPointerDown={event => event.preventDefault()} onClick={() => add("column")}>+</button>
      <button className="table-edge-add table-edge-row" type="button" style={position.bottom} aria-label="Add row to table" title="Add row" onPointerDown={event => event.preventDefault()} onClick={() => add("row")}>+</button>
    </>}
  </div>;
}
