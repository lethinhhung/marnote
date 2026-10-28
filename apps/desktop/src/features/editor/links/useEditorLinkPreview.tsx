import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FocusEvent, MouseEvent } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { Entry } from "../../../shared/domain/workspace";
import { normalizeLinkUrl } from "./linkUrl";
import { findWorkspaceLink, resolveWorkspaceLink } from "./workspaceLinks";

type Preview = { href: string; text: string; top: number; left: number; from: number; to: number };
type Props = { editor: Editor | null; entries: Entry[]; path: string; goTo: (href: string) => void };

export function useEditorLinkPreview({ editor, entries, path, goTo }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [copied, setCopied] = useState(false);
  const closeTimer = useRef<number | undefined>();
  const keepOpen = () => window.clearTimeout(closeTimer.current);
  const closeSoon = () => { keepOpen(); closeTimer.current = window.setTimeout(() => setPreview(null), 500); };
  useEffect(() => () => keepOpen(), []);
  const show = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor || !anchor.closest(".editor-prose")) return;
    keepOpen();
    const rect = anchor.getBoundingClientRect();
    const href = normalizeLinkUrl(anchor.getAttribute("href") ?? anchor.href);
    let from = 0, to = 0;
    try { from = editor?.view.posAtDOM(anchor, 0) ?? 0; to = editor?.view.posAtDOM(anchor, anchor.childNodes.length) ?? from; } catch { /* Link may have left the live editor DOM. */ }
    setPreview({ href, text: anchor.textContent ?? "", top: Math.min(rect.bottom, window.innerHeight - 42), left: Math.max(12, Math.min(rect.left, window.innerWidth - 312)), from, to });
  };
  const onMouseOverCapture = (event: MouseEvent<HTMLDivElement>) => show(event.target);
  const onFocusCapture = (event: FocusEvent<HTMLDivElement>) => show(event.target);
  const onMouseOutCapture = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (event.relatedTarget instanceof Element && event.relatedTarget.closest(".editor-link-preview")) return;
    if (anchor && !(event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget))) closeSoon();
  };
  const target = preview && findWorkspaceLink(entries, path, preview.href);
  const workspaceTarget = preview && !/^[a-z][a-z\d+.-]*:/i.test(preview.href) && !preview.href.startsWith("//");
  const missing = !!(workspaceTarget && !target);
  const missingPath = preview && resolveWorkspaceLink(path, preview.href)?.path;
  const label = target ? `${target.kind === "directory" ? "Folder" : "Note"} · ${target.path}` : missing ? `Unavailable · ${missingPath ?? preview?.href}` : preview?.href;
  const copyLabel = workspaceTarget ? "Copy workspace link" : "Copy address";
  const copyLink = async () => { if (!preview) return; await navigator.clipboard.writeText(preview.href); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  const editLink = () => { if (preview) document.dispatchEvent(new CustomEvent("marnote-edit-link", { detail: { ...preview, text: preview.text } })); };
  const unlink = () => { if (!editor || !preview || preview.to <= preview.from) return; editor.chain().focus().setTextSelection({ from: preview.from, to: preview.to }).unsetLink().run(); setPreview(null); };
  const go = () => { if (preview && !missing) goTo(preview.href); };
  const overlay = preview && createPortal(<div className="editor-link-preview" style={{ top: preview.top, left: preview.left }} onMouseEnter={keepOpen} onMouseLeave={closeSoon}><span className="editor-link-preview-url" title={label}>{label}</span><button type="button" onClick={copyLink} aria-label={copyLabel}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied" : copyLabel}</button><button type="button" disabled={!!missing} onClick={go} aria-label="Open link"><ExternalLink size={12} />{missing ? "Unavailable" : "Open link"}</button><button type="button" onClick={editLink}>Edit</button><button type="button" onClick={unlink}>Remove link</button></div>, document.body);
  return { onMouseOverCapture, onMouseOutCapture, onFocusCapture, overlay };
}