import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resolveWorkspace, ResolvedWorkspace } from "./workspace.js";
import { searchNotes, SearchNotesResult } from "./searchNotes.js";

async function createTempDir(): Promise<string> {
  const path = join(tmpdir(), `marnote_search_res_${Date.now()}_${Math.random()}`);
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
const getPaths = (r: SearchNotesResult) => r.results.map(x => x.path);
const getSources = (r: SearchNotesResult) => r.results.map(x => x.source);

describe("searchNotes - ranking & result bounds", () => {
  let tempDir: string, ws: ResolvedWorkspace;
  beforeEach(async () => { tempDir = await createTempDir(); ws = await createTestWorkspace(tempDir); });
  afterEach(async () => { await cleanupTempDir(tempDir); });

  describe("ranking order", () => {
    it("ranks title matches highest (by filename)", async () => { expect(getSources(await searchNotes(ws, "note1"))[0]).toBe("Title"); });
    it("ranks path matches after title", async () => { expect(getSources(await searchNotes(ws, "projects"))[0]).toBe("Path"); });
    it("ranks tag matches after path", async () => { expect(getSources(await searchNotes(ws, "active"))[0]).toBe("Tag"); });
    it("ranks content matches last", async () => { expect(getSources(await searchNotes(ws, "timeline"))[0]).toBe("Content"); });
    it("sorts by path when scores are equal", async () => {
      const d = await createTempDir();
      try {
        await fs.writeFile(join(d, "aaa.md"), "# Alpha");
        await fs.writeFile(join(d, "bbb.md"), "# Alpha");
        const w = await resolveWorkspace({ path: d });
        expect(getPaths(await searchNotes(w, "alpha"))).toEqual(["aaa.md", "bbb.md"]);
      } finally { await cleanupTempDir(d); }
    });
  });

  describe("result bounds", () => {
    it("defaults to 20 results", async () => {
      for (let i = 0; i < 25; i++) await fs.writeFile(join(tempDir, `note${i}.md`), `# Note ${i}`);
      const w = await resolveWorkspace({ path: tempDir });
      const r = await searchNotes(w, "note");
      expect(r.results.length).toBe(20); expect(r.total).toBe(20);
    });
    it("respects custom limit below 20", async () => {
      for (let i = 0; i < 10; i++) await fs.writeFile(join(tempDir, `note${i}.md`), `# Note ${i}`);
      const w = await resolveWorkspace({ path: tempDir });
      const r = await searchNotes(w, "note", 5);
      expect(r.results.length).toBe(5); expect(r.total).toBe(5);
    });
    it("caps at 100 results", async () => {
      for (let i = 0; i < 120; i++) await fs.writeFile(join(tempDir, `note${i}.md`), `# Note ${i}`);
      const w = await resolveWorkspace({ path: tempDir });
      const r = await searchNotes(w, "note", 200);
      expect(r.results.length).toBe(100); expect(r.total).toBe(100);
    });
    it("clamps negative limit to 1", async () => {
      await fs.writeFile(join(tempDir, "note.md"), "# Note");
      const w = await resolveWorkspace({ path: tempDir });
      expect((await searchNotes(w, "note", -5)).results.length).toBe(1);
    });
  });
});