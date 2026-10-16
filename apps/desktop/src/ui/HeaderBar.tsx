import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Moon, Search, Sun } from "lucide-react";
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
  return <header className="topbar">
    <div className="brand-lockup" aria-label="Marnote"><img className="brand-mark" src="/brand/mark.svg" alt="" /><span className="brand-name">marnote</span></div>
    <span className="topbar-divider" />
    <nav className="address" aria-label="Current location"><span>{tree?.name || "No workspace"}</span>{path && <><span className="address-separator">/</span><span className="address-current">{path}</span></>}</nav>
    <div className="global-search"><Search size={17} /><input ref={input} aria-label="Jump to note or command" placeholder="Jump to note or command…" value={query} onChange={event => setQuery(event.target.value)} onFocus={() => setFocused(true)} onKeyDown={event => { if (event.key === "Enter" && matches[0]) choose(matches[0]); }} /><kbd>⌘K</kbd>
      {focused && query && <div className="search-results" role="listbox" aria-label="Matching notes">{matches.length ? matches.map(file => <button key={file.path} type="button" role="option" onMouseDown={event => event.preventDefault()} onClick={() => choose(file)}><FileText size={15} /><span>{file.name}</span><small>{file.path}</small></button>) : <p>No matching notes</p>}</div>}
    </div>
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
  </header>;
}
