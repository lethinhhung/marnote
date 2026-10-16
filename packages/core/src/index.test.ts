import { describe, expect, it } from "vitest";
import { buildWorkspaceTree, extractNoteLinks, getWelcomeMessage, isDocumentationPath, normalizeWorkspacePath, resolveNoteLink } from "./index";

describe("getWelcomeMessage", () => {
  it("returns a short introduction to Marnote", () => {
    expect(getWelcomeMessage()).toContain("notes");
  });
});

describe("workspace paths and tree", () => {
  it("normalizes separators and blocks escaping paths", () => {
    expect(normalizeWorkspacePath("notes\\deep/../hello.md")).toBe("notes/hello.md");
    expect(normalizeWorkspacePath("../../secret.md")).toBeNull();
    expect(normalizeWorkspacePath("/absolute.md")).toBeNull();
  });

  it("builds sorted nested directories and recognizes documentation", () => {
    const tree = buildWorkspaceTree([{ path: "z.md" }, { path: "docs/guide.txt" }, { path: "a/child.md" }]);
    expect(tree.map((node) => node.name)).toEqual(["a", "docs", "z.md"]);
    expect(tree[1]?.children[0]?.path).toBe("docs/guide.txt");
    expect(isDocumentationPath("specs/core.txt")).toBe(true);
    expect(isDocumentationPath("src/main.ts")).toBe(false);
  });
});

describe("portable note links", () => {
  it("resolves relative markdown links and rejects unsafe destinations", () => {
    expect(resolveNoteLink("docs/start.md", "../ideas/next#part")).toBe("ideas/next.md");
    expect(resolveNoteLink("start.md", "https://example.com")).toBeNull();
    expect(resolveNoteLink("start.md", "../../outside")).toBeNull();
  });

  it("extracts unique local note links", () => {
    expect(extractNoteLinks("[one](other) [two](other.md) [web](https://example.com)", "start.md"))
      .toEqual(["other.md"]);
  });
});
