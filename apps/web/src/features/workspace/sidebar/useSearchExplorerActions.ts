import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { Entry } from "../../../shared/domain/workspace";
import type { TreeEdit } from "../tree/FileTree";
import { isSameOrDescendant } from "../state/workspacePaths";

type Props = { setEdit: Dispatch<SetStateAction<TreeEdit | null>>; setSelectedFolder: Dispatch<SetStateAction<string>>; setTreeFocus: Dispatch<SetStateAction<"note" | "folder" | "none">>; setHideFolders: Dispatch<SetStateAction<boolean>>; selected: string; selectedFolder: string; onDelete: (path: string) => void; onTargetChange?: (path: string, kind: "note" | "folder") => void };

export function useSearchExplorerActions({ setEdit, setSelectedFolder, setTreeFocus, setHideFolders, selected, selectedFolder, onDelete, onTargetChange }: Props) {
  useEffect(() => {
    const rename = (event: Event) => {
      const target = (event as CustomEvent<{ path: string; kind: Entry["kind"] }>).detail;
      if (!target?.path) return;
      const folder = target.kind === "directory";
      setHideFolders(false);
      if (folder) { setSelectedFolder(target.path); setTreeFocus("folder"); onTargetChange?.(target.path, "folder"); }
      else { setTreeFocus("note"); onTargetChange?.(target.path, "note"); }
      setEdit({ kind: folder ? "rename-folder" : "rename-note", path: target.path, value: target.path.split("/").pop() || target.path });
    };
    const remove = (event: Event) => {
      const target = (event as CustomEvent<{ path: string; kind: Entry["kind"] }>).detail;
      if (!target?.path) return;
      const item = target.kind === "directory" ? "folder and all its contents" : "note";
      if (!window.confirm(`Move this ${item} to the workspace trash?`)) { event.preventDefault(); return; }
      onDelete(target.path);
      if (target.kind === "directory" && (selectedFolder === target.path || selectedFolder.startsWith(`${target.path}/`))) {
        setSelectedFolder("");
        setTreeFocus("note");
        if (selected && !isSameOrDescendant(selected, target.path)) {
          onTargetChange?.(selected, "note");
        }
      }
    };
    document.addEventListener("marnote-search-rename", rename);
    document.addEventListener("marnote-search-remove", remove);
    return () => { document.removeEventListener("marnote-search-rename", rename); document.removeEventListener("marnote-search-remove", remove); };
  }, [setEdit, setHideFolders, setSelectedFolder, setTreeFocus, selected, selectedFolder, onDelete, onTargetChange]);
}