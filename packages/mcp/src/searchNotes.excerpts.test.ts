import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resolveWorkspace, ResolvedWorkspace } from "./workspace.js";
import { searchNotes, SearchNotesResult } from "./searchNotes.js";

async function createTempDir(): Promise<string> {
  const path = join(tmpdir(), `marnote_search_exc_${Date.now()}_${Math.random()}`);
  await fs.mkdir(path, { recursive: true });
  return path;
}
async function cleanupTempDir(path: string): Promise<void> { await fs.rm(path, { recursive: true, force: true }); }
async function createTestWorkspace(root: string): Promise<ResolvedWorkspace> {
  await fs.writeFile(join(root, "note1.md"), "# Project Alpha\n\nThis is the first project note.");
  await fs.writeFile(join(root, "note2.md"), "# Project Beta\n\nSecond project with different content.");
  await fs.writeFile(join(root, "meeting.md"), "# Meeting Notes\n\nDiscussed project alpha timeline.");
  await fs.mkdir(join(root, "projects"), { recursive: true });
  await fs.writeFile(join(root, "projects/roadmap.md"), "# Roadmap\n\nFuture plans for alpha and beta.");
  await fs.writeFile(join(root, "draft.txt"), "not markdown");
  const meta = { entries: { "note1.md": { tags: ["project", "active"] }, "note2.md": { tags: ["project", "planning"] }, "meeting.md": { tags: ["meeting"] }, "projects/roadmap.md": { tags: ["planning", "future"] } } };
  await fs.mkdir(join(root, ".marnote"), { recursive: true });
  await fs.writeFile(join(root, ".marnote/metadata.json"), JSON.stringify(meta));
  return resolveWorkspace({ path: root });
}
const getExcerpts = (r: SearchNotesResult) => r.results.map(x => x.excerpt);

describe("searchNotes - excerpts & missing metadata", () => {
  let tempDir: string, ws: ResolvedWorkspace;
  beforeEach(async () => { tempDir = await createTempDir(); ws = await createTestWorkspace(tempDir); });
  afterEach(async () => { await cleanupTempDir(tempDir); });

  describe("excerpts", () => {
    it("includes excerpt for content matches", async () => { expect(getExcerpts(await searchNotes(ws, "discussed"))[0].toLowerCase()).toContain("discussed"); });
    it("includes ellipsis when match is in middle of long content", async () => {
      const d = await createTempDir();
      try {
        await fs.writeFile(join(d, "long.md"), "A".repeat(200) + "\n\nDiscussed project alpha timeline.\n\n" + "B".repeat(200));
        const w = await resolveWorkspace({ path: d });
        const e = getExcerpts(await searchNotes(w, "discussed"))[0];
        expect(e.toLowerCase()).toContain("discussed"); expect(e).toContain("…");
      } finally { await cleanupTempDir(d); }
    });
    it("has empty excerpt for title matches", async () => { expect(getExcerpts(await searchNotes(ws, "note1"))[0]).toBe(""); });
    it("has empty excerpt for path matches", async () => { expect(getExcerpts(await searchNotes(ws, "projects"))[0]).toBe(""); });
    it("has empty excerpt for tag matches", async () => { expect(getExcerpts(await searchNotes(ws, "active"))[0]).toBe(""); });
  });

  describe("handles missing metadata gracefully", () => {
    it("works when .marnote directory is missing", async () => {
      const d = await createTempDir();
      try {
        await fs.writeFile(join(d, "note.md"), "# Test Note");
        const w = await resolveWorkspace({ path: d });
        const r = await searchNotes(w, "test");
        expect(r.results.length).toBe(1); expect(r.results[0].path).toBe("note.md");
      } finally { await cleanupTempDir(d); }
    });
    it("works when metadata.json is missing", async () => {
      const d = await createTempDir();
      try {
        await fs.writeFile(join(d, "note.md"), "# Test Note");
        await fs.mkdir(join(d, ".marnote"), { recursive: true });
        expect((await searchNotes(await resolveWorkspace({ path: d }), "test")).results.length).toBe(1);
      } finally { await cleanupTempDir(d); }
    });
    it("works when metadata.json is empty", async () => {
      const d = await createTempDir();
      try {
        await fs.writeFile(join(d, "note.md"), "# Test Note");
        await fs.mkdir(join(d, ".marnote"), { recursive: true });
        await fs.writeFile(join(d, ".marnote/metadata.json"), "");
        expect((await searchNotes(await resolveWorkspace({ path: d }), "test")).results.length).toBe(1);
      } finally { await cleanupTempDir(d); }
    });
    it("works when metadata entries have no tags", async () => {
      const d = await createTempDir();
      try {
        await fs.writeFile(join(d, "note.md"), "# Test Note");
        await fs.mkdir(join(d, ".marnote"), { recursive: true });
        await fs.writeFile(join(d, ".marnote/metadata.json"), JSON.stringify({ entries: { "note.md": {} } }));
        expect((await searchNotes(await resolveWorkspace({ path: d }), "test")).results.length).toBe(1);
      } finally { await cleanupTempDir(d); }
    });
  });
});