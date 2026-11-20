import StarterKit from "@tiptap/starter-kit";
import { CodeBlockWithCopy } from "./code-block-copy/CodeBlockWithCopy";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";

export const EDITOR_EXTENSIONS = [StarterKit.configure({ codeBlock: false, link: false }), CodeBlockWithCopy, TaskList, TaskItem.configure({ nested: true }), TableKit.configure({ table: { cellMinWidth: 120 } }), Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "Write something…" }), Markdown];

export const EDITOR_PROPS = { attributes: { class: "editor-prose", "aria-label": "Markdown note editor" } };
