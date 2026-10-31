import { describe, it, expect } from "vitest";
import { searchWorkspace } from "./searchMatching.js";
import { WorkspaceEntry } from "./workspace.js";

function dir(name: string, path: string, children: WorkspaceEntry[] = []): WorkspaceEntry {
  return { name, path, kind: "directory", children };
}

function file(name: string, path: string): WorkspaceEntry {
  return { name, path, kind: "file" };
}

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

describe("searchWorkspace - tag matching", () => {
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