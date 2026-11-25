import { useState, type KeyboardEvent, type RefObject } from "react";
import type { Editor } from "@tiptap/react";
import { emojiForShortcode, matchingEmojiShortcodes } from "./emojiShortcodes";

type MenuState = { mode: "shortcode" | "picker"; from: number; to: number; query: string; top: number; left: number };
export function useEditorEmoji({ editorRef }: { editorRef: RefObject<Editor | null> }) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [selected, setSelected] = useState(0);
  const update = () => {
    const editor = editorRef.current;
    if (!editor || !editor.state.selection.empty) { setMenu(null); return; }
    const { $from } = editor.state.selection;
    if ($from.parent.type.name !== "paragraph") { setMenu(null); return; }
    const before = $from.parent.textContent.slice(0, $from.parentOffset);
    const completed = before.match(/(^|\s):([\w+-]+)([ \t.,!?;:]*)$/);
    if (completed) {
      const emoji = emojiForShortcode(completed[2]);
      if (emoji && completed[3].startsWith(":")) {
        const from = $from.pos - completed[0].length;
        const insertion = completed[1] + emoji + completed[3].slice(1);
        editor.chain().insertContentAt(from, insertion).setTextSelection(from + insertion.length).run();
        setMenu(null);
        return;
      }
    }
    const match = before.match(/(?:^|\s):([\w+-]*)$/);
    if (match && match[1].length >= 1) {
      const cursor = editor.view.coordsAtPos($from.pos);
      setMenu({ mode: "shortcode", query: match[1], from: $from.pos - match[1].length - 1, to: $from.pos, top: Math.min(cursor.bottom + 6, window.innerHeight - 300), left: Math.max(12, Math.min(cursor.left, window.innerWidth - 230)) });
      setSelected(0);
      return;
    }
    setMenu(null);
  };
  const openPicker = (from: number, to: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    const cursor = editor.view.coordsAtPos(to);
    setMenu({ mode: "picker", query: "", from, to, top: Math.max(8, Math.min(cursor.bottom + 6, window.innerHeight - 400)), left: Math.max(8, Math.min(cursor.left, window.innerWidth - 328)) });
  };
  const choose = (value: string) => {
    const editor = editorRef.current;
    if (!editor || !menu) return;
    const text = menu.mode === "picker" ? value : emojiForShortcode(value);
    if (text) editor.chain().focus().insertContentAt({ from: menu.from, to: menu.to }, text).setTextSelection(menu.from + text.length).run();
    setMenu(null);
  };
  const keys = (event: KeyboardEvent) => {
    if (!menu) return;
    if (event.key === "Escape") { event.preventDefault(); setMenu(null); return; }
    if (menu.mode !== "shortcode") return;
    const matches = matchingEmojiShortcodes(menu.query);
    if (matches.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); setSelected(value => (value + (event.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length); }
    if (event.key === "Enter" && matches[selected]) { event.preventDefault(); choose(matches[selected]); }
  };
  return { menu, update, openPicker, choose, close: () => setMenu(null), keys, selected, matches: menu ? matchingEmojiShortcodes(menu.query) : [] };
}
