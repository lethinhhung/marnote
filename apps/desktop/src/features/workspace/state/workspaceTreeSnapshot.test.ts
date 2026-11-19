import { describe, expect, it } from "vitest";
import { sameWorkspaceTree } from "./workspaceTreeSnapshot";
import type { Entry, WorkspaceTree } from "../workspaceTypes";

const file = (path: string, overrides: Partial<Entry> = {}): Entry => ({
  name: path.split("/").at(-1) ?? path,
  path,
  kind: "file",
  ...overrides,
});

const tree = (overrides: Partial<WorkspaceTree> = {}): WorkspaceTree => ({
  name: "workspace",
  path: "",
  entries: [],
  ...overrides,
});

describe("sameWorkspaceTree", () => {
  it("returns true for identical trees", () => {
    const a = tree({ entries: [file("notes/a.md")] });
    expect(sameWorkspaceTree(a, a)).toBe(true);
    expect(sameWorkspaceTree(tree({ entries: [file("notes/a.md")] }), tree({ entries: [file("notes/a.md")] }))).toBe(true);
  });

  it("returns true when object keys differ only in order", () => {
    const a = tree({ tags: { work: "#74856b", personal: "#ff0000" } });
    const b = tree({ tags: { personal: "#ff0000", work: "#74856b" } });
    expect(sameWorkspaceTree(a, b)).toBe(true);
  });

  it("returns false when entries differ", () => {
    expect(sameWorkspaceTree(tree({ entries: [file("notes/a.md")] }), tree({ entries: [file("notes/b.md")] }))).toBe(false);
  });

  it("returns false when entry order differs", () => {
    const a = tree({ entries: [file("notes/a.md"), file("notes/b.md")] });
    const b = tree({ entries: [file("notes/b.md"), file("notes/a.md")] });
    expect(sameWorkspaceTree(a, b)).toBe(false);
  });

  it("returns false when a nested entry property changes", () => {
    const a = tree({ entries: [file("notes/a.md", { modifiedMs: 100 })] });
    const b = tree({ entries: [file("notes/a.md", { modifiedMs: 200 })] });
    expect(sameWorkspaceTree(a, b)).toBe(false);
  });

  it("returns false when entry count differs", () => {
    expect(sameWorkspaceTree(tree({ entries: [file("notes/a.md")] }), tree({ entries: [] }))).toBe(false);
  });

  it("returns false when tags differ", () => {
    expect(sameWorkspaceTree(tree({ tags: { work: "#74856b" } }), tree({ tags: {} }))).toBe(false);
  });

  it("returns false when manualOrder differs", () => {
    expect(sameWorkspaceTree(tree({ manualOrder: { "": ["notes/a.md"] } }), tree({ manualOrder: {} }))).toBe(false);
  });
});
