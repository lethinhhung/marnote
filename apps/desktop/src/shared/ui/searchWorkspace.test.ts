import { describe, it, expect } from "vitest";
import { searchWorkspace } from "./searchNotes";
import type { Entry } from "../domain/workspace";

function dir(name: string, path: string, children: Entry[] = []): Entry {
  return { name, path, kind: "directory", children };
}

function file(name: string, path: string): Entry {
  return { name, path, kind: "file" };
}

function taggedFile(name: string, path: string, tags: string[]): Entry {
  return { name, path, kind: "file", metadata: { tags } };
}

describe("searchWorkspace", () => {
  const taggedTree: Entry[] = [
    dir("Notes", "Notes", [
      taggedFile("Work.md", "Notes/Work.md", ["work", "meeting"]),
      taggedFile("Personal.md", "Notes/Personal.md", ["personal"]),
      file("Readme.md", "Notes/Readme.md"),
    ]),
  ];

  it("labels filter-only tag matches as Tag with score 50, not Title with score 100", () => {
    const results = searchWorkspace(taggedTree, "tag:work", {});
    expect(results.notes).toHaveLength(1);
    expect(results.notes[0].entry.path).toBe("Notes/Work.md");
    expect(results.notes[0].source).toBe("Tag");
    expect(results.notes[0].score).toBe(50);
  });

  it("excludes notes that do not match the tag filter", () => {
    const results = searchWorkspace(taggedTree, "tag:work", {});
    expect(results.notes.map((n) => n.entry.path)).not.toContain("Notes/Personal.md");
    expect(results.tags).toHaveLength(1);
    expect(results.tags[0].name).toBe("work");
  });

  it("returns no notes when the tag filter matches nothing", () => {
    const results = searchWorkspace(taggedTree, "tag:nonexistent", {});
    expect(results.notes).toHaveLength(0);
  });

  it("labels folder-scoped matches as Folder", () => {
    const results = searchWorkspace(taggedTree, "in:Notes", {});
    expect(results.notes.map((n) => n.source).every((source) => source === "Folder")).toBe(true);
  });

  it("collects tags matching any search word for multi-word queries", () => {
    const results = searchWorkspace(taggedTree, "work personal", {});
    expect(results.tags.map((t) => t.name)).toEqual(["personal", "work"]);
  });

  it("generates excerpt from title when match source is Title", () => {
    const tree: Entry[] = [
      dir("Notes", "Notes", [
        file("Meeting Notes.md", "Notes/Meeting Notes.md"),
      ]),
    ];
    const results = searchWorkspace(tree, "Meeting", { "Notes/Meeting Notes.md": "Discussed project timeline and budget" });
    expect(results.notes).toHaveLength(1);
    expect(results.notes[0].source).toBe("Title");
    expect(results.notes[0].excerpt).toContain("Meeting Notes");
  });

  it("generates excerpt from folder path when match source is Folder", () => {
    const tree: Entry[] = [
      dir("Projects", "Projects", [
        dir("Alpha", "Projects/Alpha", [
          file("Notes.md", "Projects/Alpha/Notes.md"),
        ]),
      ]),
    ];
    const results = searchWorkspace(tree, "Alpha", { "Projects/Alpha/Notes.md": "Generic content" });
    expect(results.notes).toHaveLength(1);
    expect(results.notes[0].source).toBe("Folder");
    expect(results.notes[0].excerpt).toContain("Alpha");
  });

  it("generates excerpt from tags when match source is Tag", () => {
    const tree: Entry[] = [
      dir("Notes", "Notes", [
        taggedFile("Report.md", "Notes/Report.md", ["quarterly", "finance"]),
      ]),
    ];
    const results = searchWorkspace(tree, "quarterly", { "Notes/Report.md": "Sales went up this quarter" });
    expect(results.notes).toHaveLength(1);
    expect(results.notes[0].source).toBe("Tag");
    expect(results.notes[0].excerpt.toLocaleLowerCase()).toContain("quarterly");
  });

  it("generates excerpt from content when match source is Content", () => {
    const tree: Entry[] = [
      dir("Notes", "Notes", [
        file("Report.md", "Notes/Report.md"),
      ]),
    ];
    const results = searchWorkspace(tree, "quarter", { "Notes/Report.md": "Sales went up this quarter" });
    expect(results.notes).toHaveLength(1);
    expect(results.notes[0].source).toBe("Content");
    expect(results.notes[0].excerpt.toLocaleLowerCase()).toContain("quarter");
  });
});