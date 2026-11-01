import { describe, expect, it } from "vitest";
import { resolve } from "path";
import { validateWorkspaceRelativePath, WorkspaceError } from "./workspace.js";

describe("validateWorkspaceRelativePath", () => {
  const root = "/workspace";

  it("accepts valid relative paths", () => {
    expect(validateWorkspaceRelativePath(root, "note.md")).toBe(resolve(root, "note.md"));
    expect(validateWorkspaceRelativePath(root, "folder/note.md")).toBe(
      resolve(root, "folder/note.md")
    );
    expect(validateWorkspaceRelativePath(root, "deep/nested/folder/file.md")).toBe(
      resolve(root, "deep/nested/folder/file.md")
    );
  });

  it("rejects empty path", () => {
    expect(() => validateWorkspaceRelativePath(root, "")).toThrow(WorkspaceError);
    expect(() => validateWorkspaceRelativePath(root, "   ")).toThrow(WorkspaceError);
  });

  it("rejects absolute paths", () => {
    expect(() => validateWorkspaceRelativePath(root, "/absolute/path.md")).toThrow(WorkspaceError);
    expect(() => validateWorkspaceRelativePath(root, "C:\\absolute\\path.md")).toThrow(
      WorkspaceError
    );
  });

  it("rejects traversal attempts", () => {
    expect(() => validateWorkspaceRelativePath(root, "../escape.md")).toThrow(WorkspaceError);
    expect(() => validateWorkspaceRelativePath(root, "folder/../../escape.md")).toThrow(
      WorkspaceError
    );
    expect(() => validateWorkspaceRelativePath(root, "./note.md")).toThrow(WorkspaceError);
  });

  it("rejects empty segments", () => {
    expect(() => validateWorkspaceRelativePath(root, "folder//note.md")).toThrow(WorkspaceError);
    expect(() => validateWorkspaceRelativePath(root, "/note.md")).toThrow(WorkspaceError);
  });

  it("ensures resolved path stays within workspace root", () => {
    expect(() => validateWorkspaceRelativePath(root, "folder/../../../etc/passwd")).toThrow(
      WorkspaceError
    );
  });
});