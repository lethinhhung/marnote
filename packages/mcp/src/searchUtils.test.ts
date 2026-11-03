import { describe, expect, it } from "vitest";
import { collectMarkdownEntries, getEntryContent, getEntryTags, makeExcerpt } from "./searchUtils.js";
import { WorkspaceEntry } from "./workspace.js";

function file(name: string, path: string): WorkspaceEntry {
  return { name, path, kind: "file" };
}

function dir(name: string, path: string, children: WorkspaceEntry[] = []): WorkspaceEntry {
  return { name, path, kind: "directory", children };
}

describe("collectMarkdownEntries", () => {
  it("returns an empty array for empty input", () => {
    expect(collectMarkdownEntries([])).toEqual([]);
  });

  it("collects markdown files recursively and skips non-markdown files", () => {
    const tree: WorkspaceEntry[] = [
      file("readme.md", "readme.md"),
      file("script.ts", "script.ts"),
      dir("Notes", "Notes", [
        file("note.MD", "Notes/note.MD"),
        file("data.json", "Notes/data.json"),
      ]),
    ];
    const result = collectMarkdownEntries(tree);
    expect(result.map((entry) => entry.path)).toEqual(["readme.md", "Notes/note.MD"]);
  });
});

describe("getEntryTags", () => {
  const entry = file("note.md", "notes/note.md");

  it("returns an empty array when no tags map is provided", () => {
    expect(getEntryTags(entry, undefined)).toEqual([]);
  });

  it("returns an empty array when the entry path is not tagged", () => {
    const tags = new Map<string, string[]>([["notes/other.md", ["a"]]]);
    expect(getEntryTags(entry, tags)).toEqual([]);
  });

  it("returns the tags for the entry path", () => {
    const tags = new Map<string, string[]>([["notes/note.md", ["work", "meeting"]]]);
    expect(getEntryTags(entry, tags)).toEqual(["work", "meeting"]);
  });
});

describe("getEntryContent", () => {
  const entry = file("note.md", "notes/note.md");

  it("returns an empty string when no contents map is provided", () => {
    expect(getEntryContent(entry, undefined)).toBe("");
  });

  it("returns an empty string when the entry path has no content", () => {
    const contents = new Map<string, string>([["notes/other.md", "hello"]]);
    expect(getEntryContent(entry, contents)).toBe("");
  });

  it("returns the content for the entry path", () => {
    const contents = new Map<string, string>([["notes/note.md", "# Note\n\nbody"]]);
    expect(getEntryContent(entry, contents)).toBe("# Note\n\nbody");
  });
});

describe("makeExcerpt", () => {
  it("returns an empty string when no query word is found in the content", () => {
    expect(makeExcerpt("# Hello\n\nworld", "missing")).toBe("");
  });

  it("returns an empty string for an empty query", () => {
    expect(makeExcerpt("# Hello\n\nworld", "")).toBe("");
  });

  it("omits the leading ellipsis when the match is at the start of the content", () => {
    const excerpt = makeExcerpt("target tail here", "target");
    expect(excerpt).toContain("target");
    expect(excerpt.startsWith("…")).toBe(false);
  });

  it("omits the trailing ellipsis when the match is at the end of the content", () => {
    const excerpt = makeExcerpt("head tail target", "target");
    expect(excerpt).toContain("target");
    expect(excerpt.endsWith("…")).toBe(false);
  });
});
