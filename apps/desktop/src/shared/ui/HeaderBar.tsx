import { useEffect, useState, type PointerEvent } from "react";
import { Check, ChevronDown, Copy, Eye, FileText, Moon, Search, Sun, PanelLeft } from "lucide-react";
import { startWindowDrag } from "../../platform/window";
import type { Entry, WorkspaceTree } from "../domain/workspace";
import { SearchPalette } from "./SearchPalette";
import type { CopyNoteValue } from "./searchActions";
import "./header-bar.css";

type Props = { tree: WorkspaceTree | null; path: string; content: string; theme: string; source: boolean; explorerCollapsed: boolean; toggleTheme: () => void; onToggleExplorer: () => void; onToggleSource: () => void; onSelect: (entry: Entry) => void; onCreate: (title: string) => void; onCapture: () => void; onCopy: (value: CopyNoteValue) => void };
export function HeaderBar({ tree, path, content, theme, source, explorerCollapsed, toggleTheme, onToggleExplorer, onToggleSource, onSelect, onCreate, onCapture, onCopy }: Props) {
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "b") { event.preventDefault(); onToggleExplorer(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onToggleExplorer]);
  const copyMarkdown = async () => {
    try { await navigator.clipboard.writeText(content); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }
    catch { setCopied(false); }
  };
  const dragWindow = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest(".global-search, button, .header-path-menu")) return;
    startWindowDrag();
  };
  const parts = path.split("/").filter(Boolean);
  return <>
    <header className={navigator.platform.includes("Mac") ? "topbar mac-titlebar" : "topbar"} onPointerDown={dragWindow}>
      <button className="header-explorer-toggle" type="button" onClick={onToggleExplorer} aria-label={explorerCollapsed ? "Expand Explorer" : "Use compact Explorer"} aria-controls="workspace-explorer" aria-expanded={!explorerCollapsed} title={`${explorerCollapsed ? "Expand" : "Compact"} Explorer (⌘⇧B / Ctrl+Shift+B)`}><PanelLeft size={15} /></button>
      <div className="address"><span className="address-brand"><svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="10" fill="#526b58"/><text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle">m</text></svg><b>Marnote</b></span><div className={`address-location${path ? "" : " address-workspace-location"}`} aria-label="Current location">{parts.length === 0 && <span className="address-part">{tree?.name || "No workspace"}</span>}{parts.map((part, index) => { const folderPath = parts.slice(0, index + 1).join("/"); return <span className="address-part" key={part + index}><span className="address-separator">/</span>{index === parts.length - 1 ? <span className="address-current"><FileText size={14} />{part}</span> : <button className="address-folder" type="button" onClick={() => document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: folderPath }))} aria-label={`Focus folder ${folderPath}`} title={`Focus ${folderPath} in Explorer`}>{part}</button>}</span>; })}</div>{path && <details className="address-path-collapsed" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.removeAttribute("open"); }}><summary aria-label={`Show path for ${parts.at(-1)}`} title="Show note path"><span>{parts.at(-1)}</span><ChevronDown size={13} /></summary><div className="address-path-options" role="menu">{parts.slice(0, -1).map((part, index) => { const folderPath = parts.slice(0, index + 1).join("/"); return <button type="button" role="menuitem" key={folderPath} onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: folderPath })); }}>{part}</button>; })}<span className="address-path-current">{parts.at(-1)}</span></div></details>}{path && <details className="header-path-menu" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.removeAttribute("open"); }}><summary aria-label="Copy note link or path" title="Copy note link or path"><Copy size={14} /></summary><div className="header-path-options" role="menu"><button type="button" role="menuitem" onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onCopy("link"); }}>Copy internal link</button><button type="button" role="menuitem" onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onCopy("relative-path"); }}>Copy relative path</button><button type="button" role="menuitem" onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onCopy("full-path"); }}>Copy full path</button></div></details>}</div>
      <button className="global-search" type="button" onClick={() => setSearchOpen(true)} aria-label="Search workspace"><Search size={14} /><span>Search notes and actions…</span><kbd>⌘K</kbd></button>
      <button className="header-copy" type="button" onClick={() => void copyMarkdown()} disabled={!path} aria-label={copied ? "Markdown copied" : "Copy note as Markdown"} title={copied ? "Copied" : "Copy note as Markdown"}>{copied ? <Check size={14} /> : <Copy size={14} />}<span>Copy MD</span></button>
      <button className={source ? "header-markdown active" : "header-markdown"} type="button" onClick={onToggleSource} disabled={!path} title={path ? "Toggle Markdown source view" : "Open a note to view Markdown"} aria-pressed={source} aria-label="Toggle Markdown source view"><Eye size={14} /><span>Markdown</span></button>
      <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}</button>
    </header>
    {searchOpen && <SearchPalette tree={tree} currentPath={path} currentContent={content} onSelect={onSelect} onCreate={onCreate} onCapture={onCapture} onCopy={onCopy} onClose={() => setSearchOpen(false)} />}
  </>;
}
