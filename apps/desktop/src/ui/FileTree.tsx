import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import type { Entry } from "./workspaceTypes";

export function FileTree({ entries, selected, onOpen }: { entries: Entry[]; selected: string; onOpen: (entry: Entry) => void }) {
  return <ul className="file-tree">{entries.map(entry => <TreeRow key={entry.path} entry={entry} selected={selected} onOpen={onOpen} depth={0} />)}</ul>;
}
function TreeRow({ entry, selected, onOpen, depth }: { entry: Entry; selected: string; onOpen: (entry: Entry) => void; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const folder = entry.kind === "directory";
  return <li>
    <button className={`tree-item ${selected === entry.path ? "selected" : ""}`} style={{ paddingLeft: 9 + depth * 14 }} onClick={() => folder ? setExpanded(!expanded) : onOpen(entry)} title={entry.path}>
      {folder ? expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span className="tree-indent" />}
      {folder ? <Folder size={15} /> : <FileText size={15} />}<span>{entry.name}</span>
    </button>
    {folder && expanded && !!entry.children?.length && <ul>{entry.children.map(child => <TreeRow key={child.path} entry={child} selected={selected} onOpen={onOpen} depth={depth + 1} />)}</ul>}
  </li>;
}
