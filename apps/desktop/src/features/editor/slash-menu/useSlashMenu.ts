import { useEffect, useState, type KeyboardEvent, type RefObject } from "react";
import type { Editor } from "@tiptap/react";
import { matchingSlashIds, type SlashState } from "./SlashMenu";
import { slashPosition } from "./slashPosition";

export function useSlashMenu({
  editorRef,
}: {
  editorRef: RefObject<Editor | null>;
}) {
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [selected, setSelected] = useState(0);
  const [slashKeyboardNavigation, setSlashKeyboardNavigation] = useState(true);

  const handleEditorUpdate = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const { $from } = editor.state.selection;
    const match = $from.parent.type.name === "paragraph" && $from.parent.textContent.match(/(?:^|\s)\/([\w-]*)$/);
    if (!match) { setSlash(null); return; }
    const from = $from.pos - match[1].length - 1;
    setSlash({ query: match[1], from, to: $from.pos, ...slashPosition(editor, $from.pos, match[1]) });
    setSelected(0);
    setSlashKeyboardNavigation(true);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !slash) return;
    const update = () => setSlash((current: SlashState | null) => current ? { ...current, ...slashPosition(editor, current.to, current.query) } : current);
    const canvas = editor.view.dom.closest(".editor-canvas");
    canvas?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      canvas?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [slash?.to, slash?.query]);

  useEffect(() => {
    if (!slash) return;
    const dismissOnPointerDown = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".slash-menu")) return;
      setSlash(null);
    };
    const dismissOnFocus = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".ProseMirror, .slash-menu")) return;
      setSlash(null);
    };
    document.addEventListener("pointerdown", dismissOnPointerDown);
    document.addEventListener("focusin", dismissOnFocus);
    return () => {
      document.removeEventListener("pointerdown", dismissOnPointerDown);
      document.removeEventListener("focusin", dismissOnFocus);
    };
  }, [slash !== null]);

  const insert = (id: string) => {
    const editor = editorRef.current;
    if (!editor || !slash) return;
    const chain = editor.chain().focus().deleteRange({ from: slash.from, to: slash.to });
    if (id === "paragraph") chain.setParagraph().run();
    else if (id.startsWith("heading")) chain.setHeading({ level: Number(id.slice(-1)) as 1 | 2 | 3 }).run();
    else if (id === "bullet") chain.toggleBulletList().run();
    else if (id === "number") chain.toggleOrderedList().run();
    else if (id === "task") chain.toggleTaskList().run();
    else if (id === "quote") chain.toggleBlockquote().run();
    else if (id === "code") chain.toggleCodeBlock().run();
    else if (id === "table") chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    else chain.setHorizontalRule().run();
    setSlash(null);
  };

  const keys = (event: KeyboardEvent) => {
    const editor = editorRef.current;
    if (!slash || !editor || !(event.target as HTMLElement).closest(".ProseMirror")) return;
    const ids = matchingSlashIds(slash.query);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setSlashKeyboardNavigation(true);
      setSelected(v => Math.max(0, Math.min(ids.length - 1, v + (event.key === "ArrowDown" ? 1 : -1))));
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setSlash(null);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (ids[selected]) insert(ids[selected]);
    }
  };

  return {
    slash,
    setSlash,
    selected,
    setSelected,
    slashKeyboardNavigation,
    setSlashKeyboardNavigation,
    insert,
    keys,
    handleEditorUpdate,
  };
}
