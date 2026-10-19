import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Eye, FileText, Moon, Search, Sun } from "lucide-react";
import { startWindowDrag } from "../../platform/window";
import type { Entry, WorkspaceTree } from "../domain/workspace";
import { searchNotes } from "./searchNotes";
import "./header-bar.css";

type Props = { tree: WorkspaceTree | null; path: string; theme: string; source: boolean; toggleTheme: () => void; onToggleSource: () => void; onSelect: (entry: Entry) => void };
export function HeaderBar({ tree, path, theme, source, toggleTheme, onToggleSource, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => searchNotes(tree?.entries, query), [tree, query]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); input.current?.focus(); } if (event.key === "Escape") { setFocused(false); input.current?.blur(); } };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  const choose = (entry: Entry) => { onSelect(entry); setQuery(""); setFocused(false); input.current?.blur(); };
  const dragWindow = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest(".global-search, button")) return;
    startWindowDrag();
  };
  const parts = path.split("/").filter(Boolean);
  return <header className={navigator.platform.includes("Mac") ? "topbar mac-titlebar" : "topbar"} onPointerDown={dragWindow}>
    <div className="address" aria-label="Current location"><span className="address-brand"><svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="10" fill="#526b58"/><text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle">m</text></svg><b>Marnote</b></span>{parts.length === 0 && <span className="address-part">{tree?.name || "No workspace"}</span>}{parts.map((part, index) => <span className="address-part" key={part + index}><span className="address-separator">/</span>{index === parts.length - 1 ? <span className="address-current"><FileText size={14} />{part}</span> : <span>{part}</span>}</span>)}</div>
    <div className="global-search"><Search size={14} /><input ref={input} aria-label="Jump to note or command" placeholder="Jump to note or command…" value={query} onChange={event => setQuery(event.target.value)} onFocus={() => setFocused(true)} onKeyDown={event => { if (event.key === "Enter" && matches[0]) choose(matches[0]); }} /><kbd>⌘K</kbd>
      {focused && query && <div className="search-results" role="listbox" aria-label="Matching notes">{matches.length ? matches.map(file => <button key={file.path} type="button" role="option" onMouseDown={event => event.preventDefault()} onClick={() => choose(file)}><FileText size={15} /><span>{file.name}</span><small>{file.path}</small></button>) : <p>No matching notes</p>}</div>}
    </div>
    <button className={source ? "header-markdown active" : "header-markdown"} type="button" onClick={onToggleSource} aria-pressed={source} aria-label="Toggle Markdown source view"><Eye size={14} /><span>Markdown</span></button>
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}</button>
  </header>;
}
