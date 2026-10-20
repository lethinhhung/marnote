import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FormEvent, KeyboardEvent } from "react";
import type { ReactNode } from "react";
import { File, FileText } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import { MarkdownPaste } from "./MarkdownPaste";
import { EditorToolbar } from "./EditorToolbar";
import { initialMarkdown } from "./initialMarkdown";
import { matchingSlashIds, SlashMenu } from "./SlashMenu";
import { slashPosition } from "./slashPosition";
import { BlockDragHandle } from "./BlockDragHandle";
import { TableEdgeControls } from "./TableEdgeControls";
import { clearColumnWidths } from "./tableResize";
import type { Entry, WorkspaceEntryMetadata } from "../../shared/domain/workspace";
import { tagStyle } from "../../shared/ui/tagStyle";
import { requestTagEdit } from "../../shared/ui/tagEditRequest";
import { EmojiPicker } from "../../shared/ui/EmojiPicker";
import { useEditorLinkPreview } from "./useEditorLinkPreview";
import { normalizeLinkUrl, openExternalLink } from "./linkUrl";
import { findWorkspaceLink } from "./workspaceLinks";
import "./editor-reference.css";

type SlashState = { query: string; from: number; to: number; top: number; left: number; maxHeight: number };
type SlashLinkState = { from: number; to: number; top: number; bottom: number; left: number };
export function NoteEditor({ value, onChange, source, horizontalScroll, onToggleHorizontalScroll, heading, metadata, updateMetadata, path, tagColors = {}, entries, onNavigate }: { value: string; onChange: (value: string) => void; source: boolean; horizontalScroll: boolean; onToggleHorizontalScroll: () => void; heading: ReactNode; metadata?: WorkspaceEntryMetadata; updateMetadata: (path: string, metadata: { icon?: string }) => void; path: string; tagColors?: Record<string, string>; entries: Entry[]; onNavigate: (path: string, kind: "file" | "directory") => void }) {
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [slashLink, setSlashLink] = useState<SlashLinkState | null>(null);
  const [linkPosition, setLinkPosition] = useState({ top: 12, left: 12 });
  const linkForm = useRef<HTMLFormElement>(null);
  const [linkText, setLinkText] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [selected, setSelected] = useState(0);
  const editor = useEditor({ extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), TableKit.configure({ table: { cellMinWidth: 120 } }), Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "Write something…" }), Markdown, MarkdownPaste], content: value || initialMarkdown, contentType: "markdown", editorProps: { attributes: { class: "editor-prose", "aria-label": "Markdown note editor" } }, onUpdate: ({ editor: current }) => {
    onChange(current.getMarkdown());
    const { $from } = current.state.selection;
    const match = $from.parent.type.name === "paragraph" && $from.parent.textContent.match(/(?:^|\s)\/([\w-]*)$/);
    if (!match) { setSlash(null); return; }
    const from = $from.pos - match[1].length - 1;
    setSlash({ query: match[1], from, to: $from.pos, ...slashPosition(current, $from.pos, match[1]) });
    setSelected(0);
  } });
  useEffect(() => {
    const suppressEditorLinkClick = (event: MouseEvent) => {
      const target = event.target;
      const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
      if (!element?.closest(".editor-prose a[href]")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener("click", suppressEditorLinkClick, true);
    return () => document.removeEventListener("click", suppressEditorLinkClick, true);
  }, []);
  const navigateHref = (value: string) => { const entry = findWorkspaceLink(entries, path, value) ?? findWorkspaceLink(entries, path, normalizeLinkUrl(value)); if (entry) { onNavigate(entry.path, entry.kind); return; } void openExternalLink(normalizeLinkUrl(value)); };
  const linkHover = useEditorLinkPreview(editor, navigateHref);
  useEffect(() => { if (editor && !horizontalScroll) clearColumnWidths(editor); }, [editor, horizontalScroll]);
  useEffect(() => {
    if (!editor || !slash) return;
    const update = () => setSlash(current => current ? { ...current, ...slashPosition(editor, current.to, current.query) } : current);
    const canvas = editor.view.dom.closest(".editor-canvas");
    canvas?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      canvas?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [editor, slash?.to, slash?.query]);
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
  useEffect(() => { if (editor && editor.getMarkdown() !== value) editor.commands.setContent(value || "", { contentType: "markdown", emitUpdate: false }); }, [editor, value]);
  useLayoutEffect(() => {
    if (!slashLink || !linkForm.current) return;
    const place = () => {
      const height = linkForm.current?.getBoundingClientRect().height ?? 190;
      const width = linkForm.current?.getBoundingClientRect().width ?? 300;
      const below = window.innerHeight - slashLink.bottom - 12;
      const above = slashLink.top - 12;
      const top = below >= height || below >= above ? slashLink.bottom + 6 : Math.max(12, slashLink.top - height - 6);
      const maxTop = Math.max(12, window.innerHeight - height - 12);
      setLinkPosition({ top: Math.max(12, Math.min(top, maxTop)), left: Math.max(12, Math.min(slashLink.left, window.innerWidth - width - 12)) });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [slashLink]);
  const markdown = value;
  const insert = (id: string) => { if (!editor || !slash) return; if (id === "link") { const cursor = editor.view.coordsAtPos(slash.to); setSlashLink({ from: slash.from, to: slash.to, top: cursor.top, bottom: cursor.bottom, left: cursor.left }); setLinkText(""); setLinkHref(""); setSlash(null); return; } const chain = editor.chain().focus().deleteRange({ from: slash.from, to: slash.to }); if (id === "paragraph") chain.setParagraph().run(); else if (id.startsWith("heading")) chain.setHeading({ level: Number(id.slice(-1)) as 1 | 2 | 3 }).run(); else if (id === "bullet") chain.toggleBulletList().run(); else if (id === "number") chain.toggleOrderedList().run(); else if (id === "task") chain.toggleTaskList().run(); else if (id === "quote") chain.toggleBlockquote().run(); else if (id === "code") chain.toggleCodeBlock().run(); else if (id === "table") chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); else chain.setHorizontalRule().run(); setSlash(null); };
  const applySlashLink = (event: FormEvent) => { event.preventDefault(); const href = normalizeLinkUrl(linkHref); const text = linkText.trim(); if (!editor || !slashLink || !href || !text) return; editor.chain().focus().deleteRange({ from: slashLink.from, to: slashLink.to }).insertContent({ type: "text", text, marks: [{ type: "link", attrs: { href } }] }).run(); setSlashLink(null); };
  const keys = (event: KeyboardEvent) => { if (!slash || !editor || !(event.target as HTMLElement).closest(".ProseMirror")) return; const ids = matchingSlashIds(slash.query); if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setSelected(v => Math.max(0, Math.min(ids.length - 1, v + (event.key === "ArrowDown" ? 1 : -1)))); } if (event.key === "Escape") { event.preventDefault(); setSlash(null); } if (event.key === "Enter") { event.preventDefault(); if (ids[selected]) insert(ids[selected]); } };
  return <div className={`editor-frame ${horizontalScroll ? "wide-content-scroll" : "wide-content-wrap"}`} onKeyDownCapture={keys} onMouseOverCapture={linkHover.onMouseOverCapture} onMouseOutCapture={linkHover.onMouseOutCapture}><EditorToolbar editor={editor} source={source} horizontalScroll={horizontalScroll} onToggleHorizontalScroll={onToggleHorizontalScroll} path={path} entries={entries} /><div className="editor-canvas"><div className="note-heading"><EmojiPicker value={metadata?.icon} label="Change note icon" fallback={value.length === 0 ? <File size={28} strokeWidth={1.5} /> : <FileText size={28} strokeWidth={1.5} />} onChange={icon => updateMetadata(path, { icon })} />{heading}{metadata?.tags && metadata.tags.length > 0 && <div className="note-meta"><span className="note-meta-tags">{metadata.tags.map(tag => { const color = tagColors[tag] ?? "#526b58"; return <button type="button" key={tag} className="note-meta-tag" style={tagStyle(color, "#f8f7f4")} onClick={() => requestTagEdit(tag)} title={`Edit ${tag}`}>#{tag}</button>; })}</span></div>}</div>{source ? <pre className="markdown-source">{markdown}</pre> : editor ? <TableEdgeControls editor={editor} resizeEnabled={horizontalScroll}><EditorContent editor={editor} /><BlockDragHandle editor={editor} /></TableEdgeControls> : <EditorContent editor={editor} />}{slash && <SlashMenu query={slash.query} selected={selected} position={{ top: slash.top, left: slash.left, maxHeight: slash.maxHeight }} onSelect={insert} />}{slashLink && createPortal(<form ref={linkForm} className="link-popover slash-link-popover" style={linkPosition} onSubmit={applySlashLink}><label htmlFor="slash-link-text">Text</label><input id="slash-link-text" autoFocus placeholder="Link text" value={linkText} onChange={event => setLinkText(event.target.value)} onKeyDown={event => event.key === "Escape" && setSlashLink(null)} /><label htmlFor="slash-link-url">URL</label><input id="slash-link-url" placeholder="https://example.com" value={linkHref} onChange={event => setLinkHref(event.target.value)} onKeyDown={event => event.key === "Escape" && setSlashLink(null)} /><div><button type="button" onClick={() => setSlashLink(null)}>Cancel</button><button type="submit" disabled={!linkText.trim() || !linkHref.trim()}>Insert link</button></div></form>, document.body)}{linkHover.overlay}</div></div>;
}
