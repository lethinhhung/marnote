import { useEffect, useRef, useState } from "react";
import { useTheme } from "../ui/useTheme";
import { useWorkspace } from "../features/workspace/useWorkspace";
import { WorkspaceSidebar } from "../features/file-tree/WorkspaceSidebar";
import { NoteEditor } from "../features/note-editor/NoteEditor";
import { readFile } from "../platform/workspaceApi";
import { HeaderBar } from "../ui/HeaderBar";
import { NoteFooter } from "../ui/NoteFooter";
import { useWideContent } from "../ui/useWideContent";

export function App() {
  const { theme, toggleTheme } = useTheme();
  const workspace = useWorkspace();
  const wideContent = useWideContent();
  useEffect(() => { void workspace.openDefault(); }, []);
  const [source, setSource] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const saveSequence = useRef(0);
  const [external, setExternal] = useState<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const path = workspace.note?.path || "";
  const name = path.split("/").pop()?.replace(/\.md$/i, "") || "Untitled note";
  useEffect(() => { setDraft(workspace.note?.content || ""); setExternal(null); setSaveStatus("saved"); saveSequence.current += 1; }, [path]);
  useEffect(() => {
    if (!path || !workspace.note) return;
    if (draft === workspace.note.content) return;
    const sequence = ++saveSequence.current;
    const timer = window.setTimeout(() => {
      setSaveStatus("saving");
      void workspace.save(path, draft, workspace.note?.content || "").then(saved => {
        if (sequence === saveSequence.current) setSaveStatus(saved ? "saved" : "error");
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft, path, workspace.note?.content]);
  useEffect(() => {
    if (!path || !workspace.note) return;
    const timer = window.setInterval(() => { void readFile(workspace.tree?.path || "", path).then(value => { if (value.content !== workspace.note?.content && value.content !== draft) setExternal(value.content); }).catch(error => workspace.setError(String(error))); }, 2500);
    return () => window.clearInterval(timer);
  }, [path, workspace.tree?.path, workspace.note?.content, draft]);
  const renameTitle = (title: string) => {
    const next = title.trim(); if (!path || !next) return;
    const target = `${path.slice(0, path.lastIndexOf("/") + 1)}${next.endsWith(".md") ? next : `${next}.md`}`;
    if (target !== path) workspace.rename(path, target);
  };
  return <main className="app-shell">
    <HeaderBar tree={workspace.tree} path={path} theme={theme} toggleTheme={toggleTheme} onSelect={workspace.select} />
    <div className="app-layout"><WorkspaceSidebar key={workspace.tree?.path || "empty"} tree={workspace.tree} recent={workspace.recent} onDefault={workspace.openDefault} selected={path} onOpen={workspace.open} onSelect={workspace.select} onCreate={workspace.create} onCreateFolder={workspace.createDirectory} onRename={workspace.rename} onDelete={workspace.remove} onMove={workspace.move} />
      <section className="workspace" onPointerDown={() => { if (workspace.note) document.dispatchEvent(new CustomEvent("marnote-focus-note")); }}>{workspace.error && <div className="status-banner error" role="alert">{workspace.error}</div>}{external !== null && <div className="status-banner conflict" role="status">This file changed outside Marnote. <button onClick={() => { workspace.acceptExternal(path, external); setDraft(external); setExternal(null); }}>Load external version</button><button onClick={() => { workspace.acceptExternal(path, external); setExternal(null); }}>Keep mine</button></div>}
        {workspace.note ? <NoteEditor value={draft} onChange={setDraft} source={source} onToggleSource={() => setSource(!source)} horizontalScroll={wideContent.horizontalScroll} onToggleHorizontalScroll={wideContent.toggleHorizontalScroll} heading={<div className="title-field"><input ref={titleInput} className="title-input" aria-label="Note file name" defaultValue={name} size={Math.max(name.length, 1)} key={path} onBlur={event => renameTitle(event.currentTarget.value)} onKeyDown={event => event.key === "Enter" && event.currentTarget.blur()} /><span className="title-extension" onClick={() => titleInput.current?.focus()}>.md</span></div>} /> : <div className="welcome"><div className="doc-icon">✎</div><h1>{workspace.tree ? "Choose a note" : "Open a workspace"}</h1><p>{workspace.tree ? "Select a Markdown file from the sidebar, or create a new note." : "Open a local folder to browse and edit its Markdown files."}</p></div>}
      </section>
    </div>
    <NoteFooter value={workspace.note ? draft : ""} path={workspace.note?.path || ""} saveStatus={saveStatus} />
  </main>;
}
