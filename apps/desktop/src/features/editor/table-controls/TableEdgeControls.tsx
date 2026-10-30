import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { useTablePosition, type Target } from "./useTablePosition";
import { useTableResize } from "./useTableResize";

export function TableEdgeControls({ editor, children, resizeEnabled }: { editor: Editor; children: ReactNode; resizeEnabled: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const drag = useRef<{ tablePos: number; column: number; startX: number; startWidth: number; pointerId: number } | null>(null);
  const hoveredCell = useRef<HTMLTableCellElement | null>(null);

  const position = useTablePosition({ editor, hostRef: host, target, resizeEnabled });

  const { move, startResize, stopResize, leave } = useTableResize({
    editor,
    hostRef: host,
    resizeEnabled,
    hoveredCellRef: hoveredCell,
    dragRef: drag,
  });

  const hover = (event: PointerEvent<HTMLDivElement>) => {
    const element = event.target instanceof HTMLElement ? event.target : null;
    if (element?.closest(".table-edge-add")) return;
    const wrapper = element?.closest<HTMLElement>(".tableWrapper");
    const table = wrapper?.querySelector("table");
    if (wrapper && table) setTarget({ wrapper, table });
    else setTarget(null);
  };

  const add = (edge: "row" | "column") => {
    if (!target) return;
    const rows = target.table.querySelectorAll("tr");
    const row = edge === "row" ? rows.item(rows.length - 1) : rows.item(0);
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

  const handleLeave = () => leave(setTarget, () => {});

  return (
    <div
      ref={host}
      className="table-edge-host"
      onPointerOver={hover}
      onPointerMove={move}
      onPointerDown={startResize}
      onPointerUp={stopResize}
      onPointerCancel={stopResize}
      onPointerLeave={handleLeave}
    >
      {children}
      {target && position && (
        <>
          <button
            className="table-edge-add table-edge-column"
            type="button"
            style={position.right}
            aria-label="Add column to table"
            title="Add column"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => add("column")}
          >
            +
          </button>
          <button
            className="table-edge-add table-edge-row"
            type="button"
            style={position.bottom}
            aria-label="Add row to table"
            title="Add row"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => add("row")}
          >
            +
          </button>
        </>
      )}
    </div>
  );
}