import { ZoomIn, ZoomOut } from "lucide-react";
import "./editor-zoom.css";

type Props = { value: number; onDecrease: () => void; onIncrease: () => void; onReset: () => void };

export function EditorZoom({ value, onDecrease, onIncrease, onReset }: Props) {
  return <div className="editor-zoom" role="group" aria-label="Editor zoom">
    <button type="button" className="tool" title="Zoom out (⌘- / Ctrl+-)" aria-label="Zoom out" onClick={onDecrease} disabled={value <= 80}><ZoomOut size={15} /></button>
    <button type="button" className="editor-zoom-value" title="Reset zoom (⌘0 / Ctrl+0)" aria-label={`Zoom ${value} percent. Reset zoom`} onClick={onReset}>{value}%</button>
    <button type="button" className="tool" title="Zoom in (⌘+ / Ctrl++)" aria-label="Zoom in" onClick={onIncrease} disabled={value >= 150}><ZoomIn size={15} /></button>
  </div>;
}
