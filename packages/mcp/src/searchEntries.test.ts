import { describe, expect, it } from "vitest";
import { collectSearchableEntries } from "./searchEntries.js";
import { WorkspaceEntry } from "./workspace.js";

function file(name: string, path: string): WorkspaceEntry {
  return { name, path, kind: "file" };
}

function dir(name: string, path: string, children: WorkspaceEntry[] = []): WorkspaceEntry {
  return { name, path, kind: "directory", children };
}

describe("collectSearchableEntries", () => {
  it("returns an empty array for empty input", () => {
    expect(collectSearchableEntries([], undefined, undefined)).toEqual([]);
  });

  it("includes only markdown files and lowercases title and path", () => {
    const tree = [
      file("ReadMe.MD", "Notes/ReadMe.MD"),
      file("script.ts", "Notes/script.ts"),
      dir("Notes", "Notes", [file("Nested.md", "Notes/Nested.md")]),
    ];
    const results = collectSearchableEntries(tree, undefined, undefined);
    expect(results.map((r) => r.path)).toEqual(["notes/readme.md", "notes/nested.md"]);
    expect(results.map((r) => r.title)).toEqual(["readme", "nested"]);
  });

  it("builds searchableText from title, path, tags, and content", () => {
    const tree = [file("Note.md", "Notes/Note.md")];
    const tags = new Map([["Notes/Note.md", ["work", "meeting"]]]);
    const contents = new Map([["Notes/Note.md", "# Hello World"]]);
    const results = collectSearchableEntries(tree, tags, contents);

    expect(results[0].tagText).toBe("work meeting");
    expect(results[0].content).toBe("# Hello World");
    expect(results[0].normalizedContent).toBe("# hello world");
    expect(results[0].searchableText).toContain("note");
    expect(results[0].searchableText).toContain("notes/note.md");
    expect(results[0].searchableText).toContain("work meeting");
    expect(results[0].searchableText).toContain("# hello world");
  });

  it("uses empty strings when tags or contents are not provided", () => {
    const tree = [file("Note.md", "Notes/Note.md")];
    const results = collectSearchableEntries(tree, undefined, undefined);

    expect(results[0].tagText).toBe("");
    expect(results[0].content).toBe("");
    expect(results[0].normalizedContent).toBe("");
    expect(results[0].searchableText).toContain("note");
    expect(results[0].searchableText).toContain("notes/note.md");
  });

  it("preserves the entry reference", () => {
    const entry = file("Note.md", "Notes/Note.md");
    const results = collectSearchableEntries([entry], undefined, undefined);
    expect(results[0].entry).toBe(entry);
  });

  it("collects markdown files from nested directories recursively", () => {
    const tree = [
      dir("Projects", "Projects", [
        file("Alpha.md", "Projects/Alpha.md"),
        dir("Deep", "Projects/Deep", [file("Nested.md", "Projects/Deep/Nested.md")]),
      ]),
    ];
    const results = collectSearchableEntries(tree, undefined, undefined);
    expect(results.map((r) => r.path).sort()).toEqual([
      "projects/alpha.md",
      "projects/deep/nested.md",
    ]);
  });
});
