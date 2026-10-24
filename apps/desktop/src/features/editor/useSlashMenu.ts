import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Editor } from "@tiptap/react";
import type { Entry } from "../../shared/domain/workspace";
import { matchingSlashIds, type SlashState } from "./SlashMenu";
import { slashPosition } from "./slashPosition";
import { relativeWorkspaceLink } from "./workspaceLinks";

type SlashLinkState = { from: number; to: number; top: number; bottom: number; left: number };

export function useSlashMenu({
  entries,
  path,
  onNavigate,
}: {
  entries: Entry[];
  path: string;
  onNavigate: (path: string, kind: "file" | "directory") => void;
}) {
  const editorRef = useRef<Editor | null>(null);
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [slashLink, setSlashLink] = useState<SlashLinkState | null>(null);
  const [workspaceLink, setWorkspaceLink] = useState<SlashLinkState | null>(null);
  const [linkPosition, setLinkPosition] = useState({ top: 12, left: 12 });
  const linkForm = useRef<HTMLDivElement>(null);
  const [linkText, setLinkText] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [selected, setSelected] = useState(0);
  const [slashKeyboardNavigation, setSlashKeyboardNavigation] = useState(true);

  const setEditor = (editor: Editor | null) => {
    editorRef.current = editor;
  };

  const handleEditorUpdate = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const { $from } = editor.state.selection;
    const match = $from.parent.type.name === "paragraph" && $from.parent.textContent.match(/(?:^|\s)\/([\w-]*)$/);
    if (!match) { setSlash(null); return; }
    const from = $from.pos - match[1].length - 1;
    setSlash({ query: match[1], from, to: $from.pos, ...slashPosition(editor, $from.pos, match[1]) });
    setSelected(0);
    setSlashKeyboardNavigation(true);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !slash) return;
    const update = () => setSlash((current: SlashState | null) => current ? { ...current, ...slashPosition(editor, current.to, current.query) } : current);
    const canvas = editor.view.dom.closest(".editor-canvas");
    canvas?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      canvas?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [slash?.to, slash?.query]);

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

  useEffect(() => {
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

  const navigateHref = (value: string) => {
    const entry = entries.find(e => relativeWorkspaceLink(path, e) === value) ?? entries.find(e => relativeWorkspaceLink(path, e) === value.replace(/^https?:\/\//, ""));
    if (entry) {
      onNavigate(entry.path, entry.kind);
      return;
    }
    const normalized = value.startsWith("//") ? `https:${value}` : value.startsWith("http") ? value : `https://${value}`;
    window.open(normalized, "_blank", "noopener,noreferrer");
  };

  const insert = (id: string) => {
    const editor = editorRef.current;
    if (!editor || !slash) return;
    if (id === "link" || id === "workspace-link") {
      const cursor = editor.view.coordsAtPos(slash.to);
      const range = { from: slash.from, to: slash.to, top: cursor.top, bottom: cursor.bottom, left: cursor.left };
      if (id === "link") {
        setSlashLink(range);
        setLinkText("");
        setLinkHref("");
      } else {
        setWorkspaceLink(range);
      }
      setSlash(null);
      return;
    }
    const chain = editor.chain().focus().deleteRange({ from: slash.from, to: slash.to });
    if (id === "paragraph") chain.setParagraph().run();
    else if (id.startsWith("heading")) chain.setHeading({ level: Number(id.slice(-1)) as 1 | 2 | 3 }).run();
    else if (id === "bullet") chain.toggleBulletList().run();
    else if (id === "number") chain.toggleOrderedList().run();
    else if (id === "task") chain.toggleTaskList().run();
    else if (id === "quote") chain.toggleBlockquote().run();
    else if (id === "code") chain.toggleCodeBlock().run();
    else if (id === "table") chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    else chain.setHorizontalRule().run();
    setSlash(null);
  };

  const applySlashLink = (text: string, href: string) => {
    const editor = editorRef.current;
    if (!editor || !slashLink || !href || !text) return;
    editor.chain().focus().deleteRange({ from: slashLink.from, to: slashLink.to }).insertContent({ type: "text", text, marks: [{ type: "link", attrs: { href } }] }).run();
    setSlashLink(null);
  };

  const cancelSlashLink = () => {
    const editor = editorRef.current;
    if (editor && slashLink) editor.chain().focus().setTextSelection({ from: slashLink.to, to: slashLink.to }).run();
    setSlashLink(null);
  };

  const cancelWorkspaceLink = () => {
    const editor = editorRef.current;
    if (editor && workspaceLink) editor.chain().focus().setTextSelection({ from: workspaceLink.to, to: workspaceLink.to }).run();
    setWorkspaceLink(null);
  };

  const applyWorkspaceLink = (entry: Entry) => {
    const editor = editorRef.current;
    if (!editor || !workspaceLink) return;
    const href = relativeWorkspaceLink(path, entry);
    editor.chain().focus().deleteRange({ from: workspaceLink.from, to: workspaceLink.to }).insertContent({ type: "text", text: entry.name, marks: [{ type: "link", attrs: { href } }] }).run();
    setWorkspaceLink(null);
  };

  const keys = (event: KeyboardEvent) => {
    const editor = editorRef.current;
    if (!slash || !editor || !(event.target as HTMLElement).closest(".ProseMirror")) return;
    const ids = matchingSlashIds(slash.query);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setSlashKeyboardNavigation(true);
      setSelected(v => Math.max(0, Math.min(ids.length - 1, v + (event.key === "ArrowDown" ? 1 : -1))));
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setSlash(null);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (ids[selected]) insert(ids[selected]);
    }
  };

  return {
    slash,
    setSlash,
    slashLink,
    setSlashLink,
    workspaceLink,
    setWorkspaceLink,
    linkPosition,
    linkForm,
    linkText,
    setLinkText,
    linkHref,
    setLinkHref,
    selected,
    setSelected,
    slashKeyboardNavigation,
    setSlashKeyboardNavigation,
    insert,
    applySlashLink,
    cancelSlashLink,
    cancelWorkspaceLink,
    applyWorkspaceLink,
    keys,
    navigateHref,
    handleEditorUpdate,
    setEditor,
  };
}