import { useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Editor } from "@tiptap/react";
import { getBlockDropTarget, moveTopLevelBlock } from "./blockDnd";

type DragState = { pointerId: number; source: number; startX: number; startY: number; active: boolean };

export function BlockDragHandle({ editor }: { editor: Editor }) {
  const hovered = useRef<number | null>(null);
  const drag = useRef<DragState | null>(null);
  const [markerTop, setMarkerTop] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => () => { delete document.body.dataset.blockDragging; }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const source = hovered.current;
    if (source === null) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, source, startX: event.clientX, startY: event.clientY, active: false };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.active && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 5) return;
    if (!state.active) { document.body.dataset.blockDragging = "true"; setIsDragging(true); }
    state.active = true;
    const target = getBlockDropTarget(editor.view, event.clientY);
    const canvas = editor.view.dom.closest(".editor-canvas");
    const bounds = canvas?.getBoundingClientRect();
    setMarkerTop(target && canvas && bounds ? target.lineY - bounds.top + canvas.scrollTop : null);
  };
  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (state?.active && state.pointerId === event.pointerId) {
      const target = getBlockDropTarget(editor.view, event.clientY);
      if (target) {
        moveTopLevelBlock(editor.view, state.source, target.position);
        editor.view.dispatch(editor.state.tr.setMeta("hideDragHandle", true));
        const { clientX, clientY } = event;
        requestAnimationFrame(() => editor.view.dom.dispatchEvent(new MouseEvent("mousemove", { clientX, clientY, bubbles: true })));
      }
    }
    drag.current = null;
    delete document.body.dataset.blockDragging;
    setIsDragging(false);
    setMarkerTop(null);
  };
  const cancel = () => { drag.current = null; delete document.body.dataset.blockDragging; setIsDragging(false); setMarkerTop(null); };

  return <>
    <DragHandle editor={editor} className="block-drag-handle" onNodeChange={({ pos }) => { hovered.current = pos >= 0 ? pos : null; }}>
      <button type="button" className={isDragging ? "is-dragging" : ""} aria-label="Drag block to move" title="Drag to move block" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={cancel}><GripVertical size={17} /></button>
    </DragHandle>
    {markerTop !== null && <div className="block-drop-indicator" style={{ top: markerTop }} aria-hidden="true" />}
  </>;
}
