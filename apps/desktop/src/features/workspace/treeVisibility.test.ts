import { describe, expect, it } from "vitest";
import type { Entry } from "./workspaceTypes";
import { containsNote, visibleEntries } from "./treeVisibility";

const file = (name: string): Entry => ({ name, path: name, kind: "file" });
const dir = (name: string, children: Entry[]): Entry => ({ name, path: name, kind: "directory", children });

const nested = () => dir("docs", [dir("guide", [file("intro.md"), file("logo.png")])]);

describe("containsNote", () => {
  it("finds a Markdown note nested inside folders", () => {
    expect(containsNote(nested())).toBe(true);
  });

  it("matches the .md extension case-insensitively", () => {
    expect(containsNote(dir("notes", [file("README.MD")]))).toBe(true);
  });

  it("reports false for a folder holding only non-Markdown files", () => {
    expect(containsNote(dir("assets", [file("logo.png")]))).toBe(false);
  });
});

describe("visibleEntries", () => {
  it("keeps ancestor folders visible for a nested Markdown note", () => {
    const result = visibleEntries([nested()], true);
    expect(result).toHaveLength(1);
    expect(result[0].children?.[0].children?.[0].name).toBe("intro.md");
  });

  it("hides a folder that contains no notes", () => {
    const entries: Entry[] = [dir("empty", [file("logo.png")]), dir("notes", [file("a.md")])];
    expect(visibleEntries(entries, true).map(entry => entry.name)).toEqual(["notes"]);
  });

  it("filters nested child directories without notes", () => {
    const entries: Entry[] = [dir("root", [dir("empty", [file("logo.png")]), dir("notes", [file("a.md")])])];
    const [root] = visibleEntries(entries, true);
    expect(root.children?.map(child => child.name)).toEqual(["notes"]);
  });

  it("preserves all files and directories when hiding is disabled", () => {
    const entries: Entry[] = [dir("empty", [file("logo.png")])];
    const [root] = visibleEntries(entries, false);
    expect(root.children?.map(child => child.name)).toEqual(["logo.png"]);
  });
});
