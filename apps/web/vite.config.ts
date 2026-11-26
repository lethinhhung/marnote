import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalTags, crawlerFiles, normalizeSiteUrl } from "./src/siteMetadata";

function seoMetadata(siteUrl?: string): Plugin {
  return {
    name: "marnote-seo-metadata",
    transformIndexHtml(html) {
      const absoluteImage = siteUrl ? `${siteUrl}/brand/og-image.svg` : undefined;
      const withAbsoluteImage = absoluteImage
        ? html.replaceAll('content="/brand/og-image.svg"', `content="${absoluteImage}"`)
        : html;
      return withAbsoluteImage.replace(
        "  </head>",
        `    ${canonicalTags(siteUrl)}\n  </head>`,
      );
    },
    async closeBundle() {
      const output = resolve(__dirname, "dist");
      const files = crawlerFiles(siteUrl);
      await mkdir(output, { recursive: true });
      await writeFile(resolve(output, "robots.txt"), `${files.robots}\n`);
      if (files.sitemap) await writeFile(resolve(output, "sitemap.xml"), files.sitemap);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = normalizeSiteUrl(
    env.VITE_SITE_URL ?? env.VERCEL_PROJECT_PRODUCTION_URL ?? "https://marnote.vercel.app",
  );
  return {
    plugins: [react() as unknown as Plugin, seoMetadata(siteUrl)],
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
