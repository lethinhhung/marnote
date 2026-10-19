import { useEditorState, type Editor } from "@tiptap/react";
import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Bold, Italic, Strikethrough, Code, Braces, Heading1, Heading2, Heading3, List, ListOrdered, ListChecks, Quote, Minus, Link2, Pilcrow, Table2, MoveHorizontal, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { normalizeLinkUrl } from "./linkUrl";
import { setColumnAlignment } from "./tableAlignment";

type Props = { editor: Editor | null; source: boolean; horizontalScroll: boolean; onToggleHorizontalScroll: () => void; saveStatus?: "saved" | "saving" | "error" };
type Action = { label: string; icon: typeof Bold; run: (editor: Editor) => void; active?: (editor: Editor) => boolean };

const actions: Action[] = [
  { label: "Paragraph", icon: Pilcrow, run: e => e.chain().focus().setParagraph().run(), active: e => e.isActive("paragraph") },
  { label: "Heading 1", icon: Heading1, run: e => e.chain().focus().toggleHeading({ level: 1 }).run(), active: e => e.isActive("heading", { level: 1 }) },
  { label: "Heading 2", icon: Heading2, run: e => e.chain().focus().toggleHeading({ level: 2 }).run(), active: e => e.isActive("heading", { level: 2 }) },
  { label: "Heading 3", icon: Heading3, run: e => e.chain().focus().toggleHeading({ level: 3 }).run(), active: e => e.isActive("heading", { level: 3 }) },
  { label: "Bold", icon: Bold, run: e => e.chain().focus().toggleBold().run(), active: e => e.isActive("bold") },
  { label: "Italic", icon: Italic, run: e => e.chain().focus().toggleItalic().run(), active: e => e.isActive("italic") },
  { label: "Strikethrough", icon: Strikethrough, run: e => e.chain().focus().toggleStrike().run(), active: e => e.isActive("strike") },
  { label: "Inline code", icon: Code, run: e => e.chain().focus().toggleCode().run(), active: e => e.isActive("code") },
  { label: "Code block", icon: Braces, run: e => e.chain().focus().toggleCodeBlock().run(), active: e => e.isActive("codeBlock") },
  { label: "Bullet list", icon: List, run: e => e.chain().focus().toggleBulletList().run(), active: e => e.isActive("bulletList") },
  { label: "Numbered list", icon: ListOrdered, run: e => e.chain().focus().toggleOrderedList().run(), active: e => e.isActive("orderedList") },
  { label: "Task list", icon: ListChecks, run: e => e.chain().focus().toggleTaskList().run(), active: e => e.isActive("taskList") },
  { label: "Quote", icon: Quote, run: e => e.chain().focus().toggleBlockquote().run(), active: e => e.isActive("blockquote") },
  { label: "Divider", icon: Minus, run: e => e.chain().focus().setHorizontalRule().run() },
];

export function EditorToolbar({ editor, source, horizontalScroll, onToggleHorizontalScroll, saveStatus = "saved" }: Props) {
  const inTable = useEditorState({ editor, selector: ({ editor: current }) => !!current?.isActive("table") }) ?? false;
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const selection = useRef({ from: 0, to: 0 });
  const addLink = (event: FormEvent) => {
    event.preventDefault();
    const url = normalizeLinkUrl(href);
    if (!editor || !url) return;
    const range = selection.current;
    const chain = editor.chain().focus().setTextSelection(range);
    if (range.from === range.to) chain.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    else chain.setLink({ href: url }).run();
    setLinkOpen(false);
    setHref("");
  };
  return <div className="toolbar" role="toolbar" aria-label="Formatting">
    <div className="toolbar-actions">
      <div className="tool-group">{actions.map(({ label, icon: Icon, run, active }, index) => { const selected = !!editor && !!active?.(editor); return <span className="tool-item" key={label}>{[1, 4, 9].includes(index) && <i className="toolbar-group-divider" />}<button type="button" title={label} aria-label={label} aria-pressed={selected} disabled={!editor} className={selected ? "tool active" : "tool"} onClick={() => editor && run(editor)}><span className={`tool-glyph tool-glyph-${index}`}>{toolbarGlyph(index)}</span><Icon className="tool-icon" size={14} strokeWidth={1.8} /></button></span>; })}
        <button type="button" className="tool" title="Insert table" aria-label="Insert table" disabled={!editor} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 size={16} strokeWidth={1.8} /></button>
        <button type="button" className={linkOpen ? "tool active" : "tool"} title="Add link" aria-label="Add link" disabled={!editor} onMouseDown={event => { event.preventDefault(); if (editor) selection.current = editor.state.selection; }} onClick={() => setLinkOpen(open => !open)}><Link2 size={16} /></button>
      </div>
      {inTable && <div className="table-actions" role="group" aria-label="Table controls">
      {([ ["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight] ] as const).map(([align, Icon]) => <button type="button" className="table-align-button" key={align} title={`Align current column ${align}`} aria-label={`Align current column ${align}`} onMouseDown={keepEditorSelection} onClick={() => editor && setColumnAlignment(editor, align)}><Icon size={11} /><span>{align[0].toUpperCase() + align.slice(1)}</span></button>)}
      <button type="button" title="Add row below" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().addRowAfter().run()}>+ Row</button>
      <button type="button" title="Add column to the right" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().addColumnAfter().run()}>+ Column</button>
      <button type="button" title="Delete current row" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().deleteRow().run()}>− Row</button>
      <button type="button" title="Delete current column" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().deleteColumn().run()}>− Column</button>
      <button type="button" title="Toggle header row" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().toggleHeaderRow().run()}>Header</button>
      <button type="button" title="Delete table" onMouseDown={keepEditorSelection} onClick={() => editor?.chain().focus().deleteTable().run()}>Delete</button>
      </div>}
    </div>
    {linkOpen && <form className="link-popover" onSubmit={addLink}><label htmlFor="link-url">Link URL</label><input id="link-url" autoFocus placeholder="https://example.com or note.md" value={href} onChange={event => setHref(event.target.value)} onKeyDown={event => event.key === "Escape" && setLinkOpen(false)} /><div><button type="button" onClick={() => setLinkOpen(false)}>Cancel</button><button type="submit" disabled={!href.trim()}>Apply link</button></div></form>}
    <span className="toolbar-spacer" />
    <div className="toolbar-utility">
      <button type="button" className={horizontalScroll ? "tool active wide-content-toggle" : "tool wide-content-toggle"} title={horizontalScroll ? "Disable horizontal scrolling" : "Enable horizontal scrolling"} aria-label={horizontalScroll ? "Disable horizontal scrolling" : "Enable horizontal scrolling"} aria-pressed={horizontalScroll} onClick={onToggleHorizontalScroll}><MoveHorizontal size={16} /><span>{horizontalScroll ? "Scroll" : "Wrap"}</span></button>
      <span className={`toolbar-save ${saveStatus}`} role="status"><i />{saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "Saved"}</span>
    </div>
  </div>;
}

function keepEditorSelection(event: MouseEvent<HTMLButtonElement>) { event.preventDefault(); }

function toolbarGlyph(index: number) {
  return ["¶", "H1", "H2", "H3", "B", "I", "S", "<>", "{}", "", "", "", "”", "—"][index];
}
