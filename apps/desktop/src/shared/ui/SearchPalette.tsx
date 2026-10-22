import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, FileText, Folder, Link2, Plus, Search, Zap } from "lucide-react";
import type { Entry, WorkspaceTree } from "../domain/workspace";
import { readFile } from "../../platform/workspace";
import { flattenEntries, parseSearchQuery, searchWorkspace } from "./searchNotes";
import { loadSearchIndex, updateSearchIndexContent } from "./searchIndex";
import "./search-palette.css";

type Props = { tree: WorkspaceTree | null; currentPath: string; currentContent: string; onSelect: (entry: Entry) => void; onCreate: (title: string) => void; onCapture: () => void; onCopyLink: () => void; onClose: () => void };
type Choice = { id: string; label: string; run: () => void; type: "note" | "folder" | "command" | "tag" | "create"; entry?: Entry; subtitle?: string; excerpt?: string; source?: string; count?: number };
const commands = ["Quick Capture new note…", "Copy internal link to note"];
const sameGroup = (left: Choice["type"], right: Choice["type"]) => (left === "note" || left === "folder") ? right === "note" || right === "folder" : left === right;

export function SearchPalette({ tree, currentPath, currentContent, onSelect, onCreate, onCapture, onCopyLink, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [contents, setContents] = useState<Record<string, string>>({});
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    if (!tree) return;
    let cancelled = false;
    const currentEntry = flattenEntries(tree.entries).find(entry => entry.path === currentPath);
    setLoading(true);
    void loadSearchIndex(tree, readFile).then(index => {
      if (currentPath) { index[currentPath] = currentContent; updateSearchIndexContent(tree.path, currentPath, currentContent, currentEntry?.modifiedMs); }
      if (!cancelled) setContents(index);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tree?.path, tree?.entries, currentPath, currentContent]);
  const matches = useMemo(() => searchWorkspace(tree?.entries, query, currentPath ? { ...contents, [currentPath]: currentContent } : contents), [tree, query, contents, currentPath, currentContent]);
  const trimmed = query.trim();
  const parsedQuery = parseSearchQuery(query);
  const createTitle = parsedQuery.text.trim();
  const choices = useMemo<Choice[]>(() => {
    const result: Choice[] = [];
    for (const item of matches.notes.slice(0, 6)) result.push({ id: item.entry.path, label: item.entry.name, subtitle: item.entry.path, excerpt: item.excerpt, source: item.source, type: "note", entry: item.entry, run: () => onSelect(item.entry) });
    for (const entry of matches.folders.slice(0, 3)) result.push({ id: entry.path, label: entry.name, subtitle: entry.path, type: "folder", entry, run: () => onSelect(entry) });
    for (const command of commands.filter(label => (label.startsWith("Quick") ? !!tree : !!currentPath) && (!trimmed || label.toLocaleLowerCase().includes(trimmed.toLocaleLowerCase())))) result.push({ id: command, label: command, type: "command", run: command.startsWith("Quick") ? onCapture : onCopyLink });
    for (const tag of matches.tags.slice(0, 6)) result.push({ id: `tag:${tag.name}`, label: `#${tag.name}`, count: tag.count, type: "tag", run: () => setQuery(`tag:${tag.name}`) });
    if (tree && createTitle && !parsedQuery.tag && !parsedQuery.folder && !parsedQuery.type && !createTitle.includes("/") && !createTitle.includes("\\") && createTitle.length < 100 && !matches.notes.some(item => item.entry.name.replace(/\.md$/i, "").toLocaleLowerCase() === createTitle.toLocaleLowerCase())) result.push({ id: "create", label: `Create new note “${createTitle}”`, type: "create", run: () => onCreate(createTitle) });
    return result;
  }, [matches, trimmed, createTitle, tree, currentPath, onSelect, onCreate, onCapture, onCopyLink]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    const panel = results.current;
    const selected = panel?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!panel || !selected) return;
    if (active === 0) panel.scrollTop = 0;
    else if (active === choices.length - 1) panel.scrollTop = panel.scrollHeight;
    else selected.scrollIntoView({ block: "nearest" });
  }, [active, choices.length]);
  const choose = (choice: Choice) => { choice.run(); if (choice.type !== "tag") onClose(); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && choices.length) { event.preventDefault(); setActive(value => (value + choices.length + (event.key === "ArrowDown" ? 1 : -1)) % choices.length); }
    if (event.key === "Enter" && choices[active]) { event.preventDefault(); choose(choices[active]); }
  };
  return <div className="search-palette-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="search-palette" role="dialog" aria-modal="true" aria-label="Search workspace">
      <div className="search-palette-input"><Search size={20} /><input ref={input} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown} placeholder="Search notes, files, and actions…" aria-label="Search notes, files, and actions" /><button type="button" onClick={onClose}>ESC</button></div>
      <div ref={results} className="search-palette-results" role="listbox" aria-label="Search results">
        {choices.map((choice, index) => <Fragment key={choice.id}>{(index === 0 || !sameGroup(choice.type, choices[index - 1].type)) && <Group title={choice.type === "note" || choice.type === "folder" ? "Notes & Files" : choice.type === "command" ? "Commands & Actions" : choice.type === "tag" ? "Tags" : "Create"} count={choice.type === "note" || choice.type === "folder" ? `${matches.notes.length + matches.folders.length} matches` : ""} />}<button type="button" role="option" aria-selected={active === index} className={`search-choice ${active === index ? "selected" : ""}`} onMouseEnter={() => setActive(index)} onClick={() => choose(choice)}>
          {choice.type === "note" ? <FileText size={16} /> : choice.type === "folder" ? <Folder size={16} /> : choice.type === "command" ? (choice.label.startsWith("Quick") ? <Zap size={16} /> : <Link2 size={16} />) : choice.type === "create" ? <Plus size={16} /> : <span className="search-tag">#</span>}
          <span className="choice-label"><Highlighted text={choice.label} query={parsedQuery.text} />{choice.count !== undefined && <small>{choice.count} notes</small>}{choice.subtitle && <small><Highlighted text={choice.subtitle} query={parsedQuery.text} /></small>}{choice.source && <small className="search-match-source">Matched in {choice.source}</small>}{choice.excerpt && <small className="search-excerpt">“<Highlighted text={choice.excerpt} query={parsedQuery.text} />”</small>}</span>
          {active === index && <kbd>↵</kbd>}
        </button></Fragment>)}
        {loading && <p className="search-palette-empty">Indexing workspace notes…</p>}
        {!loading && trimmed && matches.notes.length + matches.folders.length + matches.tags.length === 0 && <p className="search-palette-empty">No matches{choices.some(choice => choice.type === "create") ? " · Create a note from this search" : ""}</p>}
        {!trimmed && !loading && <p className="search-palette-empty">Search titles, folders, tags, and note content<br />Filter with <code>tag:name</code>, <code>in:folder</code>, or <code>type:note|folder</code></p>}
      </div>
      <footer className="search-palette-footer"><span><kbd><ArrowUp size={10} /><ArrowDown size={10} /></kbd> Navigate</span><span><kbd>↵</kbd> Open in new tab</span><span><kbd>esc</kbd> Dismiss</span></footer>
    </section>
  </div>;
}

function Group({ title, count }: { title: string; count: string }) { return <div className="search-palette-group"><span>{title}</span><small>{count}</small></div>; }

function Highlighted({ text, query }: { text: string; query: string }) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return <>{text}</>;
  const pattern = new RegExp(`(${words.map(escapePattern).join("|")})`, "ig");
  return <>{text.split(pattern).map((part, index) => words.some(word => part.toLocaleLowerCase() === word.toLocaleLowerCase()) ? <mark key={index}>{part}</mark> : part)}</>;
}

function escapePattern(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
