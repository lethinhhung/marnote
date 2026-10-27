import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";

const domain = /^(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i;

export function normalizeLinkUrl(value: string) {
  const href = value.trim();
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("/")) return href;
  if (href.startsWith("./") || href.startsWith("../") || href.endsWith("/") || /(?:^|\/)\.{0,2}[^/]*\.md(?:[?#].*)?$/i.test(href)) return href;
  return domain.test(href) ? `https://${href}` : href;
}

export async function openExternalLink(value: string) {
  const href = normalizeLinkUrl(value);
  if (isTauri()) return open(href);
  window.open(href, "_blank", "noopener,noreferrer");
}