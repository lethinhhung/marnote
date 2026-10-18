import { isTauri } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

export type WorkspaceFolderPickerOptions = {
  defaultPath?: string;
  title?: string;
};

export const isDesktop = () => isTauri();

export async function openWorkspaceFolder(
  options: WorkspaceFolderPickerOptions = {},
): Promise<string | null> {
  const path = await openDialog({
    directory: true,
    multiple: false,
    defaultPath: options.defaultPath,
    title: options.title ?? "Open workspace folder",
  });
  return typeof path === "string" ? path : null;
}
