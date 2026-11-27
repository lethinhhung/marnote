import { describe, expect, it } from "vitest";
import { buildWorkspaceTree, type WorkspaceFile } from "./workspace";

describe("buildWorkspaceTree", () => {
  it("builds a flat list of files", () => {
    const files: WorkspaceFile[] = [{ path: "a.md" }, { path: "b.md" }, { path: "c.txt" }];
    const tree = buildWorkspaceTree(files);
    expect(tree.map((n) => n.name)).toEqual(["a.md", "b.md", "c.txt"]);
  });

  it("sorts directories before files, then alphabetically", () => {
    const files: WorkspaceFile[] = [
      { path: "z.md" },
      { path: "docs/guide.txt" },
      { path: "a/child.md" },
    ];
    const tree = buildWorkspaceTree(files);
    expect(tree.map((n) => n.name)).toEqual(["a", "docs", "z.md"]);
  });

  it("sorts case-insensitively then lowercase before uppercase", () => {
    const files: WorkspaceFile[] = [
      { path: "a.md" },
      { path: "B.md" },
      { path: "A.md" },
      { path: "b.md" },
    ];
    const tree = buildWorkspaceTree(files);
    expect(tree.map((n) => n.name)).toEqual(["a.md", "A.md", "b.md", "B.md"]);
  });

  it("creates implicit parent directories", () => {
    const files: WorkspaceFile[] = [{ path: "deep/nested/file.md" }];
    const tree = buildWorkspaceTree(files);
    expect(tree[0]?.name).toBe("deep");
    expect(tree[0]?.kind).toBe("directory");
    expect(tree[0]?.children[0]?.name).toBe("nested");
    expect(tree[0]?.children[0]?.children[0]?.name).toBe("file.md");
  });

  it("merges children under shared parent directories", () => {
    const files: WorkspaceFile[] = [
      { path: "folder/a.md" },
      { path: "folder/b.md" },
      { path: "folder/sub/c.txt" },
    ];
    const tree = buildWorkspaceTree(files);
    const folder = tree.find((n) => n.name === "folder");
    expect(folder?.children.map((n) => n.name).sort()).toEqual(["a.md", "b.md", "sub"]);
    expect(folder?.children.find((n) => n.name === "sub")?.children[0]?.name).toBe("c.txt");
  });

  it("respects explicit directory kind", () => {
    const files: WorkspaceFile[] = [
      { path: "notes", kind: "directory" },
      { path: "notes/page.md" },
    ];
    const tree = buildWorkspaceTree(files);
    const notes = tree.find((n) => n.name === "notes");
    expect(notes?.kind).toBe("directory");
    expect(notes?.children[0]?.name).toBe("page.md");
  });

  it("upgrades file to directory when both file and children exist", () => {
    const files: WorkspaceFile[] = [
      { path: "folder", kind: "file" },
      { path: "folder/nested.md" },
    ];
    const tree = buildWorkspaceTree(files);
    const folder = tree.find((n) => n.name === "folder");
    expect(folder?.kind).toBe("directory");
  });

  it("handles empty input", () => {
    expect(buildWorkspaceTree([])).toEqual([]);
  });

  it("skips invalid paths that normalize to null", () => {
    const files: WorkspaceFile[] = [
      { path: "valid.md" },
      { path: "../invalid.md" },
      { path: "/absolute.md" },
    ];
    const tree = buildWorkspaceTree(files);
    expect(tree.map((n) => n.name)).toEqual(["valid.md"]);
  });

  it("includes path property on each node", () => {
    const files: WorkspaceFile[] = [{ path: "a/b.md" }];
    const tree = buildWorkspaceTree(files);
    expect(tree[0]?.path).toBe("a");
    expect(tree[0]?.children[0]?.path).toBe("a/b.md");
  });

  it("handles files at root and nested levels together", () => {
    const files: WorkspaceFile[] = [
      { path: "root.md" },
      { path: "dir/nested.md" },
      { path: "dir/sub/deep.md" },
    ];
    const tree = buildWorkspaceTree(files);
    expect(tree.map((n) => n.name).sort()).toEqual(["dir", "root.md"]);
    expect(tree.find((n) => n.name === "dir")?.children.map((n) => n.name).sort()).toEqual([
      "nested.md",
      "sub",
    ]);
  });
});
