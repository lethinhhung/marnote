import { Eye, EyeOff, FilePlus, FolderPlus, Pencil, Trash2 } from "lucide-react";
import type { ExplorerSort } from "../sortEntries";

type Props = {
  treeName: string;
  sort: ExplorerSort;
  onSortChange: (sort: ExplorerSort) => void;
  hideFoldersWithoutNotes: boolean;
  onToggleHideFolders: () => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  actionLabel: string;
  actionPath: string;
  isDesktop: boolean;
  onRefresh?: () => void;
};

export function SidebarTreeHeader(props: Props) {
  const { treeName, sort, onSortChange, hideFoldersWithoutNotes, onToggleHideFolders, onCreateNote, onCreateFolder, onRename, onDelete, actionLabel, actionPath, isDesktop, onRefresh } = props;

  return (
    <div className="sidebar-heading">
      <span>{treeName}</span>
      <div>
        {isDesktop && onRefresh && (
          <button className="explorer-refresh" type="button" title="Refresh workspace" aria-label="Refresh workspace" onClick={onRefresh}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          </button>
        )}
        <select className="explorer-sort" aria-label="Sort Explorer" value={sort} onChange={event => onSortChange(event.target.value as ExplorerSort)}>
          <option value="name">Name</option>
          <option value="modified">Recently modified</option>
          <option value="manual">Manual order</option>
        </select>
        <button
          type="button"
          title={hideFoldersWithoutNotes ? "Show folders without notes" : "Hide folders without notes"}
          aria-label={hideFoldersWithoutNotes ? "Show folders without notes" : "Hide folders without notes"}
          aria-pressed={hideFoldersWithoutNotes}
          onClick={onToggleHideFolders}
        >
          {hideFoldersWithoutNotes ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button title="New Markdown note" aria-label="New Markdown note" onClick={onCreateNote}><FilePlus size={15} /></button>
        <button title="New folder" aria-label="New folder" onClick={onCreateFolder}><FolderPlus size={15} /></button>
        <button
          title={`Rename / move selected ${actionLabel}`}
          aria-label={`Rename / move selected ${actionLabel}`}
          onClick={onRename}
          disabled={!actionPath}
        ><Pencil size={14} /></button>
        <button
          title={`Move selected ${actionLabel} to trash`}
          aria-label={`Move selected ${actionLabel} to trash`}
          onClick={onDelete}
          disabled={!actionPath}
        ><Trash2 size={14} /></button>
      </div>
    </div>
  );
}