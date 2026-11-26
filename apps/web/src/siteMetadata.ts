export const siteDescription =
  "A calm, local-first workspace for everyday notes and project docs. Work offline and keep your files yours.";

export function normalizeSiteUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return new URL(withProtocol).origin;
}

export function canonicalTags(siteUrl?: string): string {
  if (!siteUrl) return "";
  const canonical = `${siteUrl}/`;
  return [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:url" content="${canonical}" />`,
  ].join("\n    ");
}

export function crawlerFiles(siteUrl?: string): { robots: string; sitemap?: string } {
  const sitemapUrl = siteUrl ? `${siteUrl}/sitemap.xml` : undefined;
  return {
    robots: ["User-agent: *", "Allow: /", sitemapUrl && `Sitemap: ${sitemapUrl}`]
      .filter(Boolean)
      .join("\n"),
    sitemap: siteUrl
      ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}/</loc></url></urlset>\n`
      : undefined,
  };
}
