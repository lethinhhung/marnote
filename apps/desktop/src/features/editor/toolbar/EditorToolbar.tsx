import { useEditorState, type Editor } from "@tiptap/react";
import { useRef, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { AlignLeft, AlignCenter, AlignRight, Bold, ChevronDown, Folder, Link2, MoveHorizontal, MoreHorizontal, Pilcrow, Save, Table2 } from "lucide-react";
import "./toolbar-responsive.css";
import { LinkDialog } from "./dialogs/LinkDialog";
import { setColumnAlignment } from "../table-controls/tableAlignment";
import { actions, actionGroups, moreActions, toolbarGlyph } from "../toolbarActions";
import type { Entry } from "../../../shared/domain/workspace";
import { WorkspaceLinkPalette } from "./dialogs/WorkspaceLinkPalette";
import { EditorZoom } from "./EditorZoom";
import { useEditorLinkDialogs, type LinkDialogState, type WorkspaceLinkState } from "./useEditorLinkDialogs";

type Props = { editor: Editor | null; source: boolean; horizontalScroll: boolean; onToggleHorizontalScroll: () => void; onSave: () => void; dirty: boolean; saving: boolean; path: string; entries: Entry[]; zoom?: number; onZoomDecrease?: () => void; onZoomIncrease?: () => void; onZoomReset?: () => void; linkDialog?: LinkDialogState; workspaceLink?: WorkspaceLinkState; openLinkDialog?: (href: string, text: string) => void; openWorkspaceLinkPicker?: (text: string) => void; cancelLinkDialog?: () => void; closeWorkspacePicker?: () => void; applyLink?: (text: string, url: string) => void; applyWorkspaceLink?: (entry: Entry) => void };

export function EditorToolbar({ editor, source, horizontalScroll, onToggleHorizontalScroll, onSave, dirty, saving, path, entries, zoom = 100, onZoomDecrease = () => {}, onZoomIncrease = () => {}, onZoomReset = () => {}, linkDialog: propsLinkDialog, workspaceLink: propsWorkspaceLink, openLinkDialog: propsOpenLinkDialog, openWorkspaceLinkPicker: propsOpenWorkspaceLinkPicker, cancelLinkDialog: propsCancelLinkDialog, closeWorkspacePicker: propsCloseWorkspacePicker, applyLink: propsApplyLink, applyWorkspaceLink: propsApplyWorkspaceLink }: Props) {
  const activeActions = useEditorState({ editor, selector: ({ editor: current }) => actions.map(action => !!current && !!action.active?.(current)) });
  const inTable = useEditorState({ editor, selector: ({ editor: current }) => !!current?.isActive("table") }) ?? false;
  const supportsWideContent = useEditorState({ editor, selector: ({ editor: current }) => !!current && (current.isActive("table") || current.isActive("codeBlock")) }) ?? false;
  const toolbar = useRef<HTMLDivElement>(null);
  const {
    linkDialog: hookLinkDialog,
    workspaceLink: hookWorkspaceLink,
    openLinkDialog: hookOpenLinkDialog,
    openWorkspaceLinkPicker: hookOpenWorkspaceLinkPicker,
    cancelLinkDialog: hookCancelLinkDialog,
    closeWorkspacePicker: hookCloseWorkspacePicker,
    applyLink: hookApplyLink,
    applyWorkspaceLink: hookApplyWorkspaceLink,
  } = useEditorLinkDialogs({ editor, path });

  const linkDialog = propsLinkDialog ?? hookLinkDialog;
  const workspaceLink = propsWorkspaceLink ?? hookWorkspaceLink;
  const openLinkDialog = propsOpenLinkDialog ?? hookOpenLinkDialog;
  const openWorkspaceLinkPicker = propsOpenWorkspaceLinkPicker ?? hookOpenWorkspaceLinkPicker;
  const cancelLinkDialog = propsCancelLinkDialog ?? hookCancelLinkDialog;
  const closeWorkspacePicker = propsCloseWorkspacePicker ?? hookCloseWorkspacePicker;
  const applyLink = propsApplyLink ?? hookApplyLink;
  const applyWorkspaceLink = propsApplyWorkspaceLink ?? hookApplyWorkspaceLink;

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
  const renderLinkAction = (compact = false) => <button type="button" className={`tool toolbar-link-action${compact ? " compact-tool toolbar-link-menu-item" : " toolbar-link-desktop"}${linkDialog.open ? " active" : ""}`} title="Add web address link" aria-label="Add web address link" disabled={!editor} onMouseDown={event => { event.preventDefault(); if (editor) { const range = editor.state.selection; openLinkDialog(editor.getAttributes("link").href ?? "", editor.state.doc.textBetween(range.from, range.to, " ")); } }} onClick={() => openLinkDialog("", "")}><Link2 size={14} />{compact && <span>Add web address link</span>}</button>;
  const renderWorkspaceLinkAction = (compact = false) => <button type="button" className={`tool${compact ? " compact-tool" : ""}${workspaceLink.open ? " active" : ""}`} title="Link to a note or folder" aria-label="Link to a note or folder" disabled={!editor} onMouseDown={event => { event.preventDefault(); if (editor) { const range = editor.state.selection; openWorkspaceLinkPicker(editor.state.doc.textBetween(range.from, range.to, " ")); } }} onClick={() => openWorkspaceLinkPicker("")}><Folder size={14} />{compact && <span>Link to a note or folder</span>}</button>;
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
    {linkDialog.open && <LinkDialog initialText={linkDialog.text} initialHref={linkDialog.href} onCancel={cancelLinkDialog} onApply={applyLink} />}
    {workspaceLink.open && createPortal(<WorkspaceLinkPalette entries={entries} onClose={closeWorkspacePicker} onSelect={applyWorkspaceLink} />, document.body)}
    <span className="toolbar-spacer" />
    <div className="toolbar-utility">
      <EditorZoom value={zoom} onDecrease={onZoomDecrease} onIncrease={onZoomIncrease} onReset={onZoomReset} />
      {!source && supportsWideContent && <button type="button" className={horizontalScroll ? "tool active wide-content-toggle" : "tool wide-content-toggle"} title={horizontalScroll ? "Disable horizontal scrolling" : "Enable horizontal scrolling"} aria-label={horizontalScroll ? "Disable horizontal scrolling" : "Enable horizontal scrolling"} aria-pressed={horizontalScroll} onClick={onToggleHorizontalScroll}><MoveHorizontal size={16} /><span>{horizontalScroll ? "Scroll" : "Wrap"}</span></button>}
      <button type="button" className="tool toolbar-save" onClick={onSave} disabled={!dirty || saving} title="Save note (⌘S / Ctrl+S)" aria-label="Save note"><Save size={14} /><span>Save</span></button>
    </div>
  </div>;
}

function keepEditorSelection(event: React.MouseEvent<HTMLButtonElement>) { event.preventDefault(); }
