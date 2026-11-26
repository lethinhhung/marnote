import { describe, expect, it } from "vitest";
import { canonicalTags, crawlerFiles, normalizeSiteUrl } from "./siteMetadata";

describe("site metadata", () => {
  it("normalizes Vercel hostnames and configured URLs", () => {
    expect(normalizeSiteUrl("marnote.example" )).toBe("https://marnote.example");
    expect(normalizeSiteUrl("https://marnote.example/path")).toBe("https://marnote.example");
    expect(normalizeSiteUrl(undefined)).toBeUndefined();
  });

  it("emits absolute canonical and social image URLs", () => {
    expect(canonicalTags("https://marnote.example")).toContain(
      '<link rel="canonical" href="https://marnote.example/" />',
    );
    expect(canonicalTags("https://marnote.example")).toContain(
      '<meta property="og:url" content="https://marnote.example/" />',
    );
  });

  it("omits canonical URLs when the production domain is not configured", () => {
    expect(canonicalTags(undefined)).toBe("");
  });

  it("generates crawler files with the configured sitemap URL", () => {
    const files = crawlerFiles("https://marnote.example");
    expect(files.robots).toContain("Sitemap: https://marnote.example/sitemap.xml");
    expect(files.sitemap).toContain("<loc>https://marnote.example/</loc>");
  });

  it("keeps crawler access open without inventing a sitemap host", () => {
    expect(crawlerFiles(undefined)).toEqual({ robots: "User-agent: *\nAllow: /", sitemap: undefined });
  });
});
