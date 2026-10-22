import { invoke } from "@tauri-apps/api/core";
import type { WorkspaceTree, WorkspaceEntryMetadata } from "../shared/domain/workspace";

export type ReadResult = { path: string; content: string; modifiedMs: number };
export const openWorkspace = (path: string) => invoke<WorkspaceTree>("open_workspace", { path });
export const openDefaultWorkspace = () => invoke<WorkspaceTree>("default_workspace");
export const listWorkspace = (rootPath: string) => invoke<WorkspaceTree>("list_workspace_tree", { rootPath });
export const readFile = (rootPath: string, path: string) => invoke<ReadResult>("file_read_markdown", { rootPath, path });
export const writeFile = (rootPath: string, path: string, content: string, expectedContent: string) =>
  invoke<void>("file_update_markdown", { rootPath, path, content, expectedContent });
export const createFile = (rootPath: string, path: string, content = "") => invoke<string>("file_create_markdown", { rootPath, path, content });
export const moveFile = (rootPath: string, source: string, destination: string) => invoke<void>("file_move", { rootPath, source, destination });
export const deleteFile = (rootPath: string, path: string) => invoke<string>("file_delete", { rootPath, path });
export type TrashItem = { id: string; path: string; kind: "file" | "directory"; restorable: boolean };
export const listTrash = (rootPath: string) => invoke<TrashItem[]>("file_list_trash", { rootPath });
export const restoreTrash = (rootPath: string, id: string) => invoke<void>("file_restore_trash", { rootPath, id });
export const emptyTrash = (rootPath: string) => invoke<void>("file_empty_trash", { rootPath });
export const createFolder = (rootPath: string, path: string) => invoke<string>("folder_create", { rootPath, path });

export type UpdateEntryMetadataInput = Pick<WorkspaceEntryMetadata, "tags" | "icon" | "favorite">;
export const updateEntryMetadata = (rootPath: string, path: string, metadata: UpdateEntryMetadataInput) =>
  invoke<void>("update_entry_metadata", { rootPath, path, ...metadata });
export const saveWorkspaceTags = (rootPath: string, tags: Record<string, string>) =>
  invoke<void>("save_workspace_tags", { rootPath, tags });
export const saveManualOrder = (rootPath: string, parent: string, paths: string[]) =>
  invoke<void>("save_manual_order", { rootPath, parent, paths });
export const renameWorkspaceTag = (rootPath: string, oldName: string, newName: string, color: string) =>
  invoke<void>("rename_workspace_tag", { rootPath, oldName, newName, color });
