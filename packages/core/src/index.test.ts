import { describe, expect, it } from "vitest";
import { buildWorkspaceTree, calculateNoteStats, calculateReadingTime, countCharacters, countWords, extractNoteLinks, getWelcomeMessage, isDocumentationPath, normalizeWorkspacePath, resolveNoteLink } from "./index";

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

describe("note statistics", () => {
  describe("countWords", () => {
    it("returns zero for empty or whitespace-only text", () => {
      expect(countWords("")).toBe(0);
      expect(countWords("   ")).toBe(0);
      expect(countWords("\t\n")).toBe(0);
    });

    it("counts words separated by whitespace", () => {
      expect(countWords("hello")).toBe(1);
      expect(countWords("hello world")).toBe(2);
      expect(countWords("one two three")).toBe(3);
    });

    it("collapses multiple whitespace separators and trims edges", () => {
      expect(countWords("  hello   world  ")).toBe(2);
      expect(countWords("a\nb\tc")).toBe(3);
    });
  });

  describe("countCharacters", () => {
    it("returns zero for empty text", () => {
      expect(countCharacters("")).toBe(0);
    });

    it("counts every character including spaces", () => {
      expect(countCharacters("abc")).toBe(3);
      expect(countCharacters("a b")).toBe(3);
      expect(countCharacters("héllo")).toBe(5);
    });
  });

  describe("calculateReadingTime", () => {
    it("returns at least one minute", () => {
      expect(calculateReadingTime(0)).toBe(1);
      expect(calculateReadingTime(1)).toBe(1);
    });

    it("rounds up past each 220-word minute", () => {
      expect(calculateReadingTime(220)).toBe(1);
      expect(calculateReadingTime(221)).toBe(2);
      expect(calculateReadingTime(440)).toBe(2);
      expect(calculateReadingTime(441)).toBe(3);
    });
  });

  describe("calculateNoteStats", () => {
    it("combines word count, character count, and reading time", () => {
      expect(calculateNoteStats("hello world")).toEqual({
        words: 2,
        characters: 11,
        readingTimeMinutes: 1,
      });
    });

    it("returns zero stats for empty text", () => {
      expect(calculateNoteStats("")).toEqual({
        words: 0,
        characters: 0,
        readingTimeMinutes: 1,
      });
    });
  });
});
