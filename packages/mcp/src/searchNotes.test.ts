import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resolveWorkspace, ResolvedWorkspace } from "./workspace.js";
import { searchNotes, SearchNotesResult } from "./searchNotes.js";
import { SearchMatch } from "./searchMatching.js";

async function createTempDir(): Promise<string> {
  const nanos = Date.now() + Math.random();
  const path = join(tmpdir(), `marnote_mcp_search_test_${nanos}`);
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

function getResultSources(results: SearchNotesResult): SearchMatch["source"][] {
  return results.results.map((r) => r.source);
}

function getResultExcerpts(results: SearchNotesResult): string[] {
  return results.results.map((r) => r.excerpt);
}

describe("searchNotes", () => {
  let tempDir: string;
  let workspace: ResolvedWorkspace;

  beforeEach(async () => {
    tempDir = await createTempDir();
    workspace = await createTestWorkspace(tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe("basic search across fields", () => {
    it("finds matches in title", async () => {
      const result = await searchNotes(workspace, "alpha");
      const paths = getResultPaths(result);
      expect(paths).toContain("note1.md");
      expect(paths).toContain("projects/roadmap.md");
    });

    it("finds matches in path", async () => {
      const result = await searchNotes(workspace, "projects");
      const paths = getResultPaths(result);
      expect(paths).toContain("projects/roadmap.md");
    });

    it("finds matches in tags", async () => {
      const result = await searchNotes(workspace, "planning");
      const paths = getResultPaths(result);
      expect(paths).toContain("note2.md");
      expect(paths).toContain("projects/roadmap.md");
    });

    it("finds matches in content", async () => {
      const result = await searchNotes(workspace, "timeline");
      const paths = getResultPaths(result);
      expect(paths).toContain("meeting.md");
    });
  });

  describe("ranking order", () => {
    it("ranks title matches highest (by filename)", async () => {
      const result = await searchNotes(workspace, "note1");
      const sources = getResultSources(result);
      expect(sources[0]).toBe("Title");
    });

    it("ranks path matches after title", async () => {
      const result = await searchNotes(workspace, "projects");
      const sources = getResultSources(result);
      expect(sources[0]).toBe("Path");
    });

    it("ranks tag matches after path", async () => {
      const result = await searchNotes(workspace, "active");
      const sources = getResultSources(result);
      expect(sources[0]).toBe("Tag");
    });

    it("ranks content matches last", async () => {
      const result = await searchNotes(workspace, "timeline");
      const sources = getResultSources(result);
      expect(sources[0]).toBe("Content");
    });

    it("sorts by path when scores are equal", async () => {
      const freshDir = await createTempDir();
      try {
        await fs.writeFile(join(freshDir, "aaa.md"), "# Alpha");
        await fs.writeFile(join(freshDir, "bbb.md"), "# Alpha");
        const ws = await resolveWorkspace({ path: freshDir });
        
        const result = await searchNotes(ws, "alpha");
        const paths = getResultPaths(result);
        expect(paths).toEqual(["aaa.md", "bbb.md"]);
      } finally {
        await cleanupTempDir(freshDir);
      }
    });
  });

  describe("excerpts", () => {
    it("includes excerpt for content matches", async () => {
      const result = await searchNotes(workspace, "discussed");
      const excerpts = getResultExcerpts(result);
      expect(excerpts[0].toLowerCase()).toContain("discussed");
    });

    it("includes ellipsis when match is in middle of long content", async () => {
      const freshDir = await createTempDir();
      try {
        const longContent = "A".repeat(200) + "\n\nDiscussed project alpha timeline.\n\n" + "B".repeat(200);
        await fs.writeFile(join(freshDir, "long.md"), longContent);
        const ws = await resolveWorkspace({ path: freshDir });
        
        const result = await searchNotes(ws, "discussed");
        const excerpts = getResultExcerpts(result);
        expect(excerpts[0].toLowerCase()).toContain("discussed");
        expect(excerpts[0]).toContain("…");
      } finally {
        await cleanupTempDir(freshDir);
      }
    });

    it("has empty excerpt for title matches", async () => {
      const result = await searchNotes(workspace, "note1");
      const excerpts = getResultExcerpts(result);
      expect(excerpts[0]).toBe("");
    });

    it("has empty excerpt for path matches", async () => {
      const result = await searchNotes(workspace, "projects");
      const excerpts = getResultExcerpts(result);
      expect(excerpts[0]).toBe("");
    });

    it("has empty excerpt for tag matches", async () => {
      const result = await searchNotes(workspace, "active");
      const excerpts = getResultExcerpts(result);
      expect(excerpts[0]).toBe("");
    });
  });

  describe("result bounds", () => {
    it("defaults to 20 results", async () => {
      for (let i = 0; i < 25; i++) {
        await fs.writeFile(join(tempDir, `note${i}.md`), `# Note ${i}`);
      }
      const ws = await resolveWorkspace({ path: tempDir });
      
      const result = await searchNotes(ws, "note");
      expect(result.results.length).toBe(20);
      expect(result.total).toBe(20);
    });

    it("respects custom limit below 20", async () => {
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(join(tempDir, `note${i}.md`), `# Note ${i}`);
      }
      const ws = await resolveWorkspace({ path: tempDir });
      
      const result = await searchNotes(ws, "note", 5);
      expect(result.results.length).toBe(5);
      expect(result.total).toBe(5);
    });

    it("caps at 100 results", async () => {
      for (let i = 0; i < 120; i++) {
        await fs.writeFile(join(tempDir, `note${i}.md`), `# Note ${i}`);
      }
      const ws = await resolveWorkspace({ path: tempDir });
      
      const result = await searchNotes(ws, "note", 200);
      expect(result.results.length).toBe(100);
      expect(result.total).toBe(100);
    });

    it("clamps negative limit to 1", async () => {
      await fs.writeFile(join(tempDir, "note.md"), "# Note");
      const ws = await resolveWorkspace({ path: tempDir });
      
      const result = await searchNotes(ws, "note", -5);
      expect(result.results.length).toBe(1);
    });
  });

  describe("handles missing metadata gracefully", () => {
    it("works when .marnote directory is missing", async () => {
      const emptyDir = await createTempDir();
      try {
        await fs.writeFile(join(emptyDir, "note.md"), "# Test Note");
        const ws = await resolveWorkspace({ path: emptyDir });
        
        const result = await searchNotes(ws, "test");
        expect(result.results.length).toBe(1);
        expect(result.results[0].path).toBe("note.md");
      } finally {
        await cleanupTempDir(emptyDir);
      }
    });

    it("works when metadata.json is missing", async () => {
      const emptyDir = await createTempDir();
      try {
        await fs.writeFile(join(emptyDir, "note.md"), "# Test Note");
        await fs.mkdir(join(emptyDir, ".marnote"), { recursive: true });
        const ws = await resolveWorkspace({ path: emptyDir });
        
        const result = await searchNotes(ws, "test");
        expect(result.results.length).toBe(1);
      } finally {
        await cleanupTempDir(emptyDir);
      }
    });

    it("works when metadata.json is empty", async () => {
      const emptyDir = await createTempDir();
      try {
        await fs.writeFile(join(emptyDir, "note.md"), "# Test Note");
        await fs.mkdir(join(emptyDir, ".marnote"), { recursive: true });
        await fs.writeFile(join(emptyDir, ".marnote", "metadata.json"), "");
        const ws = await resolveWorkspace({ path: emptyDir });
        
        const result = await searchNotes(ws, "test");
        expect(result.results.length).toBe(1);
      } finally {
        await cleanupTempDir(emptyDir);
      }
    });

    it("works when metadata entries have no tags", async () => {
      const emptyDir = await createTempDir();
      try {
        await fs.writeFile(join(emptyDir, "note.md"), "# Test Note");
        await fs.mkdir(join(emptyDir, ".marnote"), { recursive: true });
        await fs.writeFile(join(emptyDir, ".marnote", "metadata.json"), JSON.stringify({ entries: { "note.md": {} } }));
        const ws = await resolveWorkspace({ path: emptyDir });
        
        const result = await searchNotes(ws, "test");
        expect(result.results.length).toBe(1);
      } finally {
        await cleanupTempDir(emptyDir);
      }
    });
  });

  describe("multi-word queries", () => {
    it("requires all words to match", async () => {
      const result = await searchNotes(workspace, "project alpha");
      const paths = getResultPaths(result);
      expect(paths).toContain("note1.md");
      expect(paths).not.toContain("note2.md");
    });

    it("matches across different fields for different words", async () => {
      const result = await searchNotes(workspace, "project active");
      const paths = getResultPaths(result);
      expect(paths).toContain("note1.md");
    });
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