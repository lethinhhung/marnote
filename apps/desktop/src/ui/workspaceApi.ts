import { invoke } from "@tauri-apps/api/core";
import type { WorkspaceTree } from "./workspaceTypes";

export type ReadResult = { path: string; content: string; modifiedMs: number };
export const openWorkspace = (path: string) => invoke<WorkspaceTree>("open_workspace", { path });
export const listWorkspace = (rootPath: string) => invoke<WorkspaceTree>("list_workspace_tree", { rootPath });
export const readFile = (rootPath: string, path: string) => invoke<ReadResult>("file_read_markdown", { rootPath, path });
export const writeFile = (rootPath: string, path: string, content: string, expectedContent: string) =>
  invoke<void>("file_update_markdown", { rootPath, path, content, expectedContent });
export const createFile = (rootPath: string, path: string, content = "") => invoke<void>("file_create_markdown", { rootPath, path, content });
export const moveFile = (rootPath: string, source: string, destination: string) => invoke<void>("file_move", { rootPath, source, destination });
export const deleteFile = (rootPath: string, path: string) => invoke<string>("file_delete", { rootPath, path });
