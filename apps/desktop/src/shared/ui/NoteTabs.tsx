import { File, Plus, X } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  paths: string[];
  icons?: Record<string, ReactNode>;
  dirtyPath?: string;
  activePath: string;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  onCreate: () => void;
  canCreate: boolean;
};

export function NoteTabs({ paths, icons = {}, dirtyPath, activePath, onSelect, onClose, onCreate, canCreate }: Props) {
  return <nav className="note-tabs" aria-label="Open notes">
    <div className="note-tabs-list" role="tablist">
      {paths.map(path => {
        const title = path.split("/").pop() || path;
        const active = path === activePath;
        return <div className={`note-tab ${active ? "active" : ""}`} key={path}>
          <button type="button" role="tab" aria-selected={active} onClick={() => onSelect(path)}>
            <span className="note-tab-icon" aria-hidden="true">{icons[path] || <File size={14} />}</span><span>{title}</span>
          </button>
          {dirtyPath === path && <span className="note-tab-dirty" role="img" aria-label="Unsaved changes" title="Unsaved changes" />}
          <button className="note-tab-close" type="button" aria-label={`Close ${title}`} onClick={() => onClose(path)}><X size={12} /></button>
        </div>;
      })}
      <button className="note-tab-add" type="button" aria-label="New note" title="New note" disabled={!canCreate} onClick={onCreate}><Plus size={15} /></button>
    </div>
  </nav>;
}
