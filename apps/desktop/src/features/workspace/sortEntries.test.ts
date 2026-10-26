import { describe, expect, it } from "vitest";
import { reorderedPaths, siblingPaths, sortEntries } from "./sortEntries";
import type { Entry } from "./workspaceTypes";

const file = (name: string, path = name, modifiedMs?: number): Entry => ({
  name, path, kind: "file", modifiedMs,
});
const folder = (name: string, path = name, children: Entry[] = []): Entry => ({
  name, path, kind: "directory", children,
});

describe("siblingPaths", () => {
  const entries = [folder("docs", "docs", [file("a.md", "docs/a.md"), folder("nested", "docs/nested", [file("b.md", "docs/nested/b.md")])]), file("root.md")];

  it("returns root siblings", () => {
    expect(siblingPaths(entries, "")).toEqual(["docs", "root.md"]);
  });

  it("returns siblings inside root and nested folders", () => {
    expect(siblingPaths(entries, "docs")).toEqual(["docs/a.md", "docs/nested"]);
    expect(siblingPaths(entries, "docs/nested")).toEqual(["docs/nested/b.md"]);
    expect(siblingPaths(entries, "missing")).toEqual([]);
  });
});

describe("reorderedPaths", () => {
  it("places the source before or after the target", () => {
    expect(reorderedPaths(["a", "b", "c"], "a", "c", false)).toEqual(["b", "a", "c"]);
    expect(reorderedPaths(["a", "b", "c"], "a", "b", true)).toEqual(["b", "a", "c"]);
  });
});

describe("sortEntries", () => {
  it("sorts folders before files by case-insensitive name", () => {
    const entries = [file("z.md"), folder("b"), file("A.md"), folder("a")];
    expect(sortEntries(entries, "name", {}).map(entry => entry.path)).toEqual(["a", "b", "A.md", "z.md"]);
  });

  it("sorts modified entries newest first and treats missing times as zero", () => {
    const entries = [file("old.md", "old.md", 1), file("unknown.md"), file("new.md", "new.md", 9)];
    expect(sortEntries(entries, "modified", {}).map(entry => entry.path)).toEqual(["new.md", "old.md", "unknown.md"]);
  });

  it("sorts children recursively using each folder's manual order", () => {
    const entries = [folder("parent", "parent", [file("a.md", "parent/a.md"), file("b.md", "parent/b.md")])];
    const sorted = sortEntries(entries, "manual", { parent: ["parent/b.md", "parent/a.md"] });
    expect(sorted[0].children?.map(entry => entry.path)).toEqual(["parent/b.md", "parent/a.md"]);
  });

  it("keeps listed paths first and name-sorts missing paths in manual mode", () => {
    const entries = [file("z.md"), file("c.md"), file("b.md"), file("a.md")];
    expect(sortEntries(entries, "manual", { "": ["c.md", "missing"] }).map(entry => entry.path))
      .toEqual(["c.md", "a.md", "b.md", "z.md"]);
    expect(sortEntries(entries, "manual", {}).map(entry => entry.path))
      .toEqual(["a.md", "b.md", "c.md", "z.md"]);
  });
});
