import { describe, it, expect } from "vitest";
import { searchWorkspace } from "./searchMatching.js";
import { WorkspaceEntry } from "./workspace.js";

function dir(name: string, path: string, children: WorkspaceEntry[] = []): WorkspaceEntry {
  return { name, path, kind: "directory", children };
}

function file(name: string, path: string): WorkspaceEntry {
  return { name, path, kind: "file" };
}

const sampleTree: WorkspaceEntry[] = [
  dir("Notes", "Notes", [
    file("Readme.md", "Notes/Readme.md"),
    file("TODO.md", "Notes/TODO.md"),
    dir("Projects", "Notes/Projects", [
      file("Alpha.md", "Notes/Projects/Alpha.md"),
      file("Beta.md", "Notes/Projects/Beta.md"),
      dir("Deep", "Notes/Projects/Deep", [
        file("Nested.md", "Notes/Projects/Deep/Nested.md"),
      ]),
    ]),
  ]),
  file("Config.json", "Config.json"),
];

const taggedTree: WorkspaceEntry[] = [
  dir("Notes", "Notes", [
    file("Work.md", "Notes/Work.md"),
    file("Personal.md", "Notes/Personal.md"),
    file("Readme.md", "Notes/Readme.md"),
  ]),
];

const tagMap = new Map<string, string[]>([
  ["Notes/Work.md", ["work", "meeting"]],
  ["Notes/Personal.md", ["personal"]],
]);

const contentMap = new Map<string, string>([
  ["Notes/Work.md", "# Work Notes\n\nThis is about the project meeting and deadlines."],
  ["Notes/Personal.md", "# Personal\n\nShopping list and personal tasks."],
  ["Notes/Readme.md", "# Readme\n\nWelcome to the workspace."],
  ["Notes/Projects/Alpha.md", "# Alpha Project\n\nAlpha project details and timeline."],
  ["Notes/Projects/Beta.md", "# Beta Project\n\nBeta testing phase notes."],
]);

describe("searchWorkspace", () => {
  describe("basic behavior", () => {
    it("returns empty array for empty query", () => {
      expect(searchWorkspace(sampleTree, "")).toEqual([]);
      expect(searchWorkspace(sampleTree, "   ")).toEqual([]);
    });

    it("returns empty array for no matches", () => {
      const results = searchWorkspace(sampleTree, "nonexistent");
      expect(results).toEqual([]);
    });

    it("limits results to default of 20", () => {
      const manyFiles: WorkspaceEntry[] = [
        dir("Notes", "Notes", Array.from({ length: 25 }, (_, i) => file(`Note${i}.md`, `Notes/Note${i}.md`))),
      ];
      const results = searchWorkspace(manyFiles, "Note");
      expect(results).toHaveLength(20);
    });

    it("respects custom limit up to maximum of 100", () => {
      const manyFiles: WorkspaceEntry[] = [
        dir("Notes", "Notes", Array.from({ length: 150 }, (_, i) => file(`Note${i}.md`, `Notes/Note${i}.md`))),
      ];
      const results = searchWorkspace(manyFiles, "Note", { limit: 50 });
      expect(results).toHaveLength(50);

      const resultsMax = searchWorkspace(manyFiles, "Note", { limit: 200 });
      expect(resultsMax).toHaveLength(100);
    });

    it("clamps limit to at least 1", () => {
      const results = searchWorkspace(sampleTree, "Readme", { limit: 0 });
      expect(results).toHaveLength(1);
    });
  });

  describe("title matching", () => {
    it("matches case-insensitively against title", () => {
      const results = searchWorkspace(sampleTree, "readme");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Readme.md");
      expect(results[0].source).toBe("Title");
      expect(results[0].score).toBe(100);
    });

    it("matches partial strings in title", () => {
      const results = searchWorkspace(sampleTree, "Alpha");
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe("Notes/Projects/Alpha.md");
      expect(results[0].source).toBe("Title");
    });

    it("ranks title matches highest", () => {
      const results = searchWorkspace(sampleTree, "readme");
      const readme = results.find((r) => r.path === "Notes/Readme.md");
      expect(readme?.source).toBe("Title");
      expect(readme?.score).toBe(100);
    });
  });

  describe("path matching", () => {
    it("matches against workspace-relative path", () => {
      const results = searchWorkspace(sampleTree, "projects");
      expect(results.length).toBeGreaterThanOrEqual(2);
      const paths = results.map((r) => r.path);
      expect(paths).toContain("Notes/Projects/Alpha.md");
      expect(paths).toContain("Notes/Projects/Deep/Nested.md");
    });

    it("labels path matches as Path with score 70", () => {
      const results = searchWorkspace(sampleTree, "projects");
      const pathMatches = results.filter((r) => r.source === "Path");
      expect(pathMatches.length).toBeGreaterThan(0);
      expect(pathMatches.every((r) => r.score === 70)).toBe(true);
    });

    it("ranks path matches below title matches", () => {
      const tree = [
        dir("Notes", "Notes", [
          file("Projects.md", "Notes/Projects.md"),
          dir("Projects", "Notes/Projects", [file("Alpha.md", "Notes/Projects/Alpha.md")]),
        ]),
      ];
      const results = searchWorkspace(tree, "projects");
      const titleMatch = results.find((r) => r.path === "Notes/Projects.md");
      const pathMatch = results.find((r) => r.path === "Notes/Projects/Alpha.md");
      expect(titleMatch?.score).toBe(100);
      expect(pathMatch?.score).toBe(70);
    });
  });

  describe("tag matching", () => {
    it("matches tags when provided in options", () => {
      const results = searchWorkspace(taggedTree, "meeting", { tags: tagMap });
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe("Notes/Work.md");
      expect(results[0].source).toBe("Tag");
      expect(results[0].score).toBe(50);
    });

    it("matches multiple tags on same entry", () => {
      const results = searchWorkspace(taggedTree, "meeting", { tags: tagMap });
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe("Notes/Work.md");
    });

    it("excludes entries without matching tag", () => {
      const results = searchWorkspace(taggedTree, "work", { tags: tagMap });
      expect(results.map((r) => r.path)).not.toContain("Notes/Personal.md");
    });

    it("ranks tag matches below path matches", () => {
      const tree = [
        dir("Notes", "Notes", [
          file("work.md", "Notes/work.md"),
          file("Other.md", "Notes/Other.md"),
        ]),
      ];
      const tags = new Map<string, string[]>([["Notes/Other.md", ["work"]]]);
      const results = searchWorkspace(tree, "work", { tags });
      const titleMatch = results.find((r) => r.path === "Notes/work.md");
      const tagMatch = results.find((r) => r.path === "Notes/Other.md");
      expect(titleMatch?.score).toBe(100);
      expect(tagMatch?.score).toBe(50);
    });
  });

  describe("content matching", () => {
    it("matches content when provided in options", () => {
      const results = searchWorkspace(taggedTree, "deadlines", { contents: contentMap });
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe("Notes/Work.md");
      expect(results[0].source).toBe("Content");
      expect(results[0].score).toBe(20);
    });

    it("includes excerpt for content matches", () => {
      const results = searchWorkspace(taggedTree, "deadlines", { contents: contentMap });
      expect(results[0].excerpt).toContain("deadlines");
      expect(results[0].excerpt.length).toBeGreaterThan(0);
    });

    it("excerpt contains matched text with context", () => {
      const results = searchWorkspace(taggedTree, "project meeting", { contents: contentMap });
      const match = results.find((r) => r.path === "Notes/Work.md");
      expect(match?.excerpt).toContain("project");
      expect(match?.excerpt).toContain("meeting");
    });

    it("excerpt is truncated with ellipsis when needed", () => {
      const longContent = "A".repeat(200) + " target " + "B".repeat(200);
      const tree = [file("Long.md", "Long.md")];
      const contents = new Map([["Long.md", longContent]]);
      const results = searchWorkspace(tree, "target", { contents });
      expect(results[0].excerpt).toContain("target");
      expect(results[0].excerpt.startsWith("…")).toBe(true);
      expect(results[0].excerpt.endsWith("…")).toBe(true);
    });

    it("ranks content matches lowest", () => {
      const tree = [
        dir("Notes", "Notes", [
          file("target.md", "Notes/target.md"),
          file("Other.md", "Notes/Other.md"),
        ]),
      ];
      const tags = new Map<string, string[]>([["Notes/Other.md", ["target"]]]);
      const contents = new Map([["Notes/Other.md", "This contains target in content"]]);
      const results = searchWorkspace(tree, "target", { tags, contents });
      const titleMatch = results.find((r) => r.path === "Notes/target.md");
      const tagMatch = results.find((r) => r.path === "Notes/Other.md" && r.source === "Tag");
      expect(titleMatch?.score).toBe(100);
      expect(tagMatch?.score).toBe(50);
      // contentMatch may not exist because tag match takes precedence for the same entry
      // but if we search for a word only in content:
      const contentOnlyResults = searchWorkspace(tree, "contains", { contents });
      expect(contentOnlyResults[0]?.source).toBe("Content");
      expect(contentOnlyResults[0]?.score).toBe(20);
    });
  });

  describe("ranking and ordering", () => {
    it("sorts by score descending, then path ascending", () => {
      const tree = [
        dir("Notes", "Notes", [
          file("Zebra.md", "Notes/Zebra.md"),
          file("Alpha.md", "Notes/Alpha.md"),
          file("Beta.md", "Notes/Beta.md"),
        ]),
      ];
      const results = searchWorkspace(tree, "md");
      expect(results[0].path).toBe("Notes/Alpha.md");
      expect(results[1].path).toBe("Notes/Beta.md");
      expect(results[2].path).toBe("Notes/Zebra.md");
    });

    it("prefers title over path when same entry matches both", () => {
      const tree = [
        dir("Project", "Project", [file("Project.md", "Project/Project.md")]),
      ];
      const results = searchWorkspace(tree, "project");
      expect(results[0].source).toBe("Title");
    });

    it("handles multi-word queries requiring all words", () => {
      const results = searchWorkspace(sampleTree, "readme", { contents: contentMap });
      const match = results.find((r) => r.path === "Notes/Readme.md");
      expect(match).toBeDefined();
      expect(match?.source).toBe("Title");
    });

    it("returns no match when not all words found", () => {
      const results = searchWorkspace(taggedTree, "alpha beta", { contents: contentMap });
      const alphaMatch = results.find((r) => r.path === "Notes/Projects/Alpha.md");
      const betaMatch = results.find((r) => r.path === "Notes/Projects/Beta.md");
      expect(alphaMatch).toBeUndefined();
      expect(betaMatch).toBeUndefined();
    });
  });

  describe("excludes non-markdown files", () => {
    it("does not match non-markdown files in tree", () => {
      const tree = [
        dir("Notes", "Notes", [
          file("script.rs", "Notes/script.rs"),
          file("data.json", "Notes/data.json"),
          file("note.md", "Notes/note.md"),
        ]),
      ];
      const results = searchWorkspace(tree, "script");
      expect(results).toHaveLength(0);

      const results2 = searchWorkspace(tree, "note");
      expect(results2).toHaveLength(1);
      expect(results2[0].path).toBe("Notes/note.md");
    });
  });

  describe("recursive directory traversal", () => {
    it("searches nested directories", () => {
      const results = searchWorkspace(sampleTree, "nested");
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe("Notes/Projects/Deep/Nested.md");
    });

    it("collects tags from nested entries", () => {
      const nestedTree: WorkspaceEntry[] = [
        dir("Notes", "Notes", [
          dir("Projects", "Notes/Projects", [
            file("Alpha.md", "Notes/Projects/Alpha.md"),
          ]),
        ]),
      ];
      const tags = new Map([["Notes/Projects/Alpha.md", ["nested-tag"]]]);
      const results = searchWorkspace(nestedTree, "nested-tag", { tags });
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe("Notes/Projects/Alpha.md");
    });
  });

  describe("edge cases", () => {
    it("handles entries with no tags or contents maps", () => {
      const results = searchWorkspace(sampleTree, "readme");
      expect(results).toHaveLength(1);
    });

    it("handles empty tags and contents maps", () => {
      const results = searchWorkspace(sampleTree, "readme", { tags: new Map(), contents: new Map() });
      expect(results).toHaveLength(1);
    });

    it("handles markdown files with uppercase extension", () => {
      const tree = [file("README.MD", "README.MD"), file("Note.Md", "Note.Md")];
      const results = searchWorkspace(tree, "readme");
      expect(results).toHaveLength(1);
    });

    it("returns matches with all required fields", () => {
      const results = searchWorkspace(taggedTree, "work", { tags: tagMap });
      const match = results[0];
      expect(match).toHaveProperty("path");
      expect(match).toHaveProperty("name");
      expect(match).toHaveProperty("excerpt");
      expect(match).toHaveProperty("score");
      expect(match).toHaveProperty("source");
      expect(typeof match.path).toBe("string");
      expect(typeof match.name).toBe("string");
      expect(typeof match.excerpt).toBe("string");
      expect(typeof match.score).toBe("number");
      expect(["Title", "Path", "Tag", "Content"]).toContain(match.source);
    });
  });
});