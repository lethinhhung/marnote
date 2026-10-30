import { type PointerEvent, type MutableRefObject } from "react";
import type { Editor } from "@tiptap/react";
import { applyColumnWidth, resizeTarget, type ResizeGesture } from "./tableResize";

interface UseTableResizeOptions {
  editor: Editor;
  hostRef: MutableRefObject<HTMLDivElement | null>;
  resizeEnabled: boolean;
  hoveredCellRef: MutableRefObject<HTMLTableCellElement | null>;
  dragRef: MutableRefObject<ResizeGesture | null>;
}

export function useTableResize({ editor, hostRef, resizeEnabled, hoveredCellRef, dragRef }: UseTableResizeOptions) {
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizeEnabled) {
      hoveredCellRef.current?.classList.remove("table-resize-hover");
      hoveredCellRef.current = null;
      return;
    }
    if (dragRef.current) {
      applyColumnWidth(editor, dragRef.current, dragRef.current.startWidth + event.clientX - dragRef.current.startX);
      return;
    }
    const container = hostRef.current;
    const found = container && resizeTarget(editor, container, event.nativeEvent);
    if (hoveredCellRef.current !== (found?.cellElement ?? null)) {
      hoveredCellRef.current?.classList.remove("table-resize-hover");
      hoveredCellRef.current = found?.cellElement ?? null;
      hoveredCellRef.current?.classList.add("table-resize-hover");
    }
  };

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizeEnabled || event.button !== 0 || !hostRef.current) return;
    const found = resizeTarget(editor, hostRef.current, event.nativeEvent);
    if (!found) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { ...found.gesture, pointerId: event.pointerId };
    event.currentTarget.classList.add("is-column-resizing");
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const stopResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    applyColumnWidth(editor, dragRef.current, dragRef.current.startWidth + event.clientX - dragRef.current.startX);
    dragRef.current = null;
    event.currentTarget.classList.remove("is-column-resizing");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const leave = (setTarget: (target: null) => void, setPosition: (position: null) => void) => {
    if (dragRef.current) return;
    hoveredCellRef.current?.classList.remove("table-resize-hover");
    hoveredCellRef.current = null;
    setTarget(null);
    setPosition(null);
  };

  return { move, startResize, stopResize, leave };
}