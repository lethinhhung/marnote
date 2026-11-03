import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { normalizeLinkUrl } from "../../links/linkUrl";

type Props = { initialText: string; initialHref: string; onCancel: () => void; onDismiss?: () => void; onApply: (text: string, href: string) => void };

export function LinkDialog({ initialText, initialHref, onCancel, onDismiss = onCancel, onApply }: Props) {
  const [text, setText] = useState(initialText);
  const [href, setHref] = useState(initialHref);
  const urlInput = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const url = normalizeLinkUrl(href);
    if (isWebAddress(url)) onApply(text.trim() || url, url);
  };
  const textKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); urlInput.current?.focus(); }
    if (event.key === "Enter") { event.preventDefault(); if (!href.trim()) urlInput.current?.focus(); else form.current?.requestSubmit(); }
  };
  const validAddress = isWebAddress(normalizeLinkUrl(href));
  return <form ref={form} className="link-popover" onSubmit={submit} onKeyDown={event => event.key === "Escape" && onCancel()} onBlur={event => { if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) onDismiss(); }}>
    <label htmlFor="link-text">Link text</label><input id="link-text" autoFocus placeholder="Link text" value={text} onChange={event => setText(event.target.value)} onKeyDown={textKeys} />
    <label htmlFor="link-url">Web address</label><input ref={urlInput} id="link-url" placeholder="https://example.com" value={href} onChange={event => setHref(event.target.value)} />
    <div><button type="button" onClick={onCancel}>Cancel</button><button type="submit" disabled={!validAddress}>Apply link</button></div>
  </form>;
}

function isWebAddress(value: string) { return /^(https?:\/\/|mailto:|tel:)/i.test(value); }