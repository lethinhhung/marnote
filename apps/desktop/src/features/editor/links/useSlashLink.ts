import { useEffect, useRef, useState, type RefObject } from "react";
import type { Editor } from "@tiptap/react";
import type { Entry } from "../../../shared/domain/workspace";
import { relativeWorkspaceLink, findWorkspaceLink } from "./workspaceLinks";

export type SlashLinkState = { from: number; to: number; top: number; bottom: number; left: number };

export function navigateHref({
  entries,
  path,
  onNavigate,
  value,
}: {
  entries: Entry[];
  path: string;
  onNavigate: (path: string, kind: "file" | "directory") => void;
  value: string;
}) {
  const target = findWorkspaceLink(entries, path, value);
  if (target) {
    onNavigate(target.path, target.kind);
    return;
  }
  const normalized = /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//") ? value : `https://${value}`;
  window.open(normalized, "_blank", "noopener,noreferrer");
}

export function useSlashLink({
  entries,
  path,
  onNavigate,
  editorRef,
}: {
  entries: Entry[];
  path: string;
  onNavigate: (path: string, kind: "file" | "directory") => void;
  editorRef: RefObject<Editor | null>;
}) {
  const [slashLink, setSlashLink] = useState<SlashLinkState | null>(null);
  const [workspaceLink, setWorkspaceLink] = useState<SlashLinkState | null>(null);
  const [linkPosition, setLinkPosition] = useState({ top: 12, left: 12 });
  const linkForm = useRef<HTMLDivElement>(null);
  const [linkText, setLinkText] = useState("");
  const [linkHref, setLinkHref] = useState("");

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

  const handleNavigateHref = (value: string) => {
    navigateHref({ entries, path, onNavigate, value });
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

  return {
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
    navigateHref: handleNavigateHref,
    applySlashLink,
    cancelSlashLink,
    cancelWorkspaceLink,
    applyWorkspaceLink,
  };
}
