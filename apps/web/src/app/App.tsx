import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { File, FileText, Download, Upload, AlertTriangle } from "lucide-react";
import { useTheme } from "../shared/theme/useTheme";
import { useWorkspace } from "../features/workspace/state/useWorkspace";
import { WorkspaceSidebar } from "../features/workspace/sidebar/WorkspaceSidebar";
import { NoteEditor } from "../features/editor/NoteEditor";
import { HeaderBar } from "../shared/ui/HeaderBar";
import { NoteFooter } from "../features/editor/NoteFooter";
import { useAutosave } from "./useAutosave";
import { useSaveMode } from "./useSaveMode";
import type { Entry, WorkspaceEntryMetadata } from "../shared/domain/workspace";
import { NoteTabs } from "../shared/ui/NoteTabs";
import { useNoteTabs } from "./useNoteTabs";
import { NoNoteOpened } from "./NoNoteOpened";
import { useExplorerLayout } from "../features/workspace/layout/useExplorerLayout";
import { ExplorerSplitter } from "../features/workspace/layout/ExplorerSplitter";
import { createSearchActions } from "../shared/ui/searchActions";
import { useUnsavedChangesPrompt } from "./useUnsavedChangesPrompt";
import { downloadNoteAsMarkdown } from "../platform/workspace";

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

export function App() {
  const { theme, toggleTheme } = useTheme();
  const workspace = useWorkspace();
  const explorer = useExplorerLayout();
  const [explorerPeek, setExplorerPeek] = useState(false);
  useEffect(() => { void workspace.openLastOrDefault(); }, []);
  const [source, setSource] = useState(false);
  const [footerTarget, setFooterTarget] = useState<{ path: string; kind: "note" | "folder" }>({ path: "", kind: "note" });
  const [draft, setDraft] = useState("");
  const { mode: saveMode, setMode: setSaveMode } = useSaveMode();
  const unsavedPrompt = useUnsavedChangesPrompt();
  const titleInput = useRef<HTMLSpanElement>(null);
  const [importPending, setImportPending] = useState<File | null>(null);
  const path = workspace.note?.path || "";
  const name = path.split("/").pop()?.replace(/\.md$/i, "") || "Untitled note";
  useEffect(() => { if (!path) setSource(false); }, [path]);
  const { status: saveStatus, saveNow } = useAutosave({
    path,
    draft,
    noteContent: workspace.note?.content,
    save: workspace.save,
    enabled: saveMode === "automatic",
  });
  const saveDraft = useCallback((target: string, content: string, original: string) => target === path ? saveNow() : workspace.save(target, content, original), [path, saveNow, workspace.save]);
  const noteTabs = useNoteTabs({ tree: workspace.tree, note: workspace.note, draft, setDraft, save: saveDraft, select: workspace.select, clear: workspace.clearNote, manual: saveMode === "manual", askUnsaved: unsavedPrompt.ask });
  
  const closeCurrent = useRef(noteTabs.saveCurrent);
  closeCurrent.current = noteTabs.saveCurrent;
  const toggleExplorer = () => {
    setExplorerPeek(false);
    if (!explorer.collapsed && document.querySelector("#workspace-explorer")?.contains(document.activeElement)) {
      document.querySelector<HTMLButtonElement>(".header-explorer-toggle")?.focus();
    }
    explorer.toggle();
  };
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") setExplorerPeek(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  const renameTitle = async (title: string) => {
    const next = title.replace(/\s+/g, " ").trim().replace(/\.md$/i, "");
    if (titleInput.current) titleInput.current.textContent = next;
    if (!path || !next) return;
    const target = `${path.slice(0, path.lastIndexOf("/") + 1)}${next}.md`;
    if (target !== path && await noteTabs.saveCurrent()) workspace.rename(path, target);
  };
  
  const tabIcons = useMemo(() => Object.fromEntries(noteTabs.tabs.map(tabPath => {
    const entry = workspace.tree && findEntry(workspace.tree.entries, tabPath);
    return [tabPath, entry?.metadata?.icon || (entry?.isEmpty ? <File size={14} /> : <FileText size={14} />)];
  })), [noteTabs.tabs, workspace.tree]);
  const targetPath = footerTarget.kind === "note" ? path : footerTarget.path;
  const targetMetadata = useMemo(
    () => (targetPath && workspace.tree ? findEntryMetadata(workspace.tree.entries, targetPath) : undefined),
    [targetPath, workspace.tree]
  );
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
  const handleExport = async () => {
    try {
      const blob = await workspace.exportWorkspace();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marnote-workspace-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      workspace.setError(String(e));
    }
  };
  const handleDownloadNote = async () => {
    if (!path) {
      workspace.setError("Select a note to download.");
      return;
    }
    try {
      const result = await downloadNoteAsMarkdown(workspace.tree?.path || "", path);
      const url = URL.createObjectURL(new Blob([result.content], { type: "text/markdown;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      workspace.setError(String(e));
    }
  };
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setImportPending(file);
  };

  const handleConfirmImport = async () => {
    const file = importPending;
    if (!file) return;
    setImportPending(null);
    try {
      await workspace.importWorkspace(file);
    } catch (e) {
      workspace.setError(String(e));
    }
  };

  const handleCancelImport = () => {
    setImportPending(null);
  };
  return <main className="app-shell">
    <HeaderBar tree={workspace.tree} path={path} content={draft} theme={theme} source={source} explorerCollapsed={explorer.collapsed} onToggleExplorer={toggleExplorer} toggleTheme={toggleTheme} onToggleSource={() => setSource(value => !value)} onSelect={entry => { if (entry.kind === "directory") document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: entry.path })); else void noteTabs.selectTab(entry.path); }} onCreate={title => { void searchActions.createNote(title); }} onCapture={() => { void noteTabs.create(); }} onCopy={value => { void searchActions.copy(value); }} onQuickAction={(entry, action, content) => {
      if (action === "link" || action === "relative-path" || action === "full-path" || action === "content") { void searchActions.copyTarget(entry, action, content); return; }
      if (action === "rename") { if (explorer.collapsed) explorer.toggle(); document.dispatchEvent(new CustomEvent("marnote-search-rename", { detail: { path: entry.path, kind: entry.kind } })); return; }
      return document.dispatchEvent(new CustomEvent("marnote-search-remove", { detail: { path: entry.path, kind: entry.kind }, cancelable: true }));
    }} extraActions={
      <>
        <button className="header-copy" type="button" onClick={() => void handleDownloadNote()} disabled={!path} title={path ? "Download note as Markdown" : "Select a note to download"} aria-label="Download note as Markdown"><FileText size={14} /><span>Download</span></button>
        <button className="header-copy" type="button" onClick={handleExport} title="Export workspace" aria-label="Export workspace"><Download size={14} /><span>Export</span></button>
        <label className="header-copy header-import" role="button" tabIndex={0} title="Import workspace" aria-label="Import workspace" onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.querySelector("input")?.click(); } }}><Upload size={14} /><span>Import</span><input type="file" accept=".zip" onChange={handleImport} style={{ display: "none" }} onClick={e => e.stopPropagation()} /></label>
      </>
    } />
    <div className={`app-layout explorer-layout${explorer.collapsed ? " explorer-layout-compact" : ""}`}><div className={`explorer-dock${explorer.collapsed ? " is-collapsed" : ""}`} style={{ width: explorer.collapsed ? 48 : explorer.width, flexBasis: explorer.collapsed ? 48 : explorer.width }} onPointerEnter={() => explorer.collapsed && setExplorerPeek(true)} onPointerLeave={() => explorer.collapsed && setExplorerPeek(false)} onFocusCapture={() => explorer.collapsed && setExplorerPeek(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExplorerPeek(false); }}><WorkspaceSidebar key={workspace.tree?.path || "empty"} tree={workspace.tree} recent={[]} width={explorer.width} collapsed={explorer.collapsed} peekOpen={explorerPeek} trash={workspace.trash} onListTrash={workspace.refreshTrash} onRestoreTrash={workspace.restore} onEmptyTrash={workspace.empty} onDefault={async () => { if (await noteTabs.saveCurrent()) workspace.openDefault(); }} selected={path} onOpen={async target => { if (await noteTabs.saveCurrent()) workspace.open(target); }} onSelect={entry => { void noteTabs.selectTab(entry.path); }} onTargetChange={(target, kind) => setFooterTarget({ path: target, kind })} onCreate={async target => { if (await noteTabs.saveCurrent()) workspace.create(target); }} onCreateFolder={workspace.createDirectory} onRename={workspace.rename} onDelete={workspace.remove} onMove={workspace.move} onReorder={workspace.reorder} onUpdateMetadata={workspace.updateMetadata} /><ExplorerSplitter width={explorer.width} collapsed={explorer.collapsed} onResize={explorer.resize} onToggle={toggleExplorer} /></div>
      <section className="workspace" onPointerDown={event => { if (workspace.note && (event.target as HTMLElement).closest(".editor-canvas")) document.dispatchEvent(new CustomEvent("marnote-focus-note")); }}>
        {noteTabs.tabs.length > 0 && <NoteTabs paths={noteTabs.tabs} icons={tabIcons} dirtyPath={path && (saveStatus !== "saved" || draft !== workspace.note?.content) ? path : ""} activePath={path} canCreate={!!workspace.tree} onSelect={target => { void noteTabs.selectTab(target); }} onClose={target => { void noteTabs.closeTab(target); }} onCloseOthers={target => { void noteTabs.closeOthers(target); }} onCloseAll={() => { void noteTabs.closeAll(); }} onCreate={() => { void noteTabs.create(); }} onReorder={noteTabs.reorder} />}
        {workspace.error && <div className="status-banner error" role="alert">{workspace.error}</div>}
        {importPending && (
          <div className="move-dialog-backdrop" role="presentation" onClick={handleCancelImport}>
            <section className="move-dialog" role="alertdialog" aria-modal="true" aria-labelledby="import-title" aria-describedby="import-description" onClick={e => e.stopPropagation()} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); handleCancelImport(); } }}>
              <h2 id="import-title"><AlertTriangle size={20} className="import-warning-icon" /> Import workspace</h2>
              <p id="import-description">This will replace all notes, folders, tags, favorites, and ordering in the current workspace. This action cannot be undone.</p>
              {workspace.error && <p className="unsaved-error" role="alert">{workspace.error}</p>}
              <footer>
                <button type="button" onClick={handleCancelImport}>Cancel</button>
                <button type="button" className="primary" onClick={handleConfirmImport}>Replace workspace</button>
              </footer>
            </section>
          </div>
        )}
        {workspace.note ? <NoteEditor key={path} path={path} rootPath={workspace.tree?.path || ""} entries={workspace.tree?.entries ?? []} onNavigate={(target, kind) => { if (kind === "file") void noteTabs.selectTab(target); else document.dispatchEvent(new CustomEvent("marnote-navigate-folder", { detail: target })); }} value={draft} onChange={noteTabs.updateDraft} source={source} heading={<div className="title-field"><span ref={titleInput} className="title-input" role="textbox" aria-label="Note file name" aria-multiline="true" contentEditable suppressContentEditableWarning key={path} onBlur={event => { void renameTitle(event.currentTarget.textContent || ""); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }}>{name}</span><span className="title-extension" onClick={() => titleInput.current?.focus()}>.md</span></div>} /> : <NoNoteOpened canCreate={!!workspace.tree} />}
      </section>
    </div>
    {unsavedPrompt.dialog}
    <NoteFooter value={footerTarget.kind === "note" && workspace.note ? draft : ""} path={targetPath} kind={footerTarget.kind} saveStatus={saveStatus} saveMode={saveMode} dirty={!!path && draft !== workspace.note?.content} onSaveModeChange={setSaveMode} metadata={targetMetadata} updateMetadata={workspace.updateMetadata} tags={workspace.tree?.tags} />
  </main>;
}
