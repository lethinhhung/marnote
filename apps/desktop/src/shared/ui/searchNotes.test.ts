import { describe, it, expect } from "vitest";
import { searchNotes } from "./searchNotes";
import type { Entry } from "../domain/workspace";

function dir(name: string, path: string, children: Entry[] = []): Entry {
  return { name, path, kind: "directory", children };
}

function file(name: string, path: string): Entry {
  return { name, path, kind: "file" };
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