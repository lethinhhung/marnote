import { describe, expect, it } from "vitest";
import { extractNoteLinks, isExternalUrl, normalizeLinkUrl, relativeWorkspaceLink, resolveNoteLink, resolveWorkspaceLink } from "./links";

describe("resolveNoteLink", () => {
  it("resolves simple relative links", () => {
    expect(resolveNoteLink("docs/start.md", "other.md")).toBe("docs/other.md");
    expect(resolveNoteLink("docs/start.md", "./other.md")).toBe("docs/other.md");
  });

  it("resolves parent directory references", () => {
    expect(resolveNoteLink("docs/guide/start.md", "../other.md")).toBe("docs/other.md");
    expect(resolveNoteLink("docs/guide/start.md", "../../other.md")).toBe("other.md");
  });

  it("resolves links to notes in sibling directories", () => {
    expect(resolveNoteLink("docs/guide/start.md", "../api/reference.md")).toBe("docs/api/reference.md");
    expect(resolveNoteLink("a/b/c.md", "../d/e.md")).toBe("a/d/e.md");
    expect(resolveNoteLink("docs/guide/start.md", "../api/reference")).toBe("docs/api/reference.md");
  });

  it("strips query parameters and fragments", () => {
    expect(resolveNoteLink("start.md", "other.md?query=1")).toBe("other.md");
    expect(resolveNoteLink("start.md", "other.md#section")).toBe("other.md");
    expect(resolveNoteLink("start.md", "other.md?query=1#section")).toBe("other.md");
  });

  it("decodes URL-encoded paths", () => {
    expect(resolveNoteLink("start.md", "path%20with%20spaces.md")).toBe("path with spaces.md");
    expect(resolveNoteLink("start.md", "path%2Fwith%2Fslashes.md")).toBe("path/with/slashes.md");
  });

  it("rejects external URLs", () => {
    expect(resolveNoteLink("start.md", "https://example.com")).toBeNull();
    expect(resolveNoteLink("start.md", "http://example.com")).toBeNull();
    expect(resolveNoteLink("start.md", "//example.com")).toBeNull();
    expect(resolveNoteLink("start.md", "mailto:test@example.com")).toBeNull();
    expect(resolveNoteLink("start.md", "file:///path.md")).toBeNull();
  });

  it("rejects absolute paths", () => {
    expect(resolveNoteLink("start.md", "/absolute.md")).toBeNull();
    expect(resolveNoteLink("start.md", "/path/to/file.md")).toBeNull();
  });

  it("rejects path traversal escaping workspace", () => {
    expect(resolveNoteLink("start.md", "../../outside.md")).toBeNull();
    expect(resolveNoteLink("docs/start.md", "../../../outside.md")).toBeNull();
  });

  it("rejects empty or whitespace-only targets", () => {
    expect(resolveNoteLink("start.md", "")).toBeNull();
    expect(resolveNoteLink("start.md", "   ")).toBeNull();
    expect(resolveNoteLink("start.md", "\t\n")).toBeNull();
  });

  it("rejects malformed URL encoding", () => {
    expect(resolveNoteLink("start.md", "%")).toBeNull();
    expect(resolveNoteLink("start.md", "%GG")).toBeNull();
    expect(resolveNoteLink("start.md", "%2")).toBeNull();
  });

  it("adds .md extension when missing", () => {
    expect(resolveNoteLink("start.md", "other")).toBe("other.md");
    expect(resolveNoteLink("docs/start.md", "../other")).toBe("other.md");
  });

  it("preserves .md extension case-insensitively", () => {
    expect(resolveNoteLink("start.md", "other.MD")).toBe("other.MD");
    expect(resolveNoteLink("start.md", "other.Md")).toBe("other.Md");
  });

  it("handles root-level source paths", () => {
    expect(resolveNoteLink("start.md", "other.md")).toBe("other.md");
    expect(resolveNoteLink("start.md", "./other.md")).toBe("other.md");
  });

  it("normalizes path separators", () => {
    expect(resolveNoteLink("docs\\start.md", "other.md")).toBe("docs/other.md");
    expect(resolveNoteLink("docs/start.md", "..\\other.md")).toBe("other.md");
  });
});

describe("extractNoteLinks", () => {
  it("extracts multiple unique links", () => {
    const markdown = "[one](a.md) [two](b.md) [three](a.md)";
    expect(extractNoteLinks(markdown, "start.md")).toEqual(["a.md", "b.md"]);
  });

  it("ignores external URLs", () => {
    const markdown = "[local](note.md) [external](https://example.com) [also](http://test.com)";
    expect(extractNoteLinks(markdown, "start.md")).toEqual(["note.md"]);
  });

  it("ignores image links", () => {
    const markdown = "![image](image.png) [link](note.md)";
    expect(extractNoteLinks(markdown, "start.md")).toEqual(["note.md"]);
  });

  it("handles links with titles", () => {
    const markdown = '[link](note.md "title") [another](other.md \'single quotes\')';
    expect(extractNoteLinks(markdown, "start.md")).toEqual(["note.md", "other.md"]);
  });

  it("resolves relative links from source path", () => {
    const markdown = "[link](../other.md)";
    expect(extractNoteLinks(markdown, "docs/start.md")).toEqual(["other.md"]);
  });

  it("returns empty array for no links", () => {
    expect(extractNoteLinks("", "start.md")).toEqual([]);
    expect(extractNoteLinks("plain text", "start.md")).toEqual([]);
    expect(extractNoteLinks("[not a link](https://example.com)", "start.md")).toEqual([]);
  });

  it("deduplicates resolved links", () => {
    const markdown = "[one](other.md) [two](other) [three](./other.md)";
    expect(extractNoteLinks(markdown, "start.md")).toEqual(["other.md"]);
  });

  it("handles empty source path gracefully", () => {
    const markdown = "[link](note.md)";
    expect(extractNoteLinks(markdown, "")).toEqual([]);
  });

  it("handles URL-encoded link targets", () => {
    const markdown = "[link](path%20with%20spaces.md)";
    expect(extractNoteLinks(markdown, "start.md")).toEqual(["path with spaces.md"]);
  });

  it("extracts links from malformed markdown", () => {
    const markdown = "[broken](note.md [also broken](other.md)";
    expect(extractNoteLinks(markdown, "start.md")).toEqual(["note.md"]);
  });
});

describe("relativeWorkspaceLink", () => {
  const file = (path: string) => ({ name: path.split("/").pop() ?? path, path, kind: "file" as const });
  const directory = (path: string) => ({ name: path.split("/").pop() ?? path, path, kind: "directory" as const });

  it("links to a file in the same directory", () => {
    expect(relativeWorkspaceLink("docs/start.md", file("docs/other.md"))).toBe("other.md");
  });

  it("links to a file in a nested directory", () => {
    expect(relativeWorkspaceLink("docs/start.md", file("docs/sub/deep.md"))).toBe("sub/deep.md");
  });

  it("links to a file in a parent directory", () => {
    expect(relativeWorkspaceLink("docs/guide/start.md", file("docs/other.md"))).toBe("../other.md");
  });

  it("links to a directory with a trailing slash", () => {
    expect(relativeWorkspaceLink("docs/start.md", directory("docs/sub"))).toBe("sub/");
  });

  it("links across top-level directories", () => {
    expect(relativeWorkspaceLink("a/x.md", file("b/y.md"))).toBe("../b/y.md");
  });

  it("links from the workspace root", () => {
    expect(relativeWorkspaceLink("start.md", file("other.md"))).toBe("other.md");
  });

  it("percent-encodes segment names with spaces", () => {
    expect(relativeWorkspaceLink("a.md", file("my note.md"))).toBe("my%20note.md");
  });
});

describe("resolveWorkspaceLink", () => {
  it("resolves a relative file link from the source folder", () => {
    expect(resolveWorkspaceLink("docs/start.md", "other.md")).toEqual({ path: "docs/other.md", kind: "file" });
  });

  it("resolves parent directory references", () => {
    expect(resolveWorkspaceLink("docs/guide/start.md", "../other.md")).toEqual({ path: "docs/other.md", kind: "file" });
  });

  it("resolves nested traversal without escaping the workspace", () => {
    expect(resolveWorkspaceLink("a/b/c.md", "../../d.md")).toEqual({ path: "d.md", kind: "file" });
  });

  it("resolves a directory link with a trailing slash", () => {
    expect(resolveWorkspaceLink("docs/start.md", "sub/")).toEqual({ path: "docs/sub", kind: "directory" });
  });

  it("strips query parameters and fragments", () => {
    expect(resolveWorkspaceLink("start.md", "other.md?q=1#sec")).toEqual({ path: "other.md", kind: "file" });
  });

  it("decodes percent-encoded targets", () => {
    expect(resolveWorkspaceLink("start.md", "my%20note.md")).toEqual({ path: "my note.md", kind: "file" });
  });

  it("treats an absolute path as workspace-rooted", () => {
    expect(resolveWorkspaceLink("start.md", "/absolute.md")).toEqual({ path: "absolute.md", kind: "file" });
  });

  it("resolves dot segments", () => {
    expect(resolveWorkspaceLink("docs/start.md", "./other.md")).toEqual({ path: "docs/other.md", kind: "file" });
  });

  it("rejects external URLs", () => {
    expect(resolveWorkspaceLink("start.md", "https://example.com")).toBeNull();
  });

  it("rejects fragment-only links", () => {
    expect(resolveWorkspaceLink("start.md", "#section")).toBeNull();
  });

  it("rejects empty targets", () => {
    expect(resolveWorkspaceLink("start.md", "")).toBeNull();
  });

  it("rejects traversal that escapes the workspace", () => {
    expect(resolveWorkspaceLink("start.md", "../../escape.md")).toBeNull();
    expect(resolveWorkspaceLink("docs/start.md", "../../../outside.md")).toBeNull();
  });
});

describe("isExternalUrl", () => {
  it("treats values with a scheme or protocol-relative prefix as external", () => {
    expect(isExternalUrl("https://example.com")).toBe(true);
    expect(isExternalUrl("http://example.com")).toBe(true);
    expect(isExternalUrl("mailto:test@example.com")).toBe(true);
    expect(isExternalUrl("ftp://files.example.com")).toBe(true);
    expect(isExternalUrl("//example.com")).toBe(true);
  });

  it("treats bare domains and plain text as not external", () => {
    expect(isExternalUrl("example.com")).toBe(false);
    expect(isExternalUrl("www.example.com")).toBe(false);
    expect(isExternalUrl("some words")).toBe(false);
    expect(isExternalUrl("")).toBe(false);
  });
});

describe("normalizeLinkUrl", () => {
  it("trims whitespace and adds HTTPS to bare domains", () => {
    expect(normalizeLinkUrl("  www.example.com/path?q=1  ")).toBe("https://www.example.com/path?q=1");
    expect(normalizeLinkUrl("example.co.uk")).toBe("https://example.co.uk");
  });

  it("preserves explicit schemes and protocol-relative URLs", () => {
    expect(normalizeLinkUrl(" mailto:hello@example.com ")).toBe("mailto:hello@example.com");
    expect(normalizeLinkUrl("//example.com/docs")).toBe("//example.com/docs");
  });

  it("preserves absolute and relative workspace paths", () => {
    expect(normalizeLinkUrl("/images/photo.png")).toBe("/images/photo.png");
    expect(normalizeLinkUrl("./note.md")).toBe("./note.md");
    expect(normalizeLinkUrl("../notes/page.md#intro")).toBe("../notes/page.md#intro");
    expect(normalizeLinkUrl("docs/guide.md")).toBe("docs/guide.md");
    expect(normalizeLinkUrl("folder/")).toBe("folder/");
  });

  it("leaves plain text and localhost unchanged", () => {
    expect(normalizeLinkUrl("some words")).toBe("some words");
    expect(normalizeLinkUrl("localhost:3000/page")).toBe("localhost:3000/page");
  });
});