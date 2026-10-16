import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorToolbar } from "./EditorToolbar";
import { initialMarkdown } from "./initialMarkdown";
import { matchingSlashIds, SlashMenu } from "./SlashMenu";
import { BlockDragHandle } from "./BlockDragHandle";

type SlashState = { query: string; from: number; to: number; top: number; left: number };
export function NoteEditor({ value, onChange, source, onToggleSource, heading }: { value: string; onChange: (value: string) => void; source: boolean; onToggleSource: () => void; heading: ReactNode }) {
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [selected, setSelected] = useState(0);
  const editor = useEditor({ extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "Write something…" }), Markdown], content: value || initialMarkdown, contentType: "markdown", editorProps: { attributes: { class: "editor-prose", "aria-label": "Markdown note editor" } }, onUpdate: ({ editor: current }) => {
    onChange(current.getMarkdown());
    const { $from } = current.state.selection;
    const match = $from.parent.type.name === "paragraph" && $from.parent.textContent.match(/(?:^|\s)\/([\w-]*)$/);
    if (!match) { setSlash(null); return; }
    const from = $from.pos - match[1].length - 1;
    const frame = document.querySelector(".editor-frame")?.getBoundingClientRect();
    const cursor = current.view.coordsAtPos($from.pos);
    setSlash(frame ? { query: match[1], from, to: $from.pos, top: cursor.bottom - frame.top + 6, left: Math.max(12, cursor.left - frame.left) } : null);
    setSelected(0);
  } });
  useEffect(() => { if (editor && editor.getMarkdown() !== value) editor.commands.setContent(value || "", { contentType: "markdown" }); }, [editor, value]);
  const markdown = editor?.getMarkdown() ?? value;
  const insert = (id: string) => { if (!editor || !slash) return; const chain = editor.chain().focus().deleteRange({ from: slash.from, to: slash.to }); if (id === "paragraph") chain.setParagraph().run(); else if (id.startsWith("heading")) chain.setHeading({ level: Number(id.slice(-1)) as 1 | 2 | 3 }).run(); else if (id === "bullet") chain.toggleBulletList().run(); else if (id === "number") chain.toggleOrderedList().run(); else if (id === "task") chain.toggleTaskList().run(); else if (id === "quote") chain.toggleBlockquote().run(); else if (id === "code") chain.toggleCodeBlock().run(); else chain.setHorizontalRule().run(); setSlash(null); };
  const keys = (event: KeyboardEvent) => { if (!slash || !editor || !(event.target as HTMLElement).closest(".ProseMirror")) return; const ids = matchingSlashIds(slash.query); if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setSelected(v => Math.max(0, Math.min(ids.length - 1, v + (event.key === "ArrowDown" ? 1 : -1)))); } if (event.key === "Escape") { event.preventDefault(); setSlash(null); } if (event.key === "Enter") { event.preventDefault(); if (ids[selected]) insert(ids[selected]); } };
  return <div className="editor-frame" onKeyDownCapture={keys}><EditorToolbar editor={editor} source={source} onToggleSource={onToggleSource} /><div className="editor-canvas"><div className="note-heading">{heading}</div>{source ? <pre className="markdown-source">{markdown}</pre> : <><EditorContent editor={editor} />{editor && <BlockDragHandle editor={editor} />}{slash && <SlashMenu query={slash.query} selected={selected} position={{ top: slash.top, left: slash.left }} onSelect={insert} />}</>}</div></div>;
}
