import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";

export function isDesktopApp(): boolean {
  return isTauri();
}

export async function pickWorkspaceDirectory(defaultPath?: string): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath,
    title: "Open workspace folder",
  });
  return typeof selected === "string" ? selected : null;
}

export function startWindowDragging(): void {
  void getCurrentWindow().startDragging().catch(() => undefined);
}
