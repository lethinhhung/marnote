import { useEffect, useState } from "react";
import type { Entry } from "./workspaceTypes";
import { TreeEditor } from "./TreeEditor";
import { TreeRow } from "./TreeRow";
import { visibleEntries } from "./treeVisibility";
import { useTreeFolderFocus } from "./useTreeFolderFocus";
import { sortEntries, type ExplorerSort } from "./sortEntries";
import { BLANK_DROP_TARGET, useTreeDragDrop } from "./useTreeDragDrop";

export type TreeEdit = { kind: "note" | "folder" | "rename-note" | "rename-folder"; path: string; value: string };
type Props = { entries: Entry[]; manualOrder: Record<string, string[]>; sort: ExplorerSort; selected: string; selectedFolder: string; focus: "note" | "folder" | "none"; hideFoldersWithoutNotes: boolean; edit: TreeEdit | null; tagColors?: Record<string, string>; onEditSubmit: (name: string) => void; onEditCancel: () => void; onOpen: (entry: Entry) => void; onFolderSelect: (path: string) => void; onClearFocus?: () => void; onEntryContext: (path: string, kind: "note" | "folder" | "root", x: number, y: number) => void; onMove: (source: string, destination: string) => Promise<boolean>; onReorder: (parent: string, paths: string[]) => Promise<boolean> };

export function FileTree(props: Props) {
  const [expanded, setExpanded] = useState(() => new Set(props.entries.filter(entry => entry.kind === "directory").map(entry => entry.path)));
  const focusPath = useTreeFolderFocus(setExpanded);
  const { dragging, dropTarget, blankDropY, start, consumeSkipClick } = useTreeDragDrop({
    entries: props.entries,
    sort: props.sort,
    setExpanded,
    onMove: props.onMove,
    onReorder: props.onReorder,
  });
  useEffect(() => {
    if (!props.edit) return;
    const target = props.edit.kind.startsWith("rename") ? props.edit.path : props.edit.path.replace(/\/$/, "");
    const parts = target.split("/").filter(Boolean);
    const ancestors = props.edit.kind.startsWith("rename") ? parts.slice(0, -1) : parts;
    setExpanded(current => { const next = new Set(current); ancestors.forEach((_, index) => next.add(ancestors.slice(0, index + 1).join("/"))); return next; });
  }, [props.edit]);
  useEffect(() => {
    if (!props.selectedFolder) return;
    const parts = props.selectedFolder.split("/").filter(Boolean);
    const ancestors = parts.slice(0, -1);
    setExpanded(current => { const next = new Set(current); ancestors.forEach((_, index) => next.add(ancestors.slice(0, index + 1).join("/"))); return next; });
  }, [props.selectedFolder]);
  const click = (entry: Entry) => {
    if (consumeSkipClick()) return;
    document.dispatchEvent(new Event("marnote-clear-folder-focus"));
    if (entry.kind === "directory") props.onFolderSelect(entry.path);
    else props.onOpen(entry);
  };
  const entries = visibleEntries(sortEntries(props.entries, props.sort, props.manualOrder), props.hideFoldersWithoutNotes);
  const editor = props.edit;
  return (
    <ul className={`file-tree ${dragging ? "is-dragging" : ""}`}
      onClick={event => { if (!(event.target as HTMLElement).closest(".tree-item")) props.onClearFocus?.(); }}
      onContextMenu={event => { if ((event.target as HTMLElement).closest(".tree-item")) return; event.preventDefault(); props.onClearFocus?.(); props.onEntryContext("", "root", event.clientX, event.clientY); }}>
      {editor && (editor.kind === "note" || editor.kind === "folder") && !editor.path && <li><TreeEditor kind={editor.kind} value={editor.value} depth={0} onSubmit={props.onEditSubmit} onCancel={props.onEditCancel} /></li>}
      {entries.map(entry => <TreeRow key={entry.path} entry={entry} tagColors={props.tagColors ?? {}} selected={props.selected} selectedFolder={props.selectedFolder} focus={props.focus} dragging={dragging} dropTarget={dropTarget} focusPath={focusPath} expanded={expanded} onExpanded={setExpanded} depth={0} onStart={start} onClick={click} onEntryContext={props.onEntryContext} edit={editor} onEditSubmit={props.onEditSubmit} onEditCancel={props.onEditCancel} />)}
      {dropTarget === BLANK_DROP_TARGET && blankDropY !== null && <li className="tree-drop-blank-line" style={{ top: blankDropY }} aria-hidden="true" />}
    </ul>
  );
}
