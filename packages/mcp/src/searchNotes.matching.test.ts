import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resolveWorkspace, ResolvedWorkspace } from "./workspace.js";
import { searchNotes, SearchNotesResult } from "./searchNotes.js";

async function createTempDir(): Promise<string> {
  const path = join(tmpdir(), `marnote_search_match_${Date.now()}_${Math.random()}`);
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

describe("searchNotes - field matching & multi-word", () => {
  let tempDir: string, ws: ResolvedWorkspace;
  beforeEach(async () => { tempDir = await createTempDir(); ws = await createTestWorkspace(tempDir); });
  afterEach(async () => { await cleanupTempDir(tempDir); });

  describe("basic search across fields", () => {
    it("finds matches in title", async () => { expect(getPaths(await searchNotes(ws, "alpha"))).toEqual(expect.arrayContaining(["note1.md", "projects/roadmap.md"])); });
    it("finds matches in path", async () => { expect(getPaths(await searchNotes(ws, "projects"))).toContain("projects/roadmap.md"); });
    it("finds matches in tags", async () => { expect(getPaths(await searchNotes(ws, "planning"))).toEqual(expect.arrayContaining(["note2.md", "projects/roadmap.md"])); });
    it("finds matches in content", async () => { expect(getPaths(await searchNotes(ws, "timeline"))).toContain("meeting.md"); });
  });
  describe("multi-word queries", () => {
    it("requires all words to match", async () => { const p = getPaths(await searchNotes(ws, "project alpha")); expect(p).toContain("note1.md"); expect(p).not.toContain("note2.md"); });
    it("matches across different fields for different words", async () => { expect(getPaths(await searchNotes(ws, "project active"))).toContain("note1.md"); });
  });
});