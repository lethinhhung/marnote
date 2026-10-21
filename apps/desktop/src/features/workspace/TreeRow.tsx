import type { PointerEvent } from "react";
import { ChevronDown, ChevronRight, File, FileText, Folder, Star } from "lucide-react";
import type { Entry } from "./workspaceTypes";
import type { TreeEdit } from "./FileTree";
import { TreeEditor } from "./TreeEditor";
import { tagStyle } from "../../shared/ui/tagStyle";
import { requestTagEdit } from "../../shared/ui/tagEditRequest";

type Props = { entry: Entry; selected: string; selectedFolder: string; focus: "note" | "folder" | "none"; dragging: string; dropTarget: string; focusPath: string; expanded: Set<string>; onExpanded: (update: (current: Set<string>) => Set<string>) => void; depth: number; onStart: (path: string, event: PointerEvent<HTMLButtonElement>) => void; onClick: (entry: Entry) => void; onEntryContext: (path: string, kind: "note" | "folder" | "root", x: number, y: number) => void; edit: TreeEdit | null; onEditSubmit: (name: string) => void; onEditCancel: () => void; tagColors: Record<string, string> };

function formatTimestamp(ms?: number): string | null {
  if (!ms) return null;
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function TreeRow({ entry, selected, selectedFolder, focus, dragging, dropTarget, focusPath, expanded, onExpanded, depth, onStart, onClick, onEntryContext, edit, onEditSubmit, onEditCancel, tagColors }: Props) {
  const folder = entry.kind === "directory";
  const isExpanded = expanded.has(entry.path);
  const selectedClass = folder ? focus === "folder" && selectedFolder === entry.path ? "selected-folder" : "" : focus === "note" && selected === entry.path ? "selected" : "";
  const folderCreated = folder && entry.metadata?.createdMs ? formatTimestamp(entry.metadata.createdMs) : null;
  const folderUpdated = folder && entry.metadata?.updatedMs ? formatTimestamp(entry.metadata.updatedMs) : null;
  return <li>
    {edit?.path === entry.path ? <TreeEditor kind={folder ? "folder" : "note"} value={edit.value} depth={depth} onSubmit={onEditSubmit} onCancel={onEditCancel} /> : <button data-kind={entry.kind} data-path={entry.path} className={`tree-item ${selectedClass} ${dragging === entry.path ? "dragging" : ""} ${dropTarget === entry.path ? "drop-target" : ""} ${focusPath === entry.path ? "focus-pulse" : ""}`} style={{ paddingLeft: 6 }} onPointerDown={event => { if (event.button !== 0) { event.preventDefault(); return; } onStart(entry.path, event); }} onContextMenu={event => { event.preventDefault(); event.stopPropagation(); onEntryContext(entry.path, folder ? "folder" : "note", event.clientX, event.clientY); }} onClick={() => { if (folder) onExpanded(current => { const next = new Set(current); if (next.has(entry.path)) next.delete(entry.path); else next.add(entry.path); return next; }); onClick(entry); }} title={[entry.path, folderCreated && `Created ${folderCreated}`, folderUpdated && `Updated ${folderUpdated}`].filter(Boolean).join("\n")}>
      {folder ? isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} /> : <span className="tree-indent" />}
      {entry.metadata?.icon ? <span className="tree-icon-emoji" style={{ fontSize: 14 }}>{entry.metadata.icon}</span> : folder ? <Folder size={14} /> : entry.isEmpty ? <File size={14} /> : <FileText size={14} />}
      <span className="tree-item-name">{entry.name}</span>
      {entry.metadata?.tags?.length ? <span className="tree-folder-tags">{entry.metadata.tags.map(tag => <span key={tag} role="button" tabIndex={0} className="tree-folder-tag" style={tagStyle(tagColors[tag] ?? "#526b58")} onClick={event => { event.stopPropagation(); requestTagEdit(tag); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); requestTagEdit(tag); } }} title={`Edit ${tag}`}>#{tag}</span>)}</span> : null}
      {(folderCreated || folderUpdated) && <span className="tree-folder-timestamps" aria-hidden="true">{folderCreated && <span className="tree-folder-timestamp">{folderCreated}</span>}{folderUpdated && <span className="tree-folder-timestamp">{folderUpdated}</span>}</span>}
      {entry.metadata?.favorite && <Star size={12} fill="currentColor" className="tree-favorite" data-testid="tree-favorite" />}
    </button>}
    {folder && isExpanded && (!!entry.children?.length || edit?.path === `${entry.path}/`) && <ul className="tree-children">{entry.children?.map(child => <TreeRow key={child.path} entry={child} selected={selected} selectedFolder={selectedFolder} focus={focus} dragging={dragging} dropTarget={dropTarget} focusPath={focusPath} expanded={expanded} onExpanded={onExpanded} depth={depth + 1} onStart={onStart} onClick={onClick} onEntryContext={onEntryContext} edit={edit} onEditSubmit={onEditSubmit} onEditCancel={onEditCancel} tagColors={tagColors} />)}{edit?.path === `${entry.path}/` && <li><TreeEditor kind={edit.kind === "note" ? "note" : "folder"} value={edit.value} depth={depth + 1} onSubmit={onEditSubmit} onCancel={onEditCancel} /></li>}</ul>}
  </li>;
}
