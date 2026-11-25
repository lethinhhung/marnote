
import { useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import { initialMarkdown } from "./initialMarkdown";
import type { Entry } from "../../shared/domain/workspace";
import { BacklinksPanel } from "./links/BacklinksPanel";
import { useEditorEmoji } from "./useEditorEmoji";
import { InlineEmojiMenu } from "./InlineEmojiMenu";

type Props = {
  value: string;
  onChange: (value: string) => void;
  source: boolean;
  heading: React.ReactNode;
  path?: string;
  rootPath?: string;
  entries?: Entry[];
  onNavigate?: (path: string, kind: "file" | "directory") => void;
};

export function NoteEditor({ value, onChange, source, heading, path = "", rootPath = "", entries = [], onNavigate = () => {} }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const emoji = useEditorEmoji({ editorRef });
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { cellMinWidth: 120 } }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write something…" }),
      Markdown,
    ],
    content: value || initialMarkdown,
    contentType: "markdown",
    editorProps: {
      attributes: { class: "editor-prose", "aria-label": "Markdown note editor" },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getMarkdown());
      emoji.update();
    },
  });

  useEffect(() => { editorRef.current = editor; }, [editor]);

  if (source) {
    const markdown = editor?.getMarkdown() ?? value;
    return <div className="editor-canvas" onKeyDownCapture={emoji.keys}><pre className="markdown-source" tabIndex={0} aria-label="Markdown source">{markdown}</pre><BacklinksPanel rootPath={rootPath} path={path} entries={entries} onOpen={target => onNavigate(target, "file")} /></div>;
  }

  return (
    <div className="editor-canvas" onKeyDownCapture={emoji.keys}>
      <div className="note-heading">{heading}</div>
      {editor ? <><EditorContent editor={editor} />{emoji.menu && !source && <InlineEmojiMenu mode={emoji.menu.mode} query={emoji.menu.query} matches={emoji.matches} selected={emoji.selected} position={{ top: emoji.menu.top, left: emoji.menu.left }} onChoose={emoji.choose} onClose={emoji.close} />}</> : <div>Loading editor…</div>}
      <BacklinksPanel rootPath={rootPath} path={path} entries={entries} onOpen={target => onNavigate(target, "file")} />
    </div>
  );
}
