import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ThemeValue } from "emoji-picker-react";
import { X } from "lucide-react";

const FullEmojiPicker = lazy(() => import("emoji-picker-react"));

type Props = { value?: string; onChange: (emoji: string) => void; label?: string; fallback?: ReactNode };
type Position = { top: number; left: number; width: number; height: number };

export function EmojiPicker({ value, onChange, label = "Choose emoji", fallback = "😊" }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [theme, setTheme] = useState<ThemeValue>(() => document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  const anchor = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(320, window.innerWidth - 16);
      const height = Math.min(400, window.innerHeight - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const top = rect.top >= height + 8 ? rect.top - height - 8 : Math.min(rect.bottom + 8, window.innerHeight - height - 8);
      setPosition({ top, left, width, height });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); };
  }, [open]);

  return <span className="emoji-picker" ref={anchor}>
    <button type="button" aria-label={label} title={label} aria-expanded={open} onClick={() => setOpen(current => !current)}>{value || fallback}</button>
    {open && position && createPortal(<div className="emoji-picker-popover" ref={panel} style={position} onClick={event => event.stopPropagation()}>
      <div className="emoji-picker-toolbar"><button type="button" className="emoji-picker-remove" onClick={() => { onChange(""); setOpen(false); }}><X size={12} />Remove emoji</button></div>
      <Suspense fallback={<div className="emoji-picker-loading" aria-label="Loading emoji picker" />}><FullEmojiPicker width={position.width} height={Math.max(240, position.height - 34)} theme={theme} style={{ "--epr-header-padding": "5px 8px", "--epr-category-navigation-button-size": "27px" } as CSSProperties} onEmojiClick={emoji => { onChange(emoji.emoji); setOpen(false); }} /></Suspense>
    </div>, document.body)}
  </span>;
}
