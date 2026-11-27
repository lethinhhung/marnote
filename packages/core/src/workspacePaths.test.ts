import { describe, expect, it } from "vitest";
import { isDocumentationPath, normalizeWorkspacePath } from "./workspace";

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
