import { describe, expect, it } from "vitest";
import { extractNoteLinks, resolveNoteLink } from "./links";

describe("resolveNoteLink", () => {
  it("resolves simple relative links", () => {
    expect(resolveNoteLink("docs/start.md", "other.md")).toBe("docs/other.md");
    expect(resolveNoteLink("docs/start.md", "./other.md")).toBe("docs/other.md");
  });

  it("resolves parent directory references", () => {
    expect(resolveNoteLink("docs/guide/start.md", "../other.md")).toBe("docs/other.md");
    expect(resolveNoteLink("docs/guide/start.md", "../../other.md")).toBe("other.md");
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