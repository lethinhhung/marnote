import { File, FilePlus, FileText, Folder, FolderPlus, Pencil, Star, Tag, Trash2 } from "lucide-react";
import type { Entry } from "../workspaceTypes";
import type { UpdateEntryMetadataInput } from "../../../platform/workspace";
import { EmojiPicker } from "../../../shared/ui/EmojiPicker";
import { requestTagEdit } from "../../../shared/ui/tagEditRequest";

type Props = {
  folderMenu: { path: string; kind: "note" | "folder" | "root"; x: number; y: number };
  tree: Entry[];
  onUpdateMetadata: (path: string, metadata: UpdateEntryMetadataInput) => void;
  onClose: () => void;
  onCreateNote: (parent: string) => void;
  onCreateFolder: (parent: string) => void;
  onRename: (path: string, isFolder: boolean) => void;
  onMove: (path: string) => void;
  onDelete: (path: string) => void;
};

function menuEntry(entries: Entry[], path: string): Entry | undefined {
  for (const entry of entries) {
    if (entry.path === path) return entry;
    const child = entry.children && menuEntry(entry.children, path);
    if (child) return child;
  }
}

export function FolderContextMenu(props: Props) {
  const { folderMenu, tree, onUpdateMetadata, onClose, onCreateNote, onCreateFolder, onRename, onMove, onDelete } = props;
  const entry = menuEntry(tree, folderMenu.path);

  return (
    <div className="folder-context-menu" role="menu" style={{ left: folderMenu.x, top: folderMenu.y }} onPointerDown={event => event.stopPropagation()}>
      {folderMenu.kind !== "root" && onUpdateMetadata && (
        <>
          <button role="menuitem" onClick={() => {
            const value = window.prompt("Tags (comma separated)", entry?.metadata?.tags?.join(", ") ?? "");
            if (value !== null) onUpdateMetadata(folderMenu.path, { tags: value.split(",").map(tag => tag.trim()).filter(Boolean) });
            onClose();
          }}>
            <Tag size={14} /> Assign tags
          </button>
          {(entry?.metadata?.tags ?? []).map(tag => (
            <button key={tag} role="menuitem" onClick={() => { onClose(); requestTagEdit(tag); }}>
              <Pencil size={14} /> Edit #{tag}
            </button>
          ))}
          <span className="folder-emoji-action" onClick={event => {
            if ((event.target as HTMLElement).closest(".emoji-picker")) return;
            (event.currentTarget.querySelector(".emoji-picker > button") as HTMLButtonElement | null)?.click();
          }}>
            <EmojiPicker
              value={entry?.metadata?.icon}
              label={`Choose ${folderMenu.kind} emoji`}
              fallback={folderMenu.kind === "folder" ? <Folder size={14} /> : entry?.isEmpty ? <File size={14} /> : <FileText size={14} />}
              onChange={icon => { onUpdateMetadata(folderMenu.path, { icon }); onClose(); }}
            />
            Choose emoji icon
          </span>
          <button role="menuitem" onClick={() => { onUpdateMetadata(folderMenu.path, { favorite: !entry?.metadata?.favorite }); onClose(); }}>
            <Star size={14} /> {entry?.metadata?.favorite ? "Remove favorite" : "Add favorite"}
          </button>
        </>
      )}
      {folderMenu.kind !== "note" && (
        <>
          <button role="menuitem" onClick={() => { onCreateNote(folderMenu.path); onClose(); }}>
            <FilePlus size={15} /> New note{folderMenu.path ? " here" : ""}
          </button>
          <button role="menuitem" onClick={() => { onCreateFolder(folderMenu.path); onClose(); }}>
            <FolderPlus size={15} /> {folderMenu.path ? "New subfolder" : "New folder"}
          </button>
        </>
      )}
      {folderMenu.kind === "folder" && <button role="menuitem" onClick={() => { onRename(folderMenu.path, true); onClose(); }}><Pencil size={14} /> Rename</button>}
      {folderMenu.kind === "note" && <button role="menuitem" onClick={() => { onRename(folderMenu.path, false); onClose(); }}><Pencil size={14} /> Rename</button>}
      {folderMenu.kind !== "root" && <button role="menuitem" onClick={() => { onMove(folderMenu.path); onClose(); }}><FolderPlus size={14} /> Move to folder\u2026</button>}
      {folderMenu.kind !== "root" && <button role="menuitem" className="danger" onClick={() => {
        const item = folderMenu.kind === "folder" ? "folder and all its contents" : "note";
        if (window.confirm(`Move this ${item} to the workspace trash?`)) {
          onDelete(folderMenu.path);
        }
        onClose();
      }}><Trash2 size={14} /> Move to trash</button>}
    </div>
  );
}