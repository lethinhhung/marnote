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

describe("searchWorkspace - ranking and ordering", () => {
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

  it("returns matches with all required fields", () => {
    const tagMap = new Map<string, string[]>([["Notes/Work.md", ["work", "meeting"]]]);
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