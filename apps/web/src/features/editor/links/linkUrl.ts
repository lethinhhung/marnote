const domain = /^(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i;
const externalScheme = /^[a-z][a-z\d+.-]*:/i;

export function isExternalUrl(value: string): boolean {
  return externalScheme.test(value) || value.startsWith("//");
}

export function normalizeLinkUrl(value: string) {
  const href = value.trim();
  if (isExternalUrl(href) || href.startsWith("/")) return href;
  if (href.startsWith("./") || href.startsWith("../") || href.endsWith("/") || /(?:^|\/)\.{0,2}[^/]*\.md(?:[?#].*)?$/i.test(href)) return href;
  return domain.test(href) ? `https://${href}` : href;
}

export async function openExternalLink(value: string) {
  const href = normalizeLinkUrl(value);
  window.open(href, "_blank", "noopener,noreferrer");
}