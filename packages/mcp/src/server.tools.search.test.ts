import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { initializeServer } from "./server.js";
import {
  getTools,
  createTempDir,
  cleanupTempDir,
  type SearchResult,
} from "./server.testUtils.js";

describe("initializeServer - search_notes matching and ranking", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await fs.writeFile(join(tempDir, "note.md"), "# Test Note");
    await fs.mkdir(join(tempDir, "folder"), { recursive: true });
    await fs.writeFile(join(tempDir, "folder", "inner.md"), "# Inner Note");
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it("search_notes tool is registered with correct schema", async () => {
    const server = await initializeServer({ workspacePath: tempDir });
    expect(getTools(server).search_notes).toBeDefined();
  });

  it("search_notes tool searches across title, path, tags, and content", async () => {
    const tempDir2 = await createTempDir();
    try {
      await fs.writeFile(join(tempDir2, "note1.md"), "# Project Alpha\n\nContent about alpha.");
      await fs.writeFile(join(tempDir2, "note2.md"), "# Project Beta\n\nContent about beta.");
      await fs.mkdir(join(tempDir2, "projects"), { recursive: true });
      await fs.writeFile(join(tempDir2, "projects", "roadmap.md"), "# Roadmap\n\nFuture plans.");
      const marnoteDir = join(tempDir2, ".marnote");
      await fs.mkdir(marnoteDir, { recursive: true });
      await fs.writeFile(
        join(marnoteDir, "metadata.json"),
        JSON.stringify({
          entries: {
            "note1.md": { tags: ["project", "active"] },
            "note2.md": { tags: ["project", "planning"] },
            "projects/roadmap.md": { tags: ["planning"] },
          },
        })
      );

      const server = await initializeServer({ workspacePath: tempDir2 });
      const searchTool = getTools(server).search_notes;

      const titleData = JSON.parse((await searchTool.handler({ query: "alpha" })).content[0].text) as SearchResult;
      expect(titleData.results.some((r) => r.path === "note1.md")).toBe(true);

      const tagData = JSON.parse((await searchTool.handler({ query: "planning" })).content[0].text) as SearchResult;
      expect(tagData.results.some((r) => r.path === "note2.md")).toBe(true);
      expect(tagData.results.some((r) => r.path === "projects/roadmap.md")).toBe(true);

      const contentData = JSON.parse((await searchTool.handler({ query: "future" })).content[0].text) as SearchResult;
      expect(contentData.results.some((r) => r.path === "projects/roadmap.md")).toBe(true);

      const pathData = JSON.parse((await searchTool.handler({ query: "projects" })).content[0].text) as SearchResult;
      expect(pathData.results.some((r) => r.path === "projects/roadmap.md")).toBe(true);
    } finally {
      await cleanupTempDir(tempDir2);
    }
  });

  it("search_notes tool returns ranked results with excerpts", async () => {
    const tempDir2 = await createTempDir();
    try {
      await fs.writeFile(join(tempDir2, "alpha.md"), "# Alpha Note\n\nThis is alpha content.");
      await fs.writeFile(join(tempDir2, "beta.md"), "# Beta Note\n\nDifferent content.");
      const marnoteDir = join(tempDir2, ".marnote");
      await fs.mkdir(marnoteDir, { recursive: true });
      await fs.writeFile(join(marnoteDir, "metadata.json"), JSON.stringify({ entries: {} }));

      const server = await initializeServer({ workspacePath: tempDir2 });
      const data = JSON.parse((await getTools(server).search_notes.handler({ query: "alpha" })).content[0].text);

      expect(data.results[0].source).toBe("Title");
      expect(data.results[0].excerpt).toBe("");
      expect(data.results[0].path).toBe("alpha.md");
    } finally {
      await cleanupTempDir(tempDir2);
    }
  });
});