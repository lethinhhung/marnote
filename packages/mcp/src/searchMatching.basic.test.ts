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

const contentMap = new Map<string, string>([
  ["Notes/Work.md", "# Work Notes\n\nThis is about the project meeting and deadlines."],
  ["Notes/Personal.md", "# Personal\n\nShopping list and personal tasks."],
  ["Notes/Readme.md", "# Readme\n\nWelcome to the workspace."],
  ["Notes/Projects/Alpha.md", "# Alpha Project\n\nAlpha project details and timeline."],
  ["Notes/Projects/Beta.md", "# Beta Project\n\nBeta testing phase notes."],
]);

describe("searchWorkspace - basic behavior", () => {
  it("returns empty array for empty query", () => {
    expect(searchWorkspace(sampleTree, "")).toEqual([]);
    expect(searchWorkspace(sampleTree, "   ")).toEqual([]);
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
});

describe("searchWorkspace - content matching", () => {
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
    const contentOnlyResults = searchWorkspace(tree, "contains", { contents });
    expect(contentOnlyResults[0]?.source).toBe("Content");
    expect(contentOnlyResults[0]?.score).toBe(20);
  });
});