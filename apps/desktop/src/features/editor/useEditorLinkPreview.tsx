import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MouseEvent } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { normalizeLinkUrl, openExternalLink } from "./linkUrl";

type Preview = { href: string; top: number; left: number; from: number; to: number };

export function useEditorLinkPreview(editor: Editor | null) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [copied, setCopied] = useState(false);
  const closeTimer = useRef<number | undefined>();
  const keepOpen = () => window.clearTimeout(closeTimer.current);
  const closeSoon = () => { keepOpen(); closeTimer.current = window.setTimeout(() => setPreview(null), 500); };
  useEffect(() => () => keepOpen(), []);
  const onMouseOverCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor || !event.currentTarget.contains(anchor)) return;
    keepOpen();
    const rect = anchor.getBoundingClientRect();
    const href = normalizeLinkUrl(anchor.getAttribute("href") ?? anchor.href);
    let from = 0, to = 0;
    try { from = editor?.view.posAtDOM(anchor, 0) ?? 0; to = editor?.view.posAtDOM(anchor, anchor.childNodes.length) ?? from; } catch { /* Link may have left the live editor DOM. */ }
    const next = { href, top: Math.min(rect.bottom, window.innerHeight - 42), left: Math.max(12, Math.min(rect.left, window.innerWidth - 312)), from, to };
    setPreview(current => current?.href === next.href && current.top === next.top && current.left === next.left ? current : next);
  };
  const onMouseOutCapture = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    const anchor = target instanceof Element ? target.closest("a[href]") : null;
    const related = event.relatedTarget;
    if (related instanceof Element && related.closest(".editor-link-preview")) return;
    if (anchor && !(related instanceof Node && anchor.contains(related))) closeSoon();
  };
  const copyLink = async () => {
    if (!preview) return;
    await navigator.clipboard.writeText(normalizeLinkUrl(preview.href));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  const unlink = () => { if (!editor || !preview || preview.to <= preview.from) return; editor.chain().focus().setTextSelection({ from: preview.from, to: preview.to }).unsetLink().run(); setPreview(null); };
  const overlay = preview && createPortal(<div className="editor-link-preview" style={{ top: preview.top, left: preview.left }} onMouseEnter={keepOpen} onMouseLeave={closeSoon}><span className="editor-link-preview-url">{preview.href}</span><button type="button" onClick={copyLink} aria-label="Copy link URL">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied" : "Copy"}</button><button type="button" onClick={() => void openExternalLink(preview.href)} aria-label="Go to link"><ExternalLink size={12} />Go to</button><button type="button" onClick={unlink} aria-label="Remove link">Unlink</button></div>, document.body);
  return { onMouseOverCapture, onMouseOutCapture, overlay };
}
