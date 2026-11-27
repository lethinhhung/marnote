import { describe, expect, it } from "vitest";
import { flattenEntries, isMarkdown, type Entry, updateSavedEntry } from "./workspace";

describe("isMarkdown", () => {
  it("returns true for Markdown file entries regardless of case", () => {
    expect(isMarkdown({ kind: "file", name: "note.md", path: "note.md" })).toBe(true);
    expect(isMarkdown({ kind: "file", name: "README.MD", path: "docs/README.MD" })).toBe(true);
    expect(isMarkdown({ kind: "file", name: "note.Md", path: "folder/note.Md" })).toBe(true);
  });

  it("returns false for non-Markdown files and directories", () => {
    expect(isMarkdown({ kind: "file", name: "note.txt", path: "note.txt" })).toBe(false);
    expect(isMarkdown({ kind: "file", name: "image.png", path: "image.png" })).toBe(false);
    expect(isMarkdown({ kind: "directory", name: "notes", path: "notes" })).toBe(false);
  });
});

describe("flattenEntries", () => {
  it("returns entries in depth-first tree order", () => {
    const entries: Entry[] = [
      { name: "a.md", path: "a.md", kind: "file" },
      {
        name: "docs",
        path: "docs",
        kind: "directory",
        children: [
          { name: "guide.md", path: "docs/guide.md", kind: "file" },
          {
            name: "sub",
            path: "docs/sub",
            kind: "directory",
            children: [{ name: "deep.md", path: "docs/sub/deep.md", kind: "file" }],
          },
        ],
      },
      { name: "z.md", path: "z.md", kind: "file" },
    ];
    expect(flattenEntries(entries).map((entry) => entry.path)).toEqual([
      "a.md",
      "docs",
      "docs/guide.md",
      "docs/sub",
      "docs/sub/deep.md",
      "z.md",
    ]);
  });

  it("returns an empty array for no input", () => {
    expect(flattenEntries()).toEqual([]);
    expect(flattenEntries([])).toEqual([]);
  });
});

describe("updateSavedEntry", () => {
  it("updates the sort timestamp and metadata after saving", () => {
    const entries: Entry[] = [{ name: "note.md", path: "note.md", kind: "file", modifiedMs: 10 }];
    const updated = updateSavedEntry(entries, "note.md", false, 2000);

    expect(updated[0]?.modifiedMs).toBe(2000);
    expect(updated[0]?.metadata?.createdMs).toBe(2000);
    expect(updated[0]?.metadata?.updatedMs).toBe(2000);
  });
});
