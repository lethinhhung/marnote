import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { File, FileText } from "lucide-react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CodeBlockWithCopy } from "./code-block-copy/CodeBlockWithCopy";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import { insertMarkdownPaste } from "./MarkdownPaste";
import { EditorToolbar } from "./EditorToolbar";
import { initialMarkdown } from "./initialMarkdown";
import { SlashMenu } from "./SlashMenu";
import { BlockDragHandle } from "./BlockDragHandle";
import { TableEdgeControls } from "./TableEdgeControls";
import { clearColumnWidths } from "./tableResize";
import type { Entry, WorkspaceEntryMetadata } from "../../shared/domain/workspace";
import { tagStyle } from "../../shared/ui/tagStyle";
import { requestTagEdit } from "../../shared/ui/tagEditRequest";
import { EmojiPicker } from "../../shared/ui/EmojiPicker";
import { useEditorLinkPreview } from "./useEditorLinkPreview";
import { normalizeLinkUrl, openExternalLink } from "./linkUrl";
import { LinkDialog } from "./LinkDialog";
import { WorkspaceLinkPalette } from "./WorkspaceLinkPalette";
import { useSlashMenu } from "./useSlashMenu";
import { useSlashLink } from "./useSlashLink";
import "./editor-reference.css";

export function NoteEditor({ value, onChange, source, horizontalScroll, onToggleHorizontalScroll, onSave, dirty, saving, heading, metadata, updateMetadata, path, tagColors = {}, entries, onNavigate }: { value: string; onChange: (value: string) => void; source: boolean; horizontalScroll: boolean; onToggleHorizontalScroll: () => void; onSave: () => void; dirty: boolean; saving: boolean; heading: ReactNode; metadata?: WorkspaceEntryMetadata; updateMetadata: (path: string, metadata: { icon?: string }) => void; path: string; tagColors?: Record<string, string>; entries: Entry[]; onNavigate: (path: string, kind: "file" | "directory") => void }) {
  const editorRef = useRef<Editor | null>(null);

  const {
    slash,
    selected,
    setSelected,
    slashKeyboardNavigation,
    setSlashKeyboardNavigation,
    insert,
    keys,
    handleEditorUpdate,
  } = useSlashMenu({ editorRef });

  const {
    slashLink,
    setSlashLink,
    workspaceLink,
    linkPosition,
    linkForm,
    linkText,
    linkHref,
    applySlashLink,
    cancelSlashLink,
    cancelWorkspaceLink,
    applyWorkspaceLink,
  } = useSlashLink({ entries, path, onNavigate, editorRef });

  const editor = useEditor({ extensions: [StarterKit.configure({ codeBlock: false }), CodeBlockWithCopy, TaskList, TaskItem.configure({ nested: true }), TableKit.configure({ table: { cellMinWidth: 120 } }), Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "Write something…" }), Markdown], content: value || initialMarkdown, contentType: "markdown", editorProps: { attributes: { class: "editor-prose", "aria-label": "Markdown note editor" } }, onUpdate: ({ editor: current }) => {
    onChange(current.getMarkdown());
    handleEditorUpdate();
  } });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

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
  const navigateHref = (value: string) => { const entry = entries.find(e => e.path === value) ?? entries.find(e => e.path === value.replace(/^https?:\/\//, "")); if (entry) { onNavigate(entry.path, entry.kind); return; } void openExternalLink(normalizeLinkUrl(value)); };
  const linkHover = useEditorLinkPreview({ editor, entries, path, goTo: navigateHref });
  useEffect(() => { if (editor && !horizontalScroll) clearColumnWidths(editor); }, [editor, horizontalScroll]);
  useEffect(() => { if (editor && editor.getMarkdown() !== value) editor.commands.setContent(value || "", { contentType: "markdown", emitUpdate: false }); }, [editor, value]);

  const markdown = value;
  return <div className={`editor-frame ${horizontalScroll ? "wide-content-scroll" : "wide-content-wrap"}`} onKeyDownCapture={keys} onPasteCapture={event => { if (!(event.target as HTMLElement).closest(".ProseMirror") || !editor) return; const inserted = insertMarkdownPaste(event.clipboardData.getData("text/plain"), text => editor.markdown?.parse(text), content => editor.commands.insertContent(content as Parameters<typeof editor.commands.insertContent>[0])); if (inserted) { event.preventDefault(); event.stopPropagation(); } }} onMouseOverCapture={linkHover.onMouseOverCapture} onMouseOutCapture={linkHover.onMouseOutCapture} onFocusCapture={linkHover.onFocusCapture}><EditorToolbar editor={editor} source={source} horizontalScroll={horizontalScroll} onToggleHorizontalScroll={onToggleHorizontalScroll} onSave={onSave} dirty={dirty} saving={saving} path={path} entries={entries} /><div className="editor-canvas" onPointerDownCapture={() => document.dispatchEvent(new Event("marnote-clear-folder-focus"))}><div className="note-heading"><EmojiPicker value={metadata?.icon} label="Change note icon" fallback={value.length === 0 ? <File size={28} strokeWidth={1.5} /> : <FileText size={28} strokeWidth={1.5} />} onChange={icon => updateMetadata(path, { icon })} />{heading}{metadata?.tags && metadata.tags.length > 0 && <div className="note-meta"><span className="note-meta-tags">{metadata.tags.map(tag => { const color = tagColors[tag] ?? "#526b58"; return <button type="button" key={tag} className="note-meta-tag" style={tagStyle(color, "#f8f7f4")} onClick={() => requestTagEdit(tag)} title={`Edit ${tag}`}>#{tag}</button>; })}</span></div>}</div>{source ? <pre className="markdown-source">{markdown}</pre> : editor ? <TableEdgeControls editor={editor} resizeEnabled={horizontalScroll}><EditorContent editor={editor} /><BlockDragHandle editor={editor} /></TableEdgeControls> : <EditorContent editor={editor} />}{slash && <SlashMenu query={slash.query} selected={selected} keyboardNavigation={slashKeyboardNavigation} position={{ top: slash.top, left: slash.left, maxHeight: slash.maxHeight }} onSelect={insert} onHover={index => { setSlashKeyboardNavigation(false); setSelected(index); }} onScroll={() => setSlashKeyboardNavigation(true)} />}{slashLink && createPortal(<div ref={linkForm} className="slash-link-anchor" style={linkPosition}><LinkDialog initialText={linkText} initialHref={linkHref} onCancel={cancelSlashLink} onDismiss={() => setSlashLink(null)} onApply={applySlashLink} /></div>, document.body)}{workspaceLink && createPortal(<WorkspaceLinkPalette entries={entries} onClose={cancelWorkspaceLink} onSelect={applyWorkspaceLink} />, document.body)}{linkHover.overlay}</div></div>;
}
