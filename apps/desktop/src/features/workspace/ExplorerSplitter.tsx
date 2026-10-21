import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { PanelLeftOpen } from "lucide-react";

type Props = { width: number; collapsed: boolean; onResize: (width: number) => void; onToggle: () => void };

export function ExplorerSplitter({ width, collapsed, onResize, onToggle }: Props) {
  const start = useRef<{ x: number; width: number } | null>(null);
  const preview = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const limits = () => {
    const available = document.querySelector(".app-layout")?.clientWidth ?? window.innerWidth;
    const max = Math.max(120, Math.min(420, available - 384));
    return { min: Math.min(200, max), max };
  };
  const resizeTo = (value: number) => {
    const { min, max } = limits();
    onResize(Math.max(min, Math.min(max, value)));
  };
  const applyPreview = () => {
    frame.current = null;
    if (preview.current === null) return;
    const dock = document.querySelector<HTMLElement>(".explorer-dock");
    if (dock) {
      dock.style.width = `${preview.current}px`;
      dock.style.flexBasis = `${preview.current}px`;
      const sidebar = dock.querySelector<HTMLElement>("#workspace-explorer");
      if (sidebar) {
        sidebar.style.width = `${preview.current}px`;
        sidebar.style.flexBasis = `${preview.current}px`;
        sidebar.style.setProperty("--explorer-width", `${preview.current}px`);
      }
    }
  };
  useEffect(() => {
    const clamp = () => resizeTo(width);
    window.addEventListener("resize", clamp);
    clamp();
    return () => window.removeEventListener("resize", clamp);
  }, [width, onResize]);
  useEffect(() => () => document.documentElement.classList.remove("explorer-resizing"), []);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    start.current = { x: event.clientX, width };
    document.documentElement.classList.add("explorer-resizing");
    if (collapsed) onToggle();
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const { min, max } = limits();
    preview.current = Math.max(min, Math.min(max, start.current.width + event.clientX - start.current.x));
    if (frame.current === null) frame.current = requestAnimationFrame(applyPreview);
  };
  const stopResize = () => {
    if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
    applyPreview();
    if (preview.current !== null) onResize(preview.current);
    preview.current = null;
    start.current = null;
    document.documentElement.classList.remove("explorer-resizing");
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
  if (collapsed) return <button className="explorer-collapsed-icon" type="button" onClick={onToggle} aria-label="Expand Explorer" aria-controls="workspace-explorer" title="Expand Explorer"><PanelLeftOpen size={17} /></button>;
  return <div className="explorer-splitter" role="separator" aria-label="Resize Explorer" aria-orientation="vertical" aria-controls="workspace-explorer" aria-valuenow={width} aria-valuemin={limits().min} aria-valuemax={limits().max} tabIndex={0} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize} onKeyDown={keyDown} />;
}
