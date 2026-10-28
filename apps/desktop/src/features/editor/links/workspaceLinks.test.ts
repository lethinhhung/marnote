import { describe, expect, it } from "vitest";
import type { Entry } from "../../../shared/domain/workspace";
import {
  findWorkspaceLink,
  flattenEntries,
  relativeWorkspaceLink,
  resolveWorkspaceLink,
} from "./workspaceLinks";

const note = (path: string, kind: Entry["kind"] = "file", children?: Entry[]): Entry => ({
  name: path.split("/").at(-1)!, path, kind, children,
});

const workspace = [
  note("projects", "directory", [
    note("projects/plan.md"),
    note("projects/research", "directory", [note("projects/research/notes.md")]),
  ]),
  note("archive.md"),
];

describe("workspace links", () => {
  it("flattens nested entries in tree order", () => {
    expect(flattenEntries(workspace).map(entry => entry.path)).toEqual([
      "projects", "projects/plan.md", "projects/research",
      "projects/research/notes.md", "archive.md",
    ]);
    expect(flattenEntries()).toEqual([]);
  });

  it("generates encoded relative links from the current note", () => {
    expect(relativeWorkspaceLink("projects/plan.md", workspace[0].children![1].children![0]))
      .toBe("research/notes.md");
    expect(relativeWorkspaceLink("projects/research/notes.md", workspace[0].children![0]))
      .toBe("../plan.md");
    expect(relativeWorkspaceLink("projects/plan.md", note("projects/Design Docs", "directory")))
      .toBe("Design%20Docs/");
  });

  it("resolves relative links against the current note and classifies folders", () => {
    expect(resolveWorkspaceLink("projects/research/notes.md", "../plan.md"))
      .toEqual({ path: "projects/plan.md", kind: "file" });
    expect(resolveWorkspaceLink("projects/plan.md", "research/"))
      .toEqual({ path: "projects/research", kind: "directory" });
    expect(resolveWorkspaceLink("projects/plan.md", "../../outside.md")).toBeNull();
    expect(resolveWorkspaceLink("projects/plan.md", "https://example.com")).toBeNull();
  });

  it("finds the entry at the resolved path and keeps links path based after moves", () => {
    const from = "projects/plan.md";
    const target = workspace[0].children![1].children![0];
    const href = relativeWorkspaceLink(from, target);
    expect(findWorkspaceLink(workspace, from, href)).toBe(target);

    const moved = [note("archive.md"), note("moved/notes.md")];
    expect(resolveWorkspaceLink(from, href)?.path).toBe("projects/research/notes.md");
    expect(findWorkspaceLink(moved, from, href)).toBeUndefined();
    expect(findWorkspaceLink(moved, "moved/notes.md", "../projects/research/notes.md"))
      .toBeUndefined();
  });
});
