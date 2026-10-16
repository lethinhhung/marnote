import type { Editor } from "@tiptap/react";
import { Bold, Italic, Strikethrough, Code, Braces, Heading1, Heading2, Heading3, List, ListOrdered, ListChecks, Quote, Minus, Link2, Eye, Pilcrow } from "lucide-react";

type Props = { editor: Editor | null; source: boolean; onToggleSource: () => void };
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

export function EditorToolbar({ editor, source, onToggleSource }: Props) {
  const addLink = () => {
    if (!editor) return;
    const href = window.prompt("Paste a link");
    if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };
  return <div className="toolbar" role="toolbar" aria-label="Formatting">
    <div className="tool-group">{actions.map(({ label, icon: Icon, run, active }) => { const selected = !!editor && !!active?.(editor); return <button key={label} type="button" title={label} aria-label={label} aria-pressed={selected} disabled={!editor} className={selected ? "tool active" : "tool"} onClick={() => editor && run(editor)}><Icon size={16} strokeWidth={1.8} /></button>; })}</div>
    <span className="toolbar-spacer" />
    <button type="button" className="tool link-tool" title="Add link" aria-label="Add link" disabled={!editor} onClick={addLink}><Link2 size={16} /></button>
    <span className="tool-separator" />
    <button type="button" className={source ? "tool active source-toggle" : "tool source-toggle"} title="View Markdown" aria-label="View Markdown" aria-pressed={source} onClick={onToggleSource}><Eye size={16} /><span>Markdown</span></button>
  </div>;
}
