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

describe("searchWorkspace - title matching", () => {
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

describe("searchWorkspace - path matching", () => {
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