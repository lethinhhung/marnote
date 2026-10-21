import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const windowDragAvailable = () => isTauri();

export const startWindowDrag = (): void => {
  if (!isTauri()) return;
  void getCurrentWindow().startDragging().catch(() => undefined);
};
