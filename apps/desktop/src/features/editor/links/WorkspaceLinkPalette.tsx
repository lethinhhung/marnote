import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FileText, Folder, Search } from "lucide-react";
import type { Entry } from "../../../shared/domain/workspace";
import { flattenEntries } from "./workspaceLinks";

type Props = { entries: Entry[]; onClose: () => void; onSelect: (entry: Entry) => void };

export function WorkspaceLinkPalette({ entries, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [keyboardNavigation, setKeyboardNavigation] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const choices = useMemo(() => flattenEntries(entries).filter(entry => `${entry.name} ${entry.path}`.toLowerCase().includes(query.toLowerCase())), [entries, query]);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { setActive(0); setKeyboardNavigation(true); }, [query]);
  useEffect(() => {
    const panel = results.current;
    const selected = panel?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!panel || !selected) return;
    const top = selected.offsetTop;
    const bottom = top + selected.offsetHeight;
    if (top < panel.scrollTop) panel.scrollTop = top;
    else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight;
  }, [active, query]);
  const choose = (entry = choices[active]) => { if (entry) onSelect(entry); };
  const keys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
    if (!choices.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setKeyboardNavigation(true); setActive(value => (value + choices.length + (event.key === "ArrowDown" ? 1 : -1)) % choices.length); }
    if (event.key === "Enter") { event.preventDefault(); choose(); }
  };
  return <div className="search-palette-backdrop link-palette-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className={`search-palette link-palette${keyboardNavigation ? " keyboard-navigation" : ""}`} role="dialog" aria-modal="true" aria-label="Link to a note or folder" onKeyDown={keys}>
      <div className="search-palette-input"><Search size={20} /><input ref={input} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search notes and folders…" aria-label="Search notes and folders" /><button type="button" onClick={onClose}>ESC</button></div>
      <div ref={results} className="search-palette-results" role="listbox" aria-label="Workspace items" onScroll={() => setKeyboardNavigation(true)}>
        {choices.map((entry, index) => <button type="button" role="option" aria-selected={active === index} className={`search-choice ${active === index ? "selected" : ""}`} key={entry.path} onMouseMove={event => { if (!event.movementX && !event.movementY) return; setKeyboardNavigation(false); setActive(index); }} onClick={() => choose(entry)}>{entry.kind === "directory" ? <Folder size={16} /> : <FileText size={16} />}<span className="choice-label">{entry.name}<small>{entry.path}</small></span>{active === index && <kbd>↵</kbd>}</button>)}
        {!choices.length && <p className="search-palette-empty">No matching notes or folders</p>}
      </div>
      <footer className="search-palette-footer"><span><kbd>↑↓</kbd> Navigate</span><span><kbd>↵</kbd> Link item</span><span><kbd>esc</kbd> Dismiss</span></footer>
    </section>
  </div>;
}
