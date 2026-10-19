import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import { EditorToolbar } from "./EditorToolbar";
import { initialMarkdown } from "./initialMarkdown";
import { matchingSlashIds, SlashMenu } from "./SlashMenu";
import { BlockDragHandle } from "./BlockDragHandle";
import { TableEdgeControls } from "./TableEdgeControls";
import { clearColumnWidths } from "./tableResize";
import type { WorkspaceEntryMetadata } from "../../shared/domain/workspace";
import { tagTextColor } from "../../shared/ui/tagStyle";
import { requestTagEdit } from "../../shared/ui/tagEditRequest";

type SlashState = { query: string; from: number; to: number; top: number; left: number; maxHeight: number };
function slashPosition(editor: Editor, position: number) {
  const cursor = editor.view.coordsAtPos(position);
  const below = window.innerHeight - cursor.bottom - 12;
  const above = cursor.top - 12;
  const opensAbove = above > below;
  const maxHeight = Math.max(60, Math.min(340, (opensAbove ? above : below) - 12));
  return {
    top: Math.max(12, opensAbove ? cursor.top - maxHeight - 6 : cursor.bottom + 6),
    left: Math.max(12, Math.min(cursor.left, window.innerWidth - 282)),
    maxHeight,
  };
}
export function NoteEditor({ value, onChange, source, onToggleSource, horizontalScroll, onToggleHorizontalScroll, heading, metadata, tagColors = {} }: { value: string; onChange: (value: string) => void; source: boolean; onToggleSource: () => void; horizontalScroll: boolean; onToggleHorizontalScroll: () => void; heading: ReactNode; metadata?: WorkspaceEntryMetadata; tagColors?: Record<string, string> }) {
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [selected, setSelected] = useState(0);
  const editor = useEditor({ extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), TableKit.configure({ table: { cellMinWidth: 120 } }), Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "Write something…" }), Markdown], content: value || initialMarkdown, contentType: "markdown", editorProps: { attributes: { class: "editor-prose", "aria-label": "Markdown note editor" } }, onUpdate: ({ editor: current }) => {
    onChange(current.getMarkdown());
    const { $from } = current.state.selection;
    const match = $from.parent.type.name === "paragraph" && $from.parent.textContent.match(/(?:^|\s)\/([\w-]*)$/);
    if (!match) { setSlash(null); return; }
    const from = $from.pos - match[1].length - 1;
    setSlash({ query: match[1], from, to: $from.pos, ...slashPosition(current, $from.pos) });
    setSelected(0);
  } });
  useEffect(() => { if (editor && !horizontalScroll) clearColumnWidths(editor); }, [editor, horizontalScroll]);
  useEffect(() => {
    if (!editor || !slash) return;
    const update = () => setSlash(current => current ? { ...current, ...slashPosition(editor, current.to) } : current);
    const canvas = editor.view.dom.closest(".editor-canvas");
    canvas?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      canvas?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [editor, slash?.to]);
  useEffect(() => { if (editor && editor.getMarkdown() !== value) editor.commands.setContent(value || "", { contentType: "markdown", emitUpdate: false }); }, [editor, value]);
  const markdown = editor?.getMarkdown() ?? value;
  const insert = (id: string) => { if (!editor || !slash) return; const chain = editor.chain().focus().deleteRange({ from: slash.from, to: slash.to }); if (id === "paragraph") chain.setParagraph().run(); else if (id.startsWith("heading")) chain.setHeading({ level: Number(id.slice(-1)) as 1 | 2 | 3 }).run(); else if (id === "bullet") chain.toggleBulletList().run(); else if (id === "number") chain.toggleOrderedList().run(); else if (id === "task") chain.toggleTaskList().run(); else if (id === "quote") chain.toggleBlockquote().run(); else if (id === "code") chain.toggleCodeBlock().run(); else if (id === "table") chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); else chain.setHorizontalRule().run(); setSlash(null); };
  const keys = (event: KeyboardEvent) => { if (!slash || !editor || !(event.target as HTMLElement).closest(".ProseMirror")) return; const ids = matchingSlashIds(slash.query); if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setSelected(v => Math.max(0, Math.min(ids.length - 1, v + (event.key === "ArrowDown" ? 1 : -1)))); } if (event.key === "Escape") { event.preventDefault(); setSlash(null); } if (event.key === "Enter") { event.preventDefault(); if (ids[selected]) insert(ids[selected]); } };
  return <div className={`editor-frame ${horizontalScroll ? "wide-content-scroll" : "wide-content-wrap"}`} onKeyDownCapture={keys}><EditorToolbar editor={editor} source={source} onToggleSource={onToggleSource} horizontalScroll={horizontalScroll} onToggleHorizontalScroll={onToggleHorizontalScroll} /><div className="editor-canvas"><div className="note-heading">{heading}{metadata && <div className="note-meta"><span className="note-meta-icon">{metadata.icon}</span>{metadata.favorite && <Star size={14} className="note-meta-favorite" aria-label="Favorite" />}{metadata.tags && metadata.tags.length > 0 && <span className="note-meta-tags">{metadata.tags.map(tag => { const color = tagColors[tag] ?? "#eff1eb"; return <button type="button" key={tag} className="note-meta-tag" style={{ backgroundColor: color, color: tagTextColor(color) }} onClick={() => requestTagEdit(tag)} title={`Edit ${tag}`}>#{tag}</button>; })}</span>}</div>}</div>{source ? <pre className="markdown-source">{markdown}</pre> : editor ? <TableEdgeControls editor={editor} resizeEnabled={horizontalScroll}><EditorContent editor={editor} /><BlockDragHandle editor={editor} /></TableEdgeControls> : <EditorContent editor={editor} />}{slash && <SlashMenu query={slash.query} selected={selected} position={{ top: slash.top, left: slash.left, maxHeight: slash.maxHeight }} onSelect={insert} />}</div></div>;
}
