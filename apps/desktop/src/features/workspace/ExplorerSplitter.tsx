import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";

type Props = { width: number; collapsed: boolean; onResize: (width: number) => void; onToggle: () => void };

export function ExplorerSplitter({ width, collapsed, onResize, onToggle }: Props) {
  const start = useRef<{ x: number; width: number } | null>(null);
  const limits = () => {
    const available = document.querySelector(".app-layout")?.clientWidth ?? window.innerWidth;
    const max = Math.max(120, Math.min(420, available - 384));
    return { min: Math.min(200, max), max };
  };
  const resizeTo = (value: number) => {
    const { min, max } = limits();
    onResize(Math.max(min, Math.min(max, value)));
  };
  useEffect(() => {
    const clamp = () => resizeTo(width);
    window.addEventListener("resize", clamp);
    clamp();
    return () => window.removeEventListener("resize", clamp);
  }, [width, onResize]);
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    start.current = { x: event.clientX, width };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (start.current) resizeTo(start.current.width + event.clientX - start.current.x);
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 10;
    if (event.key === "Enter") { event.preventDefault(); onToggle(); return; }
    if (event.key === "Home") { event.preventDefault(); if (!collapsed) onToggle(); return; }
    if (event.key === "End") { event.preventDefault(); resizeTo(limits().max); return; }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (collapsed) onToggle();
      resizeTo(width + (event.key === "ArrowRight" ? step : -step));
    }
  };
  return <div className="explorer-splitter" role="separator" aria-label="Resize Explorer" aria-orientation="vertical" aria-controls="workspace-explorer" aria-valuenow={collapsed ? 0 : width} aria-valuemin={0} aria-valuemax={limits().max} tabIndex={0} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { start.current = null; }} onPointerCancel={() => { start.current = null; }} onKeyDown={keyDown} />;
}
