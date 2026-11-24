import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { EDITOR_EXTENSIONS, EDITOR_PROPS } from "./editorExtensions";
import { NoteHeader } from "./NoteHeader";
import { insertMarkdownPaste } from "./MarkdownPaste";
import { EditorToolbar } from "./toolbar/EditorToolbar";
import { SlashMenu } from "./slash-menu/SlashMenu";
import { BlockDragHandle } from "./block-dnd/BlockDragHandle";
import { TableEdgeControls } from "./table-controls/TableEdgeControls";
import { clearColumnWidths } from "./table-controls/tableResize";
import type { Entry, WorkspaceEntryMetadata } from "../../shared/domain/workspace";
import { useEditorLinkPreview } from "./links/useEditorLinkPreview";
import { LinkDialog } from "./toolbar/dialogs/LinkDialog";
import { WorkspaceLinkPalette } from "./toolbar/dialogs/WorkspaceLinkPalette";
import { useSlashMenu } from "./slash-menu/useSlashMenu";
import { useEditorEmoji } from "./useEditorEmoji";
import { InlineEmojiMenu } from "./InlineEmojiMenu";
import { useSlashLink } from "./links/useSlashLink";
import { useEditorZoom } from "./useEditorZoom";
import { BacklinksPanel } from "./links/BacklinksPanel";
import "./editor-reference.css";

export function NoteEditor({ value, onChange, source, horizontalScroll, onToggleHorizontalScroll, onSave, dirty, saving, heading, metadata, updateMetadata, path, rootPath = "", tagColors = {}, entries, onNavigate }: { value: string; onChange: (value: string) => void; source: boolean; horizontalScroll: boolean; onToggleHorizontalScroll: () => void; onSave: () => void; dirty: boolean; saving: boolean; heading: ReactNode; metadata?: WorkspaceEntryMetadata; updateMetadata: (path: string, metadata: { icon?: string }) => void; path: string; rootPath?: string; tagColors?: Record<string, string>; entries: Entry[]; onNavigate: (path: string, kind: "file" | "directory") => void }) {
  const editorRef = useRef<Editor | null>(null);
  const initialContent = useRef(value);
  const zoom = useEditorZoom();
  const emoji = useEditorEmoji({ editorRef });

  const {
    slash,
    selected,
    setSelected,
    slashKeyboardNavigation,
    setSlashKeyboardNavigation,
    insert,
    keys,
    handleEditorUpdate,
  } = useSlashMenu({ editorRef, onEmoji: emoji.openPicker });

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
    navigateHref,
  } = useSlashLink({ entries, path, onNavigate, editorRef });

  const editor = useEditor({ extensions: EDITOR_EXTENSIONS, content: initialContent.current, contentType: "markdown", editorProps: EDITOR_PROPS, onUpdate: ({ editor: current }) => {
    onChange(current.getMarkdown());
    handleEditorUpdate();
    emoji.update();
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
  const linkHover = useEditorLinkPreview({ editor, entries, path, goTo: navigateHref });
  useEffect(() => { if (editor && !horizontalScroll) clearColumnWidths(editor); }, [editor, horizontalScroll]);
  useEffect(() => { if (editor && editor.getMarkdown() !== value) editor.commands.setContent(value || "", { contentType: "markdown", emitUpdate: false }); }, [editor, value]);

  const markdown = value;
  return <div className={`editor-frame ${horizontalScroll ? "wide-content-scroll" : "wide-content-wrap"}`} onKeyDownCapture={event => { zoom.onKeyDownCapture(event); keys(event); emoji.keys(event); }} onPasteCapture={event => { if (!(event.target as HTMLElement).closest(".ProseMirror") || !editor) return; const inserted = insertMarkdownPaste(event.clipboardData.getData("text/plain"), text => editor.markdown?.parse(text), content => editor.commands.insertContent(content as Parameters<typeof editor.commands.insertContent>[0])); if (inserted) { event.preventDefault(); event.stopPropagation(); } }} onMouseOverCapture={linkHover.onMouseOverCapture} onMouseOutCapture={linkHover.onMouseOutCapture} onFocusCapture={linkHover.onFocusCapture}><EditorToolbar editor={editor} source={source} horizontalScroll={horizontalScroll} onToggleHorizontalScroll={onToggleHorizontalScroll} onSave={onSave} dirty={dirty} saving={saving} path={path} entries={entries} zoom={zoom.zoom} onZoomDecrease={zoom.decrease} onZoomIncrease={zoom.increase} onZoomReset={zoom.reset} /><div className="editor-canvas" style={{ "--editor-zoom": zoom.zoom / 100 } as CSSProperties} onPointerDownCapture={() => document.dispatchEvent(new Event("marnote-clear-folder-focus"))}><NoteHeader value={value} heading={heading} metadata={metadata} path={path} updateMetadata={updateMetadata} tagColors={tagColors} />{source ? <pre className="markdown-source" tabIndex={0} aria-label="Markdown source">{markdown}</pre> : editor ? <TableEdgeControls editor={editor} resizeEnabled={horizontalScroll}><EditorContent editor={editor} /><BlockDragHandle editor={editor} /></TableEdgeControls> : <EditorContent editor={editor} />}{slash && <SlashMenu query={slash.query} selected={selected} keyboardNavigation={slashKeyboardNavigation} position={{ top: slash.top, left: slash.left, maxHeight: slash.maxHeight }} onSelect={insert} onHover={index => { setSlashKeyboardNavigation(false); setSelected(index); }} onScroll={() => setSlashKeyboardNavigation(true)} />}{emoji.menu && !source && <InlineEmojiMenu mode={emoji.menu.mode} query={emoji.menu.query} matches={emoji.matches} selected={emoji.selected} position={{ top: emoji.menu.top, left: emoji.menu.left }} onChoose={emoji.choose} onClose={emoji.close} />}{slashLink && createPortal(<div ref={linkForm} className="slash-link-anchor" style={linkPosition}><LinkDialog initialText={linkText} initialHref={linkHref} onCancel={cancelSlashLink} onDismiss={() => setSlashLink(null)} onApply={applySlashLink} /></div>, document.body)}{workspaceLink && createPortal(<WorkspaceLinkPalette entries={entries} onClose={cancelWorkspaceLink} onSelect={applyWorkspaceLink} />, document.body)}{linkHover.overlay}<BacklinksPanel rootPath={rootPath} path={path} entries={entries} onOpen={target => onNavigate(target, "file")} /></div></div>;
}
