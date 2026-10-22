import { useEffect, useRef, useState, useMemo } from "react";
import { File, FileText } from "lucide-react";
import { useTheme } from "../shared/theme/useTheme";
import { useWorkspace } from "../features/workspace/useWorkspace";
import { WorkspaceSidebar } from "../features/workspace/WorkspaceSidebar";
import { NoteEditor } from "../features/editor/NoteEditor";
import { readFile } from "../platform/workspace";
import { HeaderBar } from "../shared/ui/HeaderBar";
import { NoteFooter } from "../features/editor/NoteFooter";
import { useWideContent } from "../features/editor/useWideContent";
import { isExternalConflict } from "./workspaceConflict";
import { useAutosave } from "./useAutosave";
import { useSaveMode } from "./useSaveMode";
import type { Entry, WorkspaceEntryMetadata } from "../shared/domain/workspace";
import { NoteTabs } from "../shared/ui/NoteTabs";
import { useNoteTabs } from "./useNoteTabs";
import { NoNoteOpened } from "./NoNoteOpened";
import { useExplorerLayout } from "../features/workspace/useExplorerLayout";
import { ExplorerSplitter } from "../features/workspace/ExplorerSplitter";
import { createSearchActions } from "../shared/ui/searchActions";

function findEntry(entries: Entry[] | undefined, path: string): Entry | undefined {
  if (!entries) return undefined;
  for (const entry of entries) {
    if (entry.path === path) return entry;
    if (entry.children) {
      const found = findEntry(entry.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

function findEntryMetadata(entries: Entry[] | undefined, path: string): WorkspaceEntryMetadata | undefined {
  return findEntry(entries, path)?.metadata;
}

function countTagUsage(entries: Entry[] = []): Record<string, number> {
  const counts: Record<string, number> = {};
  const visit = (items: Entry[]) => items.forEach(entry => {
    for (const tag of new Set(entry.metadata?.tags ?? [])) counts[tag] = (counts[tag] ?? 0) + 1;
    visit(entry.children ?? []);
  });
  visit(entries);
  return counts;
}

export function App() {
  const { theme, toggleTheme } = useTheme();
  const workspace = useWorkspace();
  const wideContent = useWideContent();
  const explorer = useExplorerLayout();
  const [explorerPeek, setExplorerPeek] = useState(false);
  useEffect(() => { void workspace.openLastOrDefault(); }, []);
  const [source, setSource] = useState(false);
  const [footerTarget, setFooterTarget] = useState<{ path: string; kind: "note" | "folder" }>({ path: "", kind: "note" });
  const [draft, setDraft] = useState("");
  const { mode: saveMode, setMode: setSaveMode } = useSaveMode();
  const [external, setExternal] = useState<string | null>(null);
  const titleInput = useRef<HTMLSpanElement>(null);
  const path = workspace.note?.path || "";
  const name = path.split("/").pop()?.replace(/\.md$/i, "") || "Untitled note";
  useEffect(() => { setExternal(null); }, [path]);
  useEffect(() => { if (!path) setSource(false); }, [path]);
  const { status: saveStatus, saveNow } = useAutosave({
    path,
    draft,
    noteContent: workspace.note?.content,
    save: workspace.save,
    enabled: saveMode === "automatic",
  });
  const noteTabs = useNoteTabs({ tree: workspace.tree, note: workspace.note, draft, setDraft, save: saveNow, select: workspace.select, clear: workspace.clearNote });
  const toggleExplorer = () => {
    setExplorerPeek(false);
    if (!explorer.collapsed && document.querySelector("#workspace-explorer")?.contains(document.activeElement)) {
      document.querySelector<HTMLButtonElement>(".header-explorer-toggle")?.focus();
    }
    explorer.toggle();
  };
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") setExplorerPeek(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  useEffect(() => {
    if (!path || !workspace.note) return;
    const timer = window.setInterval(() => { void readFile(workspace.tree?.path || "", path).then(value => { if (isExternalConflict(value.content, workspace.note?.content || "", draft)) setExternal(value.content); }).catch(error => workspace.setError(String(error))); }, 2500);
    return () => window.clearInterval(timer);
  }, [path, workspace.tree?.path, workspace.note?.content, draft]);
  const renameTitle = async (title: string) => {
    const next = title.replace(/\s+/g, " ").trim().replace(/\.md$/i, "");
    if (titleInput.current) titleInput.current.textContent = next;
    if (!path || !next) return;
    const target = `${path.slice(0, path.lastIndexOf("/") + 1)}${next}.md`;
    if (target !== path && await noteTabs.saveCurrent()) workspace.rename(path, target);
  };
  const noteMetadata = useMemo(
    () => (path && workspace.tree ? findEntryMetadata(workspace.tree.entries, path) : undefined),
    [path, workspace.tree]
  );
  const tabIcons = useMemo(() => Object.fromEntries(noteTabs.tabs.map(tabPath => {
    const entry = workspace.tree && findEntry(workspace.tree.entries, tabPath);
    return [tabPath, entry?.metadata?.icon || (entry?.isEmpty ? <File size={14} /> : <FileText size={14} />)];
  })), [noteTabs.tabs, workspace.tree]);
  const targetPath = footerTarget.kind === "note" ? path : footerTarget.path;
  const targetMetadata = useMemo(
    () => (targetPath && workspace.tree ? findEntryMetadata(workspace.tree.entries, targetPath) : undefined),
    [targetPath, workspace.tree]
  );
  const tagUsageCounts = useMemo(() => countTagUsage(workspace.tree?.entries), [workspace.tree]);
  const searchActions = createSearchActions(workspace.tree, path, name, noteTabs.saveCurrent, workspace.create);
  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener("keydown", saveShortcut);
    return () => window.removeEventListener("keydown", saveShortcut);
  }, [saveNow]);
  return <main className="app-shell">
    <HeaderBar tree={workspace.tree} path={path} content={draft} theme={theme} source={source} explorerCollapsed={explorer.collapsed} onToggleExplorer={toggleExplorer} toggleTheme={toggleTheme} onToggleSource={() => setSource(value => !value)} onSelect={entry => { if (entry.kind === "directory") document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: entry.path })); else void noteTabs.selectTab(entry.path); }} onCreate={title => { void searchActions.createNote(title); }} onCapture={() => { void noteTabs.create(); }} onCopy={value => { void searchActions.copy(value); }} onQuickAction={(entry, action, content) => {
      if (action === "link" || action === "relative-path" || action === "full-path" || action === "content") { void searchActions.copyTarget(entry, action, content); return; }
      if (action === "rename") { if (explorer.collapsed) explorer.toggle(); document.dispatchEvent(new CustomEvent("marnote-search-rename", { detail: { path: entry.path, kind: entry.kind } })); return; }
      return document.dispatchEvent(new CustomEvent("marnote-search-remove", { detail: { path: entry.path, kind: entry.kind }, cancelable: true }));
    }} />
    <div className={`app-layout explorer-layout${explorer.collapsed ? " explorer-layout-compact" : ""}`}><div className={`explorer-dock${explorer.collapsed ? " is-collapsed" : ""}`} style={{ width: explorer.collapsed ? 48 : explorer.width, flexBasis: explorer.collapsed ? 48 : explorer.width }} onPointerEnter={() => explorer.collapsed && setExplorerPeek(true)} onPointerLeave={() => explorer.collapsed && setExplorerPeek(false)} onFocusCapture={() => explorer.collapsed && setExplorerPeek(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExplorerPeek(false); }}><WorkspaceSidebar key={workspace.tree?.path || "empty"} tree={workspace.tree} recent={workspace.recent} width={explorer.width} collapsed={explorer.collapsed} peekOpen={explorerPeek} trash={workspace.trash} onListTrash={workspace.refreshTrash} onRestoreTrash={workspace.restore} onEmptyTrash={workspace.empty} onDefault={async () => { if (await noteTabs.saveCurrent()) workspace.openDefault(); }} selected={path} onOpen={async target => { if (await noteTabs.saveCurrent()) workspace.open(target); }} onSelect={entry => { void noteTabs.selectTab(entry.path); }} onTargetChange={(target, kind) => setFooterTarget({ path: target, kind })} onCreate={async target => { if (await noteTabs.saveCurrent()) workspace.create(target); }} onCreateFolder={workspace.createDirectory} onRename={workspace.rename} onDelete={workspace.remove} onMove={workspace.move} onReorder={workspace.reorder} onUpdateMetadata={workspace.updateMetadata} /><ExplorerSplitter width={explorer.width} collapsed={explorer.collapsed} onResize={explorer.resize} onToggle={toggleExplorer} /></div>
      <section className="workspace" onPointerDown={event => { if (workspace.note && (event.target as HTMLElement).closest(".editor-canvas")) document.dispatchEvent(new CustomEvent("marnote-focus-note")); }}>
        {noteTabs.tabs.length > 0 && <NoteTabs paths={noteTabs.tabs} icons={tabIcons} dirtyPath={path && (saveStatus !== "saved" || draft !== workspace.note?.content) ? path : ""} activePath={path} canCreate={!!workspace.tree} onSelect={target => { void noteTabs.selectTab(target); }} onClose={target => { void noteTabs.closeTab(target); }} onCloseOthers={target => { void noteTabs.closeOthers(target); }} onCloseAll={() => { void noteTabs.closeAll(); }} onCreate={() => { void noteTabs.create(); }} onReorder={noteTabs.reorder} />}
        {workspace.error && <div className="status-banner error" role="alert">{workspace.error}</div>}{external !== null && <div className="status-banner conflict" role="status">This file changed outside Marnote. <button onClick={() => { workspace.acceptExternal(path, external); noteTabs.updateDraft(external); setExternal(null); }}>Load external version</button><button onClick={() => { workspace.acceptExternal(path, external); setExternal(null); }}>Keep mine</button></div>}
        {workspace.note ? <NoteEditor key={path} path={path} entries={workspace.tree?.entries ?? []} onNavigate={(target, kind) => { if (kind === "file") void noteTabs.selectTab(target); else document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: target })); }} updateMetadata={workspace.updateMetadata} value={draft} onChange={noteTabs.updateDraft} source={source} horizontalScroll={wideContent.horizontalScroll} onToggleHorizontalScroll={wideContent.toggleHorizontalScroll} heading={<div className="title-field"><span ref={titleInput} className="title-input" role="textbox" aria-label="Note file name" aria-multiline="true" contentEditable suppressContentEditableWarning key={path} onBlur={event => { void renameTitle(event.currentTarget.textContent || ""); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }}>{name}</span><span className="title-extension" onClick={() => titleInput.current?.focus()}>.md</span></div>} metadata={noteMetadata} tagColors={workspace.tree?.tags} /> : <NoNoteOpened canCreate={!!workspace.tree} />}
      </section>
    </div>
    <NoteFooter value={footerTarget.kind === "note" && workspace.note ? draft : ""} path={targetPath} kind={footerTarget.kind} saveStatus={saveStatus} saveMode={saveMode} dirty={!!path && draft !== workspace.note?.content} onSaveModeChange={setSaveMode} onSave={() => { void saveNow(); }} metadata={targetMetadata} updateMetadata={workspace.updateMetadata} tags={workspace.tree?.tags} tagUsageCounts={tagUsageCounts} updateTagColor={workspace.updateTagColor} editTag={workspace.editTag} />
  </main>;
}
