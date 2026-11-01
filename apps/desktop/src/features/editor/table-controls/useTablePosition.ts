import { useEffect, useState, type RefObject } from "react";
import type { Editor } from "@tiptap/react";

export type Target = { wrapper: HTMLElement; table: HTMLTableElement };
export type Position = { right: { top: number; left: number }; bottom: { top: number; left: number } };

interface UseTablePositionOptions {
  editor: Editor;
  hostRef: RefObject<HTMLDivElement>;
  target: Target | null;
  resizeEnabled: boolean;
}

export function useTablePosition({ editor, hostRef, target, resizeEnabled }: UseTablePositionOptions) {
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    if (!target) return;
    const container = hostRef.current;
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
      const rightLeft = resizeEnabled
        ? buttonLeft - origin.left - 13
        : tableBounds.right - origin.left - 14;
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
  }, [editor, target, resizeEnabled, hostRef]);

  return position;
}