import { describe, expect, it } from "vitest";
import type { Entry } from "../../../shared/domain/workspace";
import { relativeWorkspaceLink, resolveWorkspaceLink } from "./workspaceLinks";

const file = (path: string): Entry => ({ name: path.split("/").pop() ?? path, path, kind: "file" });
const directory = (path: string): Entry => ({ name: path.split("/").pop() ?? path, path, kind: "directory" });

describe("relativeWorkspaceLink", () => {
  it("links to a file in the same directory", () => {
    expect(relativeWorkspaceLink("notes/a.md", file("notes/b.md"))).toBe("b.md");
  });

  it("links to a file in a nested directory", () => {
    expect(relativeWorkspaceLink("notes/a.md", file("notes/sub/deep.md"))).toBe("sub/deep.md");
  });

  it("links to a file in a parent directory", () => {
    expect(relativeWorkspaceLink("notes/sub/a.md", file("notes/b.md"))).toBe("../b.md");
  });

  it("links to a sibling directory with a trailing slash", () => {
    expect(relativeWorkspaceLink("notes/a.md", directory("notes/sub"))).toBe("sub/");
  });

  it("links across top-level directories", () => {
    expect(relativeWorkspaceLink("a/x.md", file("b/y.md"))).toBe("../b/y.md");
  });

  it("percent-encodes segment names with spaces", () => {
    expect(relativeWorkspaceLink("a.md", file("my note.md"))).toBe("my%20note.md");
  });
});

describe("resolveWorkspaceLink", () => {
  it("resolves a relative file link from the source folder", () => {
    expect(resolveWorkspaceLink("notes/a.md", "b.md")).toEqual({ path: "notes/b.md", kind: "file" });
  });

  it("resolves parent directory references", () => {
    expect(resolveWorkspaceLink("notes/a.md", "../b.md")).toEqual({ path: "b.md", kind: "file" });
  });

  it("resolves a directory link with a trailing slash", () => {
    expect(resolveWorkspaceLink("notes/a.md", "sub/")).toEqual({ path: "notes/sub", kind: "directory" });
  });

  it("strips query parameters and fragments", () => {
    expect(resolveWorkspaceLink("notes/a.md", "b.md?query=1#section")).toEqual({ path: "notes/b.md", kind: "file" });
  });

  it("decodes percent-encoded targets", () => {
    expect(resolveWorkspaceLink("notes/a.md", "my%20note.md")).toEqual({ path: "notes/my note.md", kind: "file" });
  });

  it("treats an absolute path as workspace-rooted", () => {
    expect(resolveWorkspaceLink("notes/a.md", "/absolute.md")).toEqual({ path: "absolute.md", kind: "file" });
  });

  it("rejects external URLs", () => {
    expect(resolveWorkspaceLink("notes/a.md", "https://example.com")).toBeNull();
  });

  it("rejects fragment-only links", () => {
    expect(resolveWorkspaceLink("notes/a.md", "#section")).toBeNull();
  });

  it("rejects empty targets", () => {
    expect(resolveWorkspaceLink("notes/a.md", "")).toBeNull();
  });

  it("rejects traversal that escapes the workspace", () => {
    expect(resolveWorkspaceLink("notes/a.md", "../../escape.md")).toBeNull();
  });
});
