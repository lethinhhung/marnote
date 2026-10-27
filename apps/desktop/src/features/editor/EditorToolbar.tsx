import { useEditorState, type Editor } from "@tiptap/react";
import { useEffect, useRef, useState, type MouseEvent, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { AlignLeft, AlignCenter, AlignRight, Bold, ChevronDown, Folder, Link2, MoveHorizontal, MoreHorizontal, Pilcrow, Save, Table2 } from "lucide-react";
import "./toolbar-responsive.css";
import { LinkDialog } from "./links/LinkDialog";
import { setColumnAlignment } from "./table-controls/tableAlignment";
import { actions, actionGroups, moreActions, toolbarGlyph } from "./toolbarActions";
import type { Entry } from "../../shared/domain/workspace";
import { WorkspaceLinkPalette } from "./links/WorkspaceLinkPalette";
import { relativeWorkspaceLink } from "./links/workspaceLinks";

type Props = { editor: Editor | null; source: boolean; horizontalScroll: boolean; onToggleHorizontalScroll: () => void; onSave: () => void; dirty: boolean; saving: boolean; path: string; entries: Entry[] };

export function EditorToolbar({ editor, source, horizontalScroll, onToggleHorizontalScroll, onSave, dirty, saving, path, entries }: Props) {
  const activeActions = useEditorState({ editor, selector: ({ editor: current }) => actions.map(action => !!current && !!action.active?.(current)) });
  const inTable = useEditorState({ editor, selector: ({ editor: current }) => !!current?.isActive("table") }) ?? false;
  const supportsWideContent = useEditorState({ editor, selector: ({ editor: current }) => !!current && (current.isActive("table") || current.isActive("codeBlock")) }) ?? false;
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const [linkText, setLinkText] = useState("");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const selection = useRef({ from: 0, to: 0 });
  const toolbar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!editor) return;
    const closeMenus = () => toolbar.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(menu => { menu.open = false; });
    const editLink = (event: Event) => { const detail = (event as CustomEvent<{ href: string; text: string; from: number; to: number }>).detail; if (!detail) return; selection.current = { from: detail.from, to: detail.to }; setHref(detail.href); setLinkText(detail.text); if (!/^[a-z][a-z\d+.-]*:/i.test(detail.href) && !detail.href.startsWith("//")) { setLinkOpen(false); setWorkspaceOpen(true); } else { setWorkspaceOpen(false); setLinkOpen(true); } };
    editor.on("focus", closeMenus);
    document.addEventListener("marnote-edit-link", editLink);
    return () => { editor.off("focus", closeMenus); document.removeEventListener("marnote-edit-link", editLink); };
  }, [editor, entries, path]);
  const keepOnlyOpenMenu = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (!event.currentTarget.open) return;
    toolbar.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(menu => {
      if (menu !== event.currentTarget) menu.open = false;
    });
  };
  const renderAction = (index: number, compact = false) => {
    const { label, icon: Icon, run } = actions[index];
    const selected = activeActions?.[index] ?? false;
    return <button type="button" key={label} className={`${selected ? "tool active" : "tool"}${compact ? ` compact-tool compact-tool-action-${index}` : ""}`} title={label} aria-label={label} aria-pressed={selected} disabled={!editor} onClick={() => { if (editor) run(editor); }}><span className={`tool-glyph tool-glyph-${index}`}>{toolbarGlyph(index)}</span><Icon className="tool-icon" size={14} strokeWidth={1.8} />{compact && <span>{label}</span>}</button>;
  };
  const renderLinkAction = (compact = false) => <button type="button" className={`tool toolbar-link-action${compact ? " compact-tool toolbar-link-menu-item" : " toolbar-link-desktop"}${linkOpen ? " active" : ""}`} title="Add web address link" aria-label="Add web address link" disabled={!editor} onMouseDown={event => { event.preventDefault(); if (editor) { const range = editor.state.selection; selection.current = range; setHref(editor.getAttributes("link").href ?? ""); setLinkText(editor.state.doc.textBetween(range.from, range.to, " ")); } }} onClick={() => { setWorkspaceOpen(false); setLinkOpen(open => !open); }}><Link2 size={14} />{compact && <span>Add web address link</span>}</button>;
  const renderWorkspaceLinkAction = (compact = false) => <button type="button" className={`tool${compact ? " compact-tool" : ""}${workspaceOpen ? " active" : ""}`} title="Link to a note or folder" aria-label="Link to a note or folder" disabled={!editor} onMouseDown={event => { event.preventDefault(); if (editor) { const range = editor.state.selection; selection.current = range; setLinkText(editor.state.doc.textBetween(range.from, range.to, " ")); } }} onClick={() => { setLinkOpen(false); setWorkspaceOpen(open => !open); }}><Folder size={14} />{compact && <span>Link to a note or folder</span>}</button>;
  const cancelLinkDialog = () => { setLinkOpen(false); if (editor) editor.chain().focus().setTextSelection(selection.current).run(); };
  const closeWorkspacePicker = () => { setWorkspaceOpen(false); if (editor) editor.chain().focus().setTextSelection(selection.current).run(); };
  const actionMenu = (label: string, Icon: typeof Pilcrow, indexes: number[], className = "") => <details className={`toolbar-action-menu ${className}`} key={label} onToggle={keepOnlyOpenMenu} onClick={event => { if ((event.target as HTMLElement).closest("button")) event.currentTarget.open = false; }}><summary aria-label={label} title={label}><Icon size={14} /><span>{label}</span><ChevronDown size={12} /></summary><div className="toolbar-action-menu-panel">{indexes.map(index => renderAction(index, true))}</div></details>;
  const tableControls = <>
    {([ ["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight] ] as const).map(([align, Icon]) => <button type="button" className="table-align-button" key={align} title={`Align current column ${align}`} aria-label={`Align current column ${align}`} onMouseDown={keepEditorSelection} onClick={() => editor && setColumnAlignment(editor, align)}><Icon size={11} /><span>{align[0].toUpperCase() + align.slice(1)}</span></button>)}
    <button type="button" title="Add row below" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().addRowAfter().run()}>+ Row</button>
    <button type="button" title="Add column to the right" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().addColumnAfter().run()}>+ Column</button>
    <button type="button" title="Delete current row" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().deleteRow().run()}>− Row</button>
    <button type="button" title="Delete current column" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().deleteColumn().run()}>− Column</button>
    <button type="button" title="Toggle header row" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().toggleHeaderRow().run()}>Header</button>
    <button type="button" title="Delete table" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().deleteTable().run()}>Delete</button>
  </>;
  const addLink = (text: string, url: string) => {
    if (!editor || !url) return;
    const range = selection.current;
    const label = text || url;
    const chain = editor.chain().focus().setTextSelection(range);
    if (range.from === range.to && editor.isActive("link")) chain.extendMarkRange("link").setLink({ href: url }).run();
    else chain.insertContent({ type: "text", text: label, marks: [{ type: "link", attrs: { href: url } }] }).run();
    setLinkOpen(false);
    setHref("");
    setLinkText("");
  };
  const addWorkspaceLink = (entry: Entry) => {
    if (!editor) return;
    const range = selection.current;
    const text = linkText.trim() || entry.name;
    editor.chain().focus().setTextSelection(range).insertContent({ type: "text", text, marks: [{ type: "link", attrs: { href: relativeWorkspaceLink(path, entry) } }] }).run();
    setWorkspaceOpen(false);
    setLinkText("");
  };
  return <div ref={toolbar} className="toolbar" role="toolbar" aria-label="Formatting">
    <div className="toolbar-actions">
      <div className="tool-group toolbar-expanded-controls">
        <div className="toolbar-control-group toolbar-desktop-group toolbar-text-desktop">{actionGroups[0].map(index => <span className={`tool-item action-item-${index}`} key={actions[index].label}>{renderAction(index)}</span>)}</div>
        {actionMenu("Text / headings", Pilcrow, actionGroups[0], "toolbar-responsive-menu toolbar-text-menu")}
        <div className="toolbar-control-group toolbar-desktop-group toolbar-style-desktop"><i className="toolbar-group-divider" />{actionGroups[1].map(index => <span className={`tool-item action-item-${index}`} key={actions[index].label}>{renderAction(index)}</span>)}</div>
        {actionMenu("Text style", Bold, actionGroups[1], "toolbar-responsive-menu toolbar-style-menu")}
        <div className="toolbar-control-group toolbar-desktop-group toolbar-block-desktop"><i className="toolbar-group-divider" />{actionGroups[2].map(index => <span className={`tool-item action-item-${index}`} key={actions[index].label}>{renderAction(index)}</span>)}{renderLinkAction()}{renderWorkspaceLinkAction()}</div>
        <div className="toolbar-more-controls"><details className="toolbar-action-menu toolbar-more-menu" onToggle={keepOnlyOpenMenu} onClick={event => { if ((event.target as HTMLElement).closest("button")) event.currentTarget.open = false; }}><summary aria-label="More blocks" title="More blocks"><MoreHorizontal size={14} /><span>More</span><ChevronDown size={12} /></summary><div className="toolbar-action-menu-panel">{moreActions.map(index => renderAction(index, true))}{renderLinkAction(true)}{renderWorkspaceLinkAction(true)}</div></details></div>
        <i className="toolbar-group-divider toolbar-table-divider" />
        <button type="button" className="tool" title="Insert table" aria-label="Insert table" disabled={!editor} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 size={16} strokeWidth={1.8} /></button>
      </div>
      {inTable && <><details className="table-actions-menu" onToggle={keepOnlyOpenMenu} onClick={event => { if ((event.target as HTMLElement).closest("button")) event.currentTarget.open = false; }}><summary aria-label="Table actions" title="Table actions"><Table2 size={14} /><span>Table Actions</span><ChevronDown size={12} /></summary><div className="table-actions-menu-panel"><div className="table-actions" role="group" aria-label="Table controls">{tableControls}</div></div></details><div className="table-actions table-actions-expanded" role="group" aria-label="Table controls">{tableControls}</div></>}
    </div>
    {linkOpen && <LinkDialog initialText={linkText} initialHref={href} onCancel={cancelLinkDialog} onApply={addLink} />}
    {workspaceOpen && createPortal(<WorkspaceLinkPalette entries={entries} onClose={closeWorkspacePicker} onSelect={addWorkspaceLink} />, document.body)}
    <span className="toolbar-spacer" />
    <div className="toolbar-utility">
      {!source && supportsWideContent && <button type="button" className={horizontalScroll ? "tool active wide-content-toggle" : "tool wide-content-toggle"} title={horizontalScroll ? "Disable horizontal scrolling" : "Enable horizontal scrolling"} aria-label={horizontalScroll ? "Disable horizontal scrolling" : "Enable horizontal scrolling"} aria-pressed={horizontalScroll} onClick={onToggleHorizontalScroll}><MoveHorizontal size={16} /><span>{horizontalScroll ? "Scroll" : "Wrap"}</span></button>}
      <button type="button" className="tool toolbar-save" onClick={onSave} disabled={!dirty || saving} title="Save note (⌘S / Ctrl+S)" aria-label="Save note"><Save size={14} /><span>Save</span></button>
    </div>
  </div>;
}

function keepEditorSelection(event: MouseEvent<HTMLButtonElement>) { event.preventDefault(); }
