import { useMemo, useState, type FormEvent } from "react";
import type { Entry } from "../../shared/domain/workspace";
import { normalizeLinkUrl } from "./linkUrl";
import { flattenEntries, relativeWorkspaceLink } from "./workspaceLinks";

type Props = { path: string; entries: Entry[]; initialText: string; initialHref: string; onCancel: () => void; onApply: (text: string, href: string) => void };

export function LinkDialog({ path, entries, initialText, initialHref, onCancel, onApply }: Props) {
  const workspaceTarget = flattenEntries(entries).find(entry => relativeWorkspaceLink(path, entry) === initialHref);
  const [destination, setDestination] = useState<"web" | "workspace">(workspaceTarget ? "workspace" : "web");
  const [text, setText] = useState(initialText);
  const [href, setHref] = useState(initialHref);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState(workspaceTarget ? relativeWorkspaceLink(path, workspaceTarget) : "");
  const items = useMemo(() => flattenEntries(entries).filter(entry => `${entry.path} ${entry.name}`.toLowerCase().includes(query.toLowerCase())), [entries, query]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = destination === "workspace" ? target : normalizeLinkUrl(href);
    if (!value) return;
    const item = flattenEntries(entries).find(entry => relativeWorkspaceLink(path, entry) === value);
    const label = text.trim() || item?.name || normalizeLinkUrl(href);
    onApply(label, item?.kind === "directory" && !value.endsWith("/") ? `${value}/` : value);
  };
  return <form className="link-popover" onSubmit={submit} onKeyDown={event => event.key === "Escape" && onCancel()}>
    <label htmlFor="link-destination">Destination</label>
    <select id="link-destination" value={destination} onChange={event => setDestination(event.target.value as "web" | "workspace")}><option value="web">Web address</option><option value="workspace">Workspace item</option></select>
    <label htmlFor="link-text">Link text</label><input id="link-text" autoFocus placeholder="Link text" value={text} onChange={event => setText(event.target.value)} />
    {destination === "web" ? <><label htmlFor="link-url">Web address</label><input id="link-url" placeholder="https://example.com" value={href} onChange={event => setHref(event.target.value)} /></> : <><label htmlFor="link-search">Find a note or folder</label><input id="link-search" placeholder="Search workspace" value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="Workspace item" size={Math.min(6, Math.max(2, items.length))} value={target} onChange={event => { const item = items.find(entry => relativeWorkspaceLink(path, entry) === event.target.value); if (item) { setTarget(event.target.value); if (!text.trim()) setText(item.name); } }}><option value="" disabled>Select an item…</option>{items.map(item => <option key={item.path} value={relativeWorkspaceLink(path, item)}>{item.kind === "directory" ? "Folder · " : "Note · "}{item.path}</option>)}</select></>}
    <div><button type="button" onClick={onCancel}>Cancel</button><button type="submit" disabled={destination === "web" ? !href.trim() : !target}>Apply link</button></div>
  </form>;
}
