import { describe, expect, it } from "vitest";
import { ancestorPaths, isSameOrDescendant, parentPath, rebasePath } from "./workspacePaths";

describe("rebasePath", () => {
  it("rebases an exact path when a workspace item is renamed or moved", () => {
    expect(rebasePath("notes/today.md", "notes/today.md", "archive/today.md"))
      .toBe("archive/today.md");
  });

  it("rebases descendants while preserving their suffix", () => {
    expect(rebasePath("notes/project/today.md", "notes", "archive"))
      .toBe("archive/project/today.md");
  });

  it("leaves unrelated paths unchanged", () => {
    expect(rebasePath("other/today.md", "notes", "archive")).toBe("other/today.md");
  });

  it("does not rebase similarly prefixed siblings", () => {
    expect(rebasePath("notes-old/today.md", "notes", "archive"))
      .toBe("notes-old/today.md");
  });
});

describe("isSameOrDescendant", () => {
  it("matches the exact removed path and its descendants", () => {
    expect(isSameOrDescendant("notes", "notes")).toBe(true);
    expect(isSameOrDescendant("notes/today.md", "notes")).toBe(true);
  });

  it("does not match unrelated paths or similarly prefixed siblings", () => {
    expect(isSameOrDescendant("other/today.md", "notes")).toBe(false);
    expect(isSameOrDescendant("notes-old/today.md", "notes")).toBe(false);
  });
});

describe("parentPath", () => {
  it("returns the containing folder of a nested item", () => {
    expect(parentPath("notes/today.md")).toBe("notes");
    expect(parentPath("notes/deep/today.md")).toBe("notes/deep");
  });

  it("returns an empty parent for root-level items", () => {
    expect(parentPath("today.md")).toBe("");
    expect(parentPath("")).toBe("");
  });
});

describe("ancestorPaths", () => {
  it("returns ancestor folders from root to immediate parent, excluding the leaf", () => {
    expect(ancestorPaths("notes/deep/today.md")).toEqual(["notes", "notes/deep"]);
    expect(ancestorPaths("a/b/c/d.md")).toEqual(["a", "a/b", "a/b/c"]);
  });

  it("includes the leaf path when includeLeaf is true", () => {
    expect(ancestorPaths("notes/today.md", true)).toEqual(["notes", "notes/today.md"]);
    expect(ancestorPaths("a/b/c.md", true)).toEqual(["a", "a/b", "a/b/c.md"]);
  });

  it("returns an empty array for root-level items with no ancestors", () => {
    expect(ancestorPaths("today.md")).toEqual([]);
    expect(ancestorPaths("")).toEqual([]);
  });

  it("returns just the leaf for a root-level item when includeLeaf is true", () => {
    expect(ancestorPaths("today.md", true)).toEqual(["today.md"]);
  });
});
