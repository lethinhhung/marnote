import { isExternalUrl, normalizeLinkUrl } from "@marnote/core";

export { isExternalUrl, normalizeLinkUrl };

export async function openExternalLink(value: string) {
  const href = normalizeLinkUrl(value);
  window.open(href, "_blank", "noopener,noreferrer");
}