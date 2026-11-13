import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const windowDragAvailable = () => isTauri();

export const isMacOS = () => import.meta.env.TAURI_ENV_PLATFORM === "darwin"
  || /Mac/i.test(`${navigator.platform} ${navigator.userAgent}`);

export const startWindowDrag = (): void => {
  if (!isTauri()) return;
  void getCurrentWindow().startDragging().catch(() => undefined);
};
