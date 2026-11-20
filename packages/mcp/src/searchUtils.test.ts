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

  it("returns an excerpt for an empty query", () => {
    const excerpt = makeExcerpt("# Hello\n\nworld", "");
    expect(excerpt).toContain("Hello");
    expect(excerpt).toContain("world");
  });

  it("returns at most 141 characters for an empty query (140 + ellipsis)", () => {
    const longContent = "A".repeat(200) + " target";
    const excerpt = makeExcerpt(longContent, "");
    expect(excerpt.length).toBe(141);
    expect(excerpt.endsWith("…")).toBe(true);
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

  it("includes context around all matches for a multi-word query", () => {
    const excerpt = makeExcerpt("before alpha middle beta after", "alpha beta");
    expect(excerpt).toContain("alpha");
    expect(excerpt).toContain("beta");
  });

  it("centers the excerpt on the first found word when only some query words appear in the content", () => {
    const excerpt = makeExcerpt("alpha beta gamma delta", "beta zeta");
    expect(excerpt).toContain("beta");
    expect(excerpt).not.toContain("zeta");
  });

  it("includes the last match word in the excerpt", () => {
    const content = "alpha " + "x".repeat(150) + " zeta";
    const excerpt = makeExcerpt(content, "alpha zeta");
    expect(excerpt).toContain("alpha");
    expect(excerpt).toContain("zeta");
  });

  it("adds both leading and trailing ellipses when the match is in the middle of the content", () => {
    const content = "A".repeat(100) + " target " + "B".repeat(100);
    const excerpt = makeExcerpt(content, "target");
    expect(excerpt).toContain("target");
    expect(excerpt.startsWith("…")).toBe(true);
    expect(excerpt.endsWith("…")).toBe(true);
  });
});
