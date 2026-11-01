import { describe, it, expect } from "vitest";
import { searchWorkspace } from "./searchMatching.js";
import { WorkspaceEntry } from "./workspace.js";

function dir(name: string, path: string, children: WorkspaceEntry[] = []): WorkspaceEntry {
  return { name, path, kind: "directory", children };
}

function file(name: string, path: string): WorkspaceEntry {
  return { name, path, kind: "file" };
}

const sampleTree: WorkspaceEntry[] = [
  dir("Notes", "Notes", [
    file("Readme.md", "Notes/Readme.md"),
    file("TODO.md", "Notes/TODO.md"),
    dir("Projects", "Notes/Projects", [
      file("Alpha.md", "Notes/Projects/Alpha.md"),
      file("Beta.md", "Notes/Projects/Beta.md"),
      dir("Deep", "Notes/Projects/Deep", [
        file("Nested.md", "Notes/Projects/Deep/Nested.md"),
      ]),
    ]),
  ]),
  file("Config.json", "Config.json"),
];

describe("searchWorkspace - recursive directory traversal", () => {
  it("searches nested directories", () => {
    const results = searchWorkspace(sampleTree, "nested");
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe("Notes/Projects/Deep/Nested.md");
  });

  it("collects tags from nested entries", () => {
    const nestedTree: WorkspaceEntry[] = [
      dir("Notes", "Notes", [
        dir("Projects", "Notes/Projects", [
          file("Alpha.md", "Notes/Projects/Alpha.md"),
        ]),
      ]),
    ];
    const tags = new Map([["Notes/Projects/Alpha.md", ["nested-tag"]]]);
    const results = searchWorkspace(nestedTree, "nested-tag", { tags });
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe("Notes/Projects/Alpha.md");
  });
});

describe("searchWorkspace - edge cases", () => {
  it("handles markdown files with uppercase extension", () => {
    const tree = [file("README.MD", "README.MD"), file("Note.Md", "Note.Md")];
    const results = searchWorkspace(tree, "readme");
    expect(results).toHaveLength(1);
  });

  it("excludes non-markdown files", () => {
    const tree = [
      dir("Notes", "Notes", [
        file("script.rs", "Notes/script.rs"),
        file("data.json", "Notes/data.json"),
        file("note.md", "Notes/note.md"),
      ]),
    ];
    const results = searchWorkspace(tree, "script");
    expect(results).toHaveLength(0);

    const results2 = searchWorkspace(tree, "note");
    expect(results2).toHaveLength(1);
    expect(results2[0].path).toBe("Notes/note.md");
  });

  it("handles entries with no tags or contents maps", () => {
    const results = searchWorkspace(sampleTree, "readme");
    expect(results).toHaveLength(1);
  });

  it("handles empty tags and contents maps", () => {
    const results = searchWorkspace(sampleTree, "readme", { tags: new Map(), contents: new Map() });
    expect(results).toHaveLength(1);
  });

  it("clamps limit to at least 1", () => {
    const results = searchWorkspace(sampleTree, "Readme", { limit: 0 });
    expect(results).toHaveLength(1);
  });

  it("returns empty array for no matches", () => {
    const results = searchWorkspace(sampleTree, "nonexistent");
    expect(results).toEqual([]);
  });
});