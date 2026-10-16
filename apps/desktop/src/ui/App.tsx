import { useState } from "react";
import type { KeyboardEvent } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Moon, Sun } from "lucide-react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorToolbar } from "./EditorToolbar";
import { initialMarkdown } from "./initialMarkdown";
import { matchingSlashIds, SlashMenu } from "./SlashMenu";
import { useTheme } from "./useTheme";
import { BlockDragHandle } from "./BlockDragHandle";

type SlashState = { query: string; from: number; to: number; top: number; left: number };

export function App() {
  const [source, setSource] = useState(false);
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [selected, setSelected] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const editor = useEditor({
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "Write something…" }), Markdown],
    content: initialMarkdown,
    contentType: "markdown",
    editorProps: {
      attributes: { class: "editor-prose", "aria-label": "Markdown note editor" },
    },
    onUpdate: ({ editor: current }) => {
      const { $from } = current.state.selection;
      const match = $from.parent.type.name === "paragraph" && $from.parent.textContent.match(/(?:^|\s)\/([\w-]*)$/);
      if (!match) { setSlash(null); return; }
      const from = $from.pos - match[1].length - 1;
      const frame = document.querySelector(".editor-frame")?.getBoundingClientRect();
      const cursor = current.view.coordsAtPos($from.pos);
      setSlash(frame ? { query: match[1], from, to: $from.pos, top: cursor.bottom - frame.top + 6, left: Math.max(12, cursor.left - frame.left) } : null);
      setSelected(0);
    },
  });
  const markdown = editor?.getMarkdown() ?? "";
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const insertBlock = (id: string) => {
    if (!editor || !slash) return;
    const chain = editor.chain().focus().deleteRange({ from: slash.from, to: slash.to });
    if (id === "paragraph") chain.setParagraph().run();
    else if (id.startsWith("heading")) chain.setHeading({ level: Number(id.slice(-1)) as 1 | 2 | 3 }).run();
    else if (id === "bullet") chain.toggleBulletList().run();
    else if (id === "number") chain.toggleOrderedList().run();
    else if (id === "task") chain.toggleTaskList().run();
    else if (id === "quote") chain.toggleBlockquote().run();
    else if (id === "code") chain.toggleCodeBlock().run();
    else chain.setHorizontalRule().run();
    setSlash(null);
  };

  const handleMenuKeys = (event: KeyboardEvent) => {
    if (!slash || !editor || !event.target || !(event.target as HTMLElement).closest(".ProseMirror")) return;
    const ids = matchingSlashIds(slash.query);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setSelected(value => Math.max(0, Math.min(ids.length - 1, value + (event.key === "ArrowDown" ? 1 : -1)))); }
    if (event.key === "Escape") { event.preventDefault(); setSlash(null); }
    if (event.key === "Enter") { event.preventDefault(); const id = ids[selected]; if (id) insertBlock(id); }
  };

  return <main className="app-shell">
    <header className="topbar"><div className="brand-lockup" aria-label="Marnote"><img className="brand-mark" src="/brand/mark.svg" alt="" /><span className="brand-name">marnote</span></div><span className="topbar-divider" />
      <span className="crumb">Untitled note</span><span className="local-badge"><i /> Local draft</span>
      <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
    </header>
    <section className="workspace">
      <div className="document-meta"><div className="doc-icon">✎</div><span>PERSONAL NOTE</span></div>
      <input className="title-input" aria-label="Note title" placeholder="Untitled" defaultValue="A note to begin with" />
      <div className="doc-subtitle">A quiet place for your thoughts.</div>
      <div className="editor-frame" onKeyDownCapture={handleMenuKeys}>
        <EditorToolbar editor={editor} source={source} onToggleSource={() => setSource(!source)} />
        {source ? <pre className="markdown-source">{markdown}</pre> : <><EditorContent editor={editor} />{editor && <BlockDragHandle editor={editor} />}{slash && <SlashMenu query={slash.query} selected={selected} position={{ top: slash.top, left: slash.left }} onSelect={insertBlock} />}</>}
        <footer className="editor-footer"><span>Markdown formatting supported</span><span>{words} words <b>·</b> Markdown</span></footer>
      </div>
    </section>
  </main>;
}
