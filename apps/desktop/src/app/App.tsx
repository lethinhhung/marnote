import { useEffect, useRef, useState, useMemo } from "react";
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
import type { Entry, WorkspaceEntryMetadata } from "../shared/domain/workspace";

function findEntryMetadata(entries: Entry[] | undefined, path: string): WorkspaceEntryMetadata | undefined {
  if (!entries) return undefined;
  for (const entry of entries) {
    if (entry.path === path) return entry.metadata;
    if (entry.children) {
      const found = findEntryMetadata(entry.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

export function App() {
  const { theme, toggleTheme } = useTheme();
  const workspace = useWorkspace();
  const wideContent = useWideContent();
  useEffect(() => { void workspace.openDefault(); }, []);
  const [source, setSource] = useState(false);
  const [footerTarget, setFooterTarget] = useState<{ path: string; kind: "note" | "folder" }>({ path: "", kind: "note" });
  const [draft, setDraft] = useState("");
  const [external, setExternal] = useState<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const path = workspace.note?.path || "";
  const name = path.split("/").pop()?.replace(/\.md$/i, "") || "Untitled note";
  useEffect(() => { setDraft(workspace.note?.content || ""); setExternal(null); }, [path]);
  const { status: saveStatus } = useAutosave({
    path,
    draft,
    noteContent: workspace.note?.content,
    save: workspace.save,
  });
  useEffect(() => {
    if (!path || !workspace.note) return;
    const timer = window.setInterval(() => { void readFile(workspace.tree?.path || "", path).then(value => { if (isExternalConflict(value.content, workspace.note?.content || "", draft)) setExternal(value.content); }).catch(error => workspace.setError(String(error))); }, 2500);
    return () => window.clearInterval(timer);
  }, [path, workspace.tree?.path, workspace.note?.content, draft]);
  const renameTitle = (title: string) => {
    const next = title.trim(); if (!path || !next) return;
    const target = `${path.slice(0, path.lastIndexOf("/") + 1)}${next.endsWith(".md") ? next : `${next}.md`}`;
    if (target !== path) workspace.rename(path, target);
  };
  const noteMetadata = useMemo(
    () => (path && workspace.tree ? findEntryMetadata(workspace.tree.entries, path) : undefined),
    [path, workspace.tree]
  );
  const targetPath = footerTarget.kind === "note" ? path : footerTarget.path;
  const targetMetadata = useMemo(
    () => (targetPath && workspace.tree ? findEntryMetadata(workspace.tree.entries, targetPath) : undefined),
    [targetPath, workspace.tree]
  );
  return <main className="app-shell">
    <HeaderBar tree={workspace.tree} path={path} theme={theme} toggleTheme={toggleTheme} onSelect={workspace.select} />
    <div className="app-layout"><WorkspaceSidebar key={workspace.tree?.path || "empty"} tree={workspace.tree} recent={workspace.recent} onDefault={workspace.openDefault} selected={path} onOpen={workspace.open} onSelect={workspace.select} onTargetChange={(target, kind) => setFooterTarget({ path: target, kind })} onCreate={workspace.create} onCreateFolder={workspace.createDirectory} onRename={workspace.rename} onDelete={workspace.remove} onMove={workspace.move} onUpdateMetadata={workspace.updateMetadata} />
      <section className="workspace" onPointerDown={() => { if (workspace.note) document.dispatchEvent(new CustomEvent("marnote-focus-note")); }}>{workspace.error && <div className="status-banner error" role="alert">{workspace.error}</div>}{external !== null && <div className="status-banner conflict" role="status">This file changed outside Marnote. <button onClick={() => { workspace.acceptExternal(path, external); setDraft(external); setExternal(null); }}>Load external version</button><button onClick={() => { workspace.acceptExternal(path, external); setExternal(null); }}>Keep mine</button></div>}
        {workspace.note ? <NoteEditor value={draft} onChange={setDraft} source={source} onToggleSource={() => setSource(!source)} horizontalScroll={wideContent.horizontalScroll} onToggleHorizontalScroll={wideContent.toggleHorizontalScroll} heading={<div className="title-field"><input ref={titleInput} className="title-input" aria-label="Note file name" defaultValue={name} size={Math.max(name.length, 1)} key={path} onBlur={event => renameTitle(event.currentTarget.value)} onKeyDown={event => event.key === "Enter" && event.currentTarget.blur()} /><span className="title-extension" onClick={() => titleInput.current?.focus()}>.md</span></div>} metadata={noteMetadata} /> : <div className="welcome"><div className="doc-icon">✎</div><h1>{workspace.tree ? "Choose a note" : "Open a workspace"}</h1><p>{workspace.tree ? "Select a Markdown file from the sidebar, or create a new note." : "Open a local folder to browse and edit its Markdown files."}</p></div>}
      </section>
    </div>
    <NoteFooter value={footerTarget.kind === "note" && workspace.note ? draft : ""} path={targetPath} kind={footerTarget.kind} saveStatus={saveStatus} metadata={targetMetadata} updateMetadata={workspace.updateMetadata} />
  </main>;
}
