import { useEffect, useState, type KeyboardEvent } from "react";

const storageKey = "marnote-editor-zoom";
export const MIN_ZOOM = 80;
export const MAX_ZOOM = 150;
const step = 10;

function savedZoom() {
  const value = Number(localStorage.getItem(storageKey));
  return Number.isFinite(value) && value >= MIN_ZOOM && value <= MAX_ZOOM ? value : 100;
}

export function useEditorZoom() {
  const [zoom, setZoom] = useState(savedZoom);
  useEffect(() => { localStorage.setItem(storageKey, String(zoom)); }, [zoom]);
  const decrease = () => setZoom(value => Math.max(MIN_ZOOM, value - step));
  const increase = () => setZoom(value => Math.min(MAX_ZOOM, value + step));
  const reset = () => setZoom(100);
  const onKeyDownCapture = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (!target.closest(".editor-prose, .markdown-source, .title-input")) return;
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const key = event.key;
    if (key === "+" || key === "=") increase();
    else if (key === "-") decrease();
    else if (key === "0") reset();
    else return;
    event.preventDefault();
    event.stopPropagation();
  };
  return { zoom, decrease, increase, reset, onKeyDownCapture };
}
