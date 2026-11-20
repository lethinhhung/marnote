import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { isExternalUrl, normalizeLinkUrl } from "@marnote/core";

export { isExternalUrl, normalizeLinkUrl };

export async function openExternalLink(value: string) {
  const href = normalizeLinkUrl(value);
  if (isTauri()) return open(href);
  window.open(href, "_blank", "noopener,noreferrer");
}