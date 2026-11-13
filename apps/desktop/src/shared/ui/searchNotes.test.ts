import { describe, expect, it } from "vitest";
import { parseSearchQuery, searchWorkspace } from "./searchNotes";
import type { Entry } from "../domain/workspace";

const entry = (overrides: Partial<Entry>): Entry => ({
  name: "Note.md",
  path: "Notes/Note.md",
  kind: "file",
  modifiedMs: 0,
  ...overrides,
});

const meeting: Entry = entry({
  name: "Meeting Notes.md",
  path: "Work/Meeting Notes.md",
  modifiedMs: 100,
  metadata: { tags: ["work", "meeting"] },
});
const plan: Entry = entry({
  name: "Project Plan.md",
  path: "Work/Project Plan.md",
  modifiedMs: 200,
  metadata: { tags: ["work"] },
});
const readme: Entry = entry({
  name: "Readme.md",
  path: "Docs/Readme.md",
  modifiedMs: 50,
  metadata: { tags: ["docs"] },
});
const workFolder: Entry = { name: "Work", path: "Work", kind: "directory" };
const docsFolder: Entry = { name: "Docs", path: "Docs", kind: "directory" };
const textFile: Entry = entry({ name: "data.txt", path: "Work/data.txt" });
const distributed: Entry = entry({
  name: "Alpha.md",
  path: "Beta/Gamma.md",
  modifiedMs: 300,
  metadata: { tags: [] },
});

const entries = [meeting, plan, readme, workFolder, docsFolder, textFile, distributed];
const contents: Record<string, string> = {
  "Work/Meeting Notes.md": "Discuss the quarterly roadmap",
  "Work/Project Plan.md": "Ship the search feature by Friday",
  "Docs/Readme.md": "Alpha beta gamma delta",
  "Beta/Gamma.md": "Content without matching words",
};

describe("parseSearchQuery", () => {
  it("lowercases plain text and combines multiple words", () => {
    expect(parseSearchQuery("Hello World")).toEqual({ text: "hello world", tag: "", folder: "", type: "" });
  });

  it("parses a tag prefix", () => {
    expect(parseSearchQuery("#Work")).toEqual({ text: "", tag: "work", folder: "", type: "" });
  });

  it("parses scoped filters", () => {
    expect(parseSearchQuery("in:Work")).toEqual({ text: "", tag: "", folder: "work", type: "" });
    expect(parseSearchQuery("type:folder")).toEqual({ text: "", tag: "", folder: "", type: "folder" });
    expect(parseSearchQuery("tag:work")).toEqual({ text: "", tag: "work", folder: "", type: "" });
  });

  it("treats an empty query as empty filters", () => {
    expect(parseSearchQuery("")).toEqual({ text: "", tag: "", folder: "", type: "" });
    expect(parseSearchQuery("   ")).toEqual({ text: "", tag: "", folder: "", type: "" });
  });
});

describe("searchWorkspace", () => {
  it("returns empty results for an empty query", () => {
    expect(searchWorkspace(entries, "")).toEqual({ notes: [], folders: [], tags: [] });
  });

  it("excludes non-markdown files", () => {
    const result = searchWorkspace(entries, "data");
    expect(result.notes.map((n) => n.entry.name)).not.toContain("data.txt");
  });

  it("matches by title with the Title source", () => {
    const result = searchWorkspace(entries, "meeting", contents);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].entry.name).toBe("Meeting Notes.md");
    expect(result.notes[0].source).toBe("Title");
    expect(result.notes[0].score).toBe(100);
  });

  it("matches by path with the Folder source", () => {
    const result = searchWorkspace(entries, "work", contents);
    expect(result.notes.map((n) => n.entry.name).sort()).toEqual(["Meeting Notes.md", "Project Plan.md"]);
    expect(result.notes.every((n) => n.source === "Folder")).toBe(true);
  });

  it("matches by content with the Content source", () => {
    const result = searchWorkspace(entries, "roadmap", contents);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].entry.name).toBe("Meeting Notes.md");
    expect(result.notes[0].source).toBe("Content");
  });

  it("requires all words to match (AND semantics)", () => {
    const result = searchWorkspace(entries, "meeting plan", contents);
    expect(result.notes).toHaveLength(0);
  });

  it("filters notes by a tag", () => {
    const result = searchWorkspace(entries, "#work", contents);
    expect(result.notes.map((n) => n.entry.name).sort()).toEqual(["Meeting Notes.md", "Project Plan.md"]);
    expect(result.notes.every((n) => n.source === "Tag")).toBe(true);
  });

  it("filters notes and folders by an in: scope", () => {
    const result = searchWorkspace(entries, "in:Work", contents);
    expect(result.notes.map((n) => n.entry.name).sort()).toEqual(["Meeting Notes.md", "Project Plan.md"]);
    expect(result.folders.map((f) => f.name)).toEqual(["Work"]);
  });

  it("limits results to folders when type:folder is set", () => {
    const result = searchWorkspace(entries, "type:folder", contents);
    expect(result.notes).toHaveLength(0);
    expect(result.folders.map((f) => f.name)).toEqual(["Work", "Docs"]);
  });

  it("sorts by score then most recently modified", () => {
    const result = searchWorkspace(entries, "work", contents);
    expect(result.notes.map((n) => n.entry.name)).toEqual(["Project Plan.md", "Meeting Notes.md"]);
  });

  it("collects tags matching any query word, sorted by name", () => {
    const result = searchWorkspace(entries, "work docs", contents);
    expect(result.tags.map((t) => ({ name: t.name, count: t.count }))).toEqual([
      { name: "docs", count: 1 },
      { name: "work", count: 2 },
    ]);
  });

  it("counts tags case-insensitively and merges case variants", () => {
    const mixed = [...entries, entry({ name: "C.md", path: "Docs/C.md", metadata: { tags: ["Work"] } })];
    const result = searchWorkspace(mixed, "work docs", contents);
    expect(result.tags.map((t) => ({ name: t.name, count: t.count }))).toEqual([
      { name: "docs", count: 1 },
      { name: "work", count: 3 },
    ]);
  });

  it("produces an excerpt around the matched term", () => {
    const result = searchWorkspace(entries, "roadmap", contents);
    expect(result.notes[0].excerpt).toContain("roadmap");
  });

  it("produces a non-empty excerpt for a pure type filter", () => {
    const result = searchWorkspace(entries, "type:note", contents);
    expect(result.notes).toHaveLength(4);
    expect(result.notes.every((n) => n.excerpt.length > 0)).toBe(true);
    expect(result.notes.every((n) => n.source === "Content")).toBe(true);
  });

  it("produces a non-empty excerpt when words are distributed across title and path", () => {
    const result = searchWorkspace(entries, "alpha beta", contents);
    const distributedMatch = result.notes.find((n) => n.entry.name === "Alpha.md");
    expect(distributedMatch).toBeDefined();
    expect(distributedMatch!.source).toBe("Content");
    expect(distributedMatch!.excerpt.length).toBeGreaterThan(0);
    expect(distributedMatch!.excerpt.toLocaleLowerCase()).toContain("alpha");
    expect(distributedMatch!.excerpt.toLocaleLowerCase()).toContain("beta");
  });
});
