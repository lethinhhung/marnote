import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Entry } from "../../../shared/domain/workspace";
import { relativeWorkspaceLink } from "../links/workspaceLinks";

export type LinkDialogState = {
  open: boolean;
  href: string;
  text: string;
};

export type WorkspaceLinkState = {
  open: boolean;
};

export function useEditorLinkDialogs({
  editor,
  path,
}: {
  editor: Editor | null;
  path: string;
}) {
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>({ open: false, href: "", text: "" });
  const [workspaceLink, setWorkspaceLink] = useState<WorkspaceLinkState>({ open: false });
  const selection = useRef({ from: 0, to: 0 });

  useEffect(() => {
    if (!editor) return;
    const editLink = (event: Event) => {
      const detail = (event as CustomEvent<{ href: string; text: string; from: number; to: number }>).detail;
      if (!detail) return;
      selection.current = { from: detail.from, to: detail.to };
      setLinkDialog({ open: false, href: detail.href, text: detail.text });
      if (!/^[a-z][a-z\d+.-]*:/i.test(detail.href) && !detail.href.startsWith("//")) {
        setWorkspaceLink({ open: true });
      } else {
        setWorkspaceLink({ open: false });
        setLinkDialog((prev) => ({ ...prev, open: true }));
      }
    };
    document.addEventListener("marnote-edit-link", editLink);
    return () => document.removeEventListener("marnote-edit-link", editLink);
  }, [editor, path]);

  const openLinkDialog = (initialHref: string, initialText: string) => {
    setLinkDialog({ open: true, href: initialHref, text: initialText });
    setWorkspaceLink({ open: false });
  };

  const openWorkspaceLinkPicker = (initialText: string) => {
    setLinkDialog((prev) => ({ ...prev, text: initialText, open: false }));
    setWorkspaceLink({ open: true });
  };

  const cancelLinkDialog = () => {
    setLinkDialog((prev) => ({ ...prev, open: false }));
    if (editor) editor.chain().focus().setTextSelection(selection.current).run();
  };

  const closeWorkspacePicker = () => {
    setWorkspaceLink({ open: false });
    if (editor) editor.chain().focus().setTextSelection(selection.current).run();
  };

  const applyLink = (text: string, url: string) => {
    if (!editor || !url) return;
    const range = selection.current;
    const label = text || url;
    const chain = editor.chain().focus().setTextSelection(range);
    if (range.from === range.to && editor.isActive("link")) {
      chain.extendMarkRange("link").setLink({ href: url }).run();
    } else {
      chain.insertContent({ type: "text", text: label, marks: [{ type: "link", attrs: { href: url } }] }).run();
    }
    setLinkDialog({ open: false, href: "", text: "" });
  };

  const applyWorkspaceLink = (entry: Entry) => {
    if (!editor) return;
    const range = selection.current;
    const text = linkDialog.text.trim() || entry.name;
    editor.chain().focus().setTextSelection(range).insertContent({ type: "text", text, marks: [{ type: "link", attrs: { href: relativeWorkspaceLink(path, entry) } }] }).run();
    setWorkspaceLink({ open: false });
    setLinkDialog((prev) => ({ ...prev, text: "" }));
  };

  return {
    linkDialog,
    workspaceLink,
    selection,
    openLinkDialog,
    openWorkspaceLinkPicker,
    cancelLinkDialog,
    closeWorkspacePicker,
    applyLink,
    applyWorkspaceLink,
  };
}