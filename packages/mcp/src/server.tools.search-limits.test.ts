import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { initializeServer } from "./server.js";
import {
  getTools,
  createTempDir,
  cleanupTempDir,
} from "./server.testUtils.js";

describe("initializeServer - search_notes limits and paths", () => {
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

  it("search_notes tool respects default limit of 20", async () => {
    const tempDir2 = await createTempDir();
    try {
      for (let i = 0; i < 25; i++) {
        await fs.writeFile(join(tempDir2, `note${i}.md`), `# Note ${i}`);
      }
      const marnoteDir = join(tempDir2, ".marnote");
      await fs.mkdir(marnoteDir, { recursive: true });
      await fs.writeFile(join(marnoteDir, "metadata.json"), JSON.stringify({ entries: {} }));

      const server = await initializeServer({ workspacePath: tempDir2 });
      const data = JSON.parse((await getTools(server).search_notes.handler({ query: "note" })).content[0].text);

      expect(data.results.length).toBe(20);
      expect(data.total).toBe(20);
    } finally {
      await cleanupTempDir(tempDir2);
    }
  });

  it("search_notes tool caps results at 100", async () => {
    const tempDir2 = await createTempDir();
    try {
      for (let i = 0; i < 120; i++) {
        await fs.writeFile(join(tempDir2, `note${i}.md`), `# Note ${i}`);
      }
      const marnoteDir = join(tempDir2, ".marnote");
      await fs.mkdir(marnoteDir, { recursive: true });
      await fs.writeFile(join(marnoteDir, "metadata.json"), JSON.stringify({ entries: {} }));

      const server = await initializeServer({ workspacePath: tempDir2 });
      const data = JSON.parse((await getTools(server).search_notes.handler({ query: "note", limit: 200 })).content[0].text);

      expect(data.results.length).toBe(100);
      expect(data.total).toBe(100);
    } finally {
      await cleanupTempDir(tempDir2);
    }
  });

  it("search_notes tool returns workspace-relative paths", async () => {
    const tempDir2 = await createTempDir();
    try {
      await fs.writeFile(join(tempDir2, "note.md"), "# Test");
      const marnoteDir = join(tempDir2, ".marnote");
      await fs.mkdir(marnoteDir, { recursive: true });
      await fs.writeFile(join(marnoteDir, "metadata.json"), JSON.stringify({ entries: {} }));

      const server = await initializeServer({ workspacePath: tempDir2 });
      const data = JSON.parse((await getTools(server).search_notes.handler({ query: "test" })).content[0].text);

      expect(data.results[0].path).toBe("note.md");
      expect(data.results[0].path).not.toMatch(/^\//);
      expect(data.results[0].path).not.toContain("..");
    } finally {
      await cleanupTempDir(tempDir2);
    }
  });
});