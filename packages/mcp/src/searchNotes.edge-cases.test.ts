import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resolveWorkspace, ResolvedWorkspace } from "./workspace.js";
import { searchNotes, SearchNotesResult } from "./searchNotes.js";

async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_search_edge_cases_test_${nanos}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}

async function cleanupTempDir(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, force: true });
}

async function createTestWorkspace(root: string): Promise<ResolvedWorkspace> {
  await fs.writeFile(join(root, "note1.md"), "# Project Alpha\n\nThis is the first project note.");
  await fs.writeFile(join(root, "note2.md"), "# Project Beta\n\nSecond project with different content.");
  await fs.writeFile(join(root, "meeting.md"), "# Meeting Notes\n\nDiscussed project alpha timeline.");
  await fs.mkdir(join(root, "projects"), { recursive: true });
  await fs.writeFile(join(root, "projects", "roadmap.md"), "# Roadmap\n\nFuture plans for alpha and beta.");
  await fs.writeFile(join(root, "draft.txt"), "not markdown");
  
  const marnoteDir = join(root, ".marnote");
  await fs.mkdir(marnoteDir, { recursive: true });
  const metadata = {
    entries: {
      "note1.md": { tags: ["project", "active"] },
      "note2.md": { tags: ["project", "planning"] },
      "meeting.md": { tags: ["meeting"] },
      "projects/roadmap.md": { tags: ["planning", "future"] },
    },
  };
  await fs.writeFile(join(marnoteDir, "metadata.json"), JSON.stringify(metadata, null, 2));

  return resolveWorkspace({ path: root });
}

function getResultPaths(results: SearchNotesResult): string[] {
  return results.results.map((r) => r.path);
}

describe("searchNotes - traversal, path, and query edge cases", () => {
  let tempDir: string;
  let workspace: ResolvedWorkspace;

  beforeEach(async () => {
    tempDir = await createTempDir();
    workspace = await createTestWorkspace(tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe("recursive traversal", () => {
    it("searches nested directories", async () => {
      const result = await searchNotes(workspace, "roadmap");
      const paths = getResultPaths(result);
      expect(paths).toContain("projects/roadmap.md");
    });

    it("skips non-markdown files", async () => {
      const result = await searchNotes(workspace, "not");
      const paths = getResultPaths(result);
      expect(paths).not.toContain("draft.txt");
    });
  });

  describe("returns workspace-relative paths", () => {
    it("paths are relative to workspace root", async () => {
      const result = await searchNotes(workspace, "alpha");
      const paths = getResultPaths(result);
      for (const path of paths) {
        expect(path).not.toMatch(/^\//);
        expect(path).not.toMatch(/^\w:/);
        expect(path).not.toContain("..");
      }
    });
  });

  describe("empty query", () => {
    it("returns empty results for empty query", async () => {
      const result = await searchNotes(workspace, "");
      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("returns empty results for whitespace-only query", async () => {
      const result = await searchNotes(workspace, "   ");
      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("case insensitivity", () => {
    it("matches case-insensitively in title", async () => {
      const result = await searchNotes(workspace, "ALPHA");
      const paths = getResultPaths(result);
      expect(paths).toContain("note1.md");
    });

    it("matches case-insensitively in content", async () => {
      const result = await searchNotes(workspace, "TIMELINE");
      const paths = getResultPaths(result);
      expect(paths).toContain("meeting.md");
    });

    it("matches case-insensitively in tags", async () => {
      const result = await searchNotes(workspace, "PLANNING");
      const paths = getResultPaths(result);
      expect(paths).toContain("note2.md");
    });
  });
});