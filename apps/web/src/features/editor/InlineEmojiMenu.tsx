import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FullEmojiPicker from "emoji-picker-react";
import type { ThemeValue } from "emoji-picker-react";
import { emojiShortcodeMap } from "./emojiShortcodes";

type Props = { mode: "shortcode" | "picker"; query: string; matches: string[]; selected: number; position: { top: number; left: number }; onChoose: (value: string) => void; onClose: () => void };

export function InlineEmojiMenu({ mode, query, matches, selected, position, onChoose, onClose }: Props) {
  const menu = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ThemeValue>(() => document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) onClose(); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [onClose]);
  return createPortal(<div ref={menu} className="inline-emoji-menu" style={position} role={mode === "picker" ? undefined : "listbox"} aria-label={mode === "picker" ? "Choose emoji" : `Emoji suggestions for ${query}`} onMouseDown={event => { if (mode === "shortcode") event.preventDefault(); }}>
    {mode === "picker" ? <FullEmojiPicker width={320} height={360} theme={theme} onEmojiClick={emoji => onChoose(emoji.emoji)} /> : matches.map((name, index) => <button type="button" role="option" aria-selected={index === selected} key={name} onClick={() => onChoose(name)}><span>{name === query ? "↵" : ":"}</span> :{name}: <b>{emojiShortcodeMap[name]}</b></button>)}
    <button type="button" className="inline-emoji-close" aria-label="Close emoji picker" onClick={onClose}>Close</button>
  </div>, document.body);
}
