import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { FileText, Moon, Search, Sun } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Entry, WorkspaceTree } from "./workspaceTypes";

type Props = { tree: WorkspaceTree | null; path: string; theme: string; toggleTheme: () => void; onSelect: (entry: Entry) => void };
function files(entries: Entry[]): Entry[] { return entries.flatMap(entry => entry.kind === "directory" ? files(entry.children || []) : entry.path.toLowerCase().endsWith(".md") ? [entry] : []); }
export function HeaderBar({ tree, path, theme, toggleTheme, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => files(tree?.entries || []).filter(file => (file.name + " " + file.path).toLowerCase().includes(query.toLowerCase())).slice(0, 8), [tree, query]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); input.current?.focus(); } if (event.key === "Escape") { setFocused(false); input.current?.blur(); } };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  const choose = (entry: Entry) => { onSelect(entry); setQuery(""); setFocused(false); input.current?.blur(); };
  const dragWindow = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest(".global-search, button")) return;
    if (isTauri()) void getCurrentWindow().startDragging().catch(() => undefined);
  };
  const parts = path.split("/").filter(Boolean);
  return <header className={navigator.platform.includes("Mac") ? "topbar mac-titlebar" : "topbar"} onPointerDown={dragWindow}>
    <div className="address" aria-label="Current location"><span className="address-brand">Marnote</span>{parts.length === 0 && <><span className="address-separator">/</span><span>{tree?.name || "No workspace"}</span></>}{parts.map((part, index) => <span className="address-part" key={part + index}><span className="address-separator">/</span>{index === parts.length - 1 ? <span className="address-current"><FileText size={14} />{part}</span> : <span>{part}</span>}</span>)}</div>
    <div className="global-search"><Search size={14} /><input ref={input} aria-label="Jump to note or command" placeholder="Jump to note or command…" value={query} onChange={event => setQuery(event.target.value)} onFocus={() => setFocused(true)} onKeyDown={event => { if (event.key === "Enter" && matches[0]) choose(matches[0]); }} /><kbd>⌘K</kbd>
      {focused && query && <div className="search-results" role="listbox" aria-label="Matching notes">{matches.length ? matches.map(file => <button key={file.path} type="button" role="option" onMouseDown={event => event.preventDefault()} onClick={() => choose(file)}><FileText size={15} /><span>{file.name}</span><small>{file.path}</small></button>) : <p>No matching notes</p>}</div>}
    </div>
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}</button>
  </header>;
}
