import { describe, expect, it } from "vitest";
import { buildWorkspaceTree, isDocumentationPath, normalizeWorkspacePath, type WorkspaceFile } from "./workspace";

describe("normalizeWorkspacePath", () => {
  it("normalizes backslashes to forward slashes", () => {
    expect(normalizeWorkspacePath("folder\\file.md")).toBe("folder/file.md");
    expect(normalizeWorkspacePath("a\\b\\c.txt")).toBe("a/b/c.txt");
  });

  it("collapses dot segments", () => {
    expect(normalizeWorkspacePath("folder/./file.md")).toBe("folder/file.md");
    expect(normalizeWorkspacePath("./file.md")).toBe("file.md");
  });

  it("resolves parent directory references", () => {
    expect(normalizeWorkspacePath("folder/sub/../file.md")).toBe("folder/file.md");
    expect(normalizeWorkspacePath("a/b/../../c.txt")).toBe("c.txt");
  });

  it("rejects paths that escape the workspace root", () => {
    expect(normalizeWorkspacePath("../escape.md")).toBeNull();
    expect(normalizeWorkspacePath("folder/../../escape.md")).toBeNull();
    expect(normalizeWorkspacePath("..")).toBeNull();
  });

  it("rejects absolute paths", () => {
    expect(normalizeWorkspacePath("/absolute.md")).toBeNull();
    expect(normalizeWorkspacePath("C:/windows/path.md")).toBeNull();
    expect(normalizeWorkspacePath("D:\\windows\\path.md")).toBeNull();
  });

  it("handles empty and root-relative inputs", () => {
    expect(normalizeWorkspacePath("")).toBe("");
    expect(normalizeWorkspacePath(".")).toBe("");
    expect(normalizeWorkspacePath("./")).toBe("");
  });

  it("handles multiple consecutive slashes", () => {
    expect(normalizeWorkspacePath("folder//file.md")).toBe("folder/file.md");
    expect(normalizeWorkspacePath("a///b")).toBe("a/b");
  });

  it("preserves valid relative paths", () => {
    expect(normalizeWorkspacePath("notes/hello.md")).toBe("notes/hello.md");
    expect(normalizeWorkspacePath("deep/nested/folder/file.txt")).toBe("deep/nested/folder/file.txt");
  });

  it("handles paths ending with slash", () => {
    expect(normalizeWorkspacePath("folder/")).toBe("folder");
    expect(normalizeWorkspacePath("a/b/")).toBe("a/b");
  });
});

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

describe("isDocumentationPath", () => {
  it("returns true for markdown files", () => {
    expect(isDocumentationPath("note.md")).toBe(true);
    expect(isDocumentationPath("folder/readme.md")).toBe(true);
    expect(isDocumentationPath("docs/guide.md")).toBe(true);
  });

  it("returns true for files under docs/ directory", () => {
    expect(isDocumentationPath("docs/anything.txt")).toBe(true);
    expect(isDocumentationPath("docs/nested/file.pdf")).toBe(true);
    expect(isDocumentationPath("docs")).toBe(false);
  });

  it("returns true for files under specs/ directory", () => {
    expect(isDocumentationPath("specs/requirements.txt")).toBe(true);
    expect(isDocumentationPath("specs/api/schema.json")).toBe(true);
  });

  it("returns false for non-markdown files outside docs/specs", () => {
    expect(isDocumentationPath("src/main.ts")).toBe(false);
    expect(isDocumentationPath("lib/utils.js")).toBe(false);
    expect(isDocumentationPath("config.json")).toBe(false);
  });

  it("returns false for escaped or invalid paths", () => {
    expect(isDocumentationPath("../secret.md")).toBe(false);
    expect(isDocumentationPath("/absolute.md")).toBe(false);
    expect(isDocumentationPath("C:/windows.md")).toBe(false);
  });

  it("handles case insensitivity for docs/specs folders", () => {
    expect(isDocumentationPath("DOCS/readme.txt")).toBe(true);
    expect(isDocumentationPath("Specs/readme.txt")).toBe(true);
    expect(isDocumentationPath("Docs/Specs/file.txt")).toBe(true);
  });

  it("handles case insensitivity for markdown extension", () => {
    expect(isDocumentationPath("note.MD")).toBe(true);
    expect(isDocumentationPath("note.Md")).toBe(true);
  });

  it("returns false for empty or root paths", () => {
    expect(isDocumentationPath("")).toBe(false);
    expect(isDocumentationPath(".")).toBe(false);
  });

  it("normalizes path separators before checking", () => {
    expect(isDocumentationPath("docs\\guide.txt")).toBe(true);
    expect(isDocumentationPath("specs\\api\\schema.json")).toBe(true);
    expect(isDocumentationPath("folder\\note.md")).toBe(true);
  });
});