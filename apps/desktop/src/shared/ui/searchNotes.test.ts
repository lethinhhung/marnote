import { describe, it, expect } from "vitest";
import { searchNotes, searchWorkspace } from "./searchNotes";
import type { Entry } from "../domain/workspace";

function dir(name: string, path: string, children: Entry[] = []): Entry {
  return { name, path, kind: "directory", children };
}

function file(name: string, path: string): Entry {
  return { name, path, kind: "file" };
}

function taggedFile(name: string, path: string, tags: string[]): Entry {
  return { name, path, kind: "file", metadata: { tags } };
}

describe("searchNotes", () => {
  const tree: Entry[] = [
    dir("Notes", "Notes", [
      file("Readme.md", "Notes/Readme.md"),
      file("TODO.md", "Notes/TODO.md"),
      dir("Projects", "Notes/Projects", [
        file("Alpha.md", "Notes/Projects/Alpha.md"),
        file("Beta.txt", "Notes/Projects/Beta.txt"),
        dir("Deep", "Notes/Projects/Deep", [
          file("Nested.md", "Notes/Projects/Deep/Nested.md"),
        ]),
      ]),
    ]),
    file("Config.json", "Config.json"),
  ];

  it("returns empty array for undefined entries", () => {
    expect(searchNotes(undefined, "test")).toEqual([]);
  });

  it("returns empty array for empty query", () => {
    expect(searchNotes(tree, "")).toEqual([]);
    expect(searchNotes(tree, "   ")).toEqual([]);
  });

  it("filters recursively through directories", () => {
    const results = searchNotes(tree, "Alpha");
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe("Notes/Projects/Alpha.md");
  });

  it("matches case-insensitively against name", () => {
    const results = searchNotes(tree, "readme");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Readme.md");
  });

  it("matches case-insensitively against path", () => {
    const results = searchNotes(tree, "projects");
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.path)).toEqual([
      "Notes/Projects/Alpha.md",
      "Notes/Projects/Deep/Nested.md",
    ]);
  });

  it("excludes non-markdown files", () => {
    const results = searchNotes(tree, "Beta");
    expect(results).toHaveLength(0);
    const results2 = searchNotes(tree, "Config");
    expect(results2).toHaveLength(0);
  });

  it("limits results to maximum of eight", () => {
    const manyFiles: Entry[] = [
      dir("Notes", "Notes", Array.from({ length: 10 }, (_, i) => file(`Note${i}.md`, `Notes/Note${i}.md`))),
    ];
    const results = searchNotes(manyFiles, "Note");
    expect(results).toHaveLength(8);
  });

  it("returns all matches when fewer than eight", () => {
    const results = searchNotes(tree, "md");
    expect(results.length).toBeLessThanOrEqual(8);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => expect(r.path.toLowerCase()).toContain(".md"));
  });

  it("matches partial strings in name and path", () => {
    const results = searchNotes(tree, "Nested");
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe("Notes/Projects/Deep/Nested.md");
  });
});

describe("searchWorkspace", () => {
  const taggedTree: Entry[] = [
    dir("Notes", "Notes", [
      taggedFile("Work.md", "Notes/Work.md", ["work", "meeting"]),
      taggedFile("Personal.md", "Notes/Personal.md", ["personal"]),
      file("Readme.md", "Notes/Readme.md"),
    ]),
  ];

  it("labels filter-only tag matches as Tag with score 50, not Title with score 100", () => {
    const results = searchWorkspace(taggedTree, "tag:work", {});
    expect(results.notes).toHaveLength(1);
    expect(results.notes[0].entry.path).toBe("Notes/Work.md");
    expect(results.notes[0].source).toBe("Tag");
    expect(results.notes[0].score).toBe(50);
  });

  it("excludes notes that do not match the tag filter", () => {
    const results = searchWorkspace(taggedTree, "tag:work", {});
    expect(results.notes.map((n) => n.entry.path)).not.toContain("Notes/Personal.md");
    expect(results.tags).toHaveLength(1);
    expect(results.tags[0].name).toBe("work");
  });

  it("returns no notes when the tag filter matches nothing", () => {
    const results = searchWorkspace(taggedTree, "tag:nonexistent", {});
    expect(results.notes).toHaveLength(0);
  });

  it("labels folder-scoped matches as Folder", () => {
    const results = searchWorkspace(taggedTree, "in:Notes", {});
    expect(results.notes.map((n) => n.source).every((source) => source === "Folder")).toBe(true);
  });

  it("collects tags matching any search word for multi-word queries", () => {
    const results = searchWorkspace(taggedTree, "work personal", {});
    expect(results.tags.map((t) => t.name)).toEqual(["personal", "work"]);
  });
});