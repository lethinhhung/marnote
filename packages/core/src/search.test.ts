import { describe, expect, it } from "vitest";
import { excerptQueryFor, parseSearchQuery, searchWorkspace } from "./search";
import type { Entry } from "./workspace";

const entries: Entry[] = [
  { name: "meeting-notes.md", path: "work/meeting-notes.md", kind: "file", modifiedMs: 100, metadata: { tags: ["work", "urgent"] } },
  { name: "project-plan.md", path: "docs/project-plan.md", kind: "file", modifiedMs: 200, metadata: { tags: ["project"] } },
  { name: "readme.md", path: "readme.md", kind: "file", modifiedMs: 300 },
  { name: "work", path: "work", kind: "directory" },
  { name: "docs", path: "docs", kind: "directory" },
];

describe("parseSearchQuery", () => {
  it("returns an empty filter for an empty or whitespace-only query", () => {
    expect(parseSearchQuery("")).toEqual({ text: "", tag: "", folder: "", type: "" });
    expect(parseSearchQuery("   ")).toEqual({ text: "", tag: "", folder: "", type: "" });
  });

  it("parses tag, in, and type filters case-insensitively", () => {
    expect(parseSearchQuery("tag:meetings")).toEqual({ text: "", tag: "meetings", folder: "", type: "" });
    expect(parseSearchQuery("TAG:Meetings")).toEqual({ text: "", tag: "meetings", folder: "", type: "" });
    expect(parseSearchQuery("in:docs")).toEqual({ text: "", tag: "", folder: "docs", type: "" });
    expect(parseSearchQuery("IN:Docs")).toEqual({ text: "", tag: "", folder: "docs", type: "" });
    expect(parseSearchQuery("type:note")).toEqual({ text: "", tag: "", folder: "", type: "note" });
    expect(parseSearchQuery("type:folder")).toEqual({ text: "", tag: "", folder: "", type: "folder" });
    expect(parseSearchQuery("TYPE:Folder")).toEqual({ text: "", tag: "", folder: "", type: "folder" });
  });

  it("parses #tag shorthand and combines plain words into text", () => {
    expect(parseSearchQuery("#meetings")).toEqual({ text: "", tag: "meetings", folder: "", type: "" });
    expect(parseSearchQuery("project alpha")).toEqual({ text: "project alpha", tag: "", folder: "", type: "" });
    expect(parseSearchQuery("project alpha tag:beta in:src type:note")).toEqual({
      text: "project alpha",
      tag: "beta",
      folder: "src",
      type: "note",
    });
  });

  it("treats a lone # as producing no filter", () => {
    expect(parseSearchQuery("#")).toEqual({ text: "", tag: "", folder: "", type: "" });
  });
});

describe("searchWorkspace", () => {
  it("returns empty results for an empty query or no entries", () => {
    expect(searchWorkspace(entries, "")).toEqual({ notes: [], folders: [], tags: [] });
    expect(searchWorkspace([], "anything")).toEqual({ notes: [], folders: [], tags: [] });
  });

  it("ranks title matches above content matches", () => {
    const results = searchWorkspace(entries, "meeting");
    expect(results.notes.map((n) => n.entry.name)).toEqual(["meeting-notes.md"]);
    expect(results.notes[0]?.source).toBe("Title");
    expect(results.notes[0]?.score).toBe(100);
  });

  it("matches a folder path and attributes Folder source", () => {
    const results = searchWorkspace(entries, "work");
    const noteMatch = results.notes.find((n) => n.entry.name === "meeting-notes.md");
    expect(noteMatch?.source).toBe("Folder");
    expect(results.folders.map((f) => f.name)).toEqual(["work"]);
  });

  it("filters notes by folder with in:", () => {
    const results = searchWorkspace(entries, "in:docs");
    expect(results.notes.map((n) => n.entry.name)).toEqual(["project-plan.md"]);
  });

  it("filters results by type:folder and type:note", () => {
    expect(searchWorkspace(entries, "type:folder").folders.map((f) => f.name).sort()).toEqual(["docs", "work"]);
    expect(searchWorkspace(entries, "type:note").notes.map((n) => n.entry.name)).toEqual([
      "readme.md",
      "project-plan.md",
      "meeting-notes.md",
    ]);
  });

  it("filters notes by tag:", () => {
    const results = searchWorkspace(entries, "tag:urgent");
    expect(results.notes.map((n) => n.entry.name)).toEqual(["meeting-notes.md"]);
  });

  it("collects tags from matching notes", () => {
    const results = searchWorkspace(entries, "work");
    expect(results.tags).toEqual([{ name: "work", count: 1 }]);
  });

  it("collects tags only from notes matching all query words, not all notes in scope", () => {
    const entries: Entry[] = [
      { name: "matching.md", path: "notes/matching.md", kind: "file", modifiedMs: 100, metadata: { tags: ["project"] } },
      { name: "nonmatching.md", path: "notes/nonmatching.md", kind: "file", modifiedMs: 200, metadata: { tags: ["work"] } },
    ];
    const contents = {
      "notes/matching.md": "work project",
      "notes/nonmatching.md": "foo",
    };
    const results = searchWorkspace(entries, "work project", contents);
    expect(results.notes.map((n) => n.entry.name)).toEqual(["matching.md"]);
    expect(results.tags).toEqual([{ name: "project", count: 1 }]);
  });

  it("matches note content and attributes Content source", () => {
    const contents = { "work/meeting-notes.md": "quarterly planning summary" };
    const results = searchWorkspace(entries, "quarterly", contents);
    expect(results.notes.map((n) => n.entry.name)).toEqual(["meeting-notes.md"]);
    expect(results.notes[0]?.source).toBe("Content");
  });

  it("matches notes in nested folder with in: filter", () => {
    const nestedEntries: Entry[] = [
      { name: "note.md", path: "work/subfolder/note.md", kind: "file", modifiedMs: 100 },
      { name: "work", path: "work", kind: "directory" },
      { name: "subfolder", path: "work/subfolder", kind: "directory" },
    ];
    const contents = { "work/subfolder/note.md": "content" };
    const results = searchWorkspace(nestedEntries, "in:work/subfolder", contents);
    expect(results.notes.map((n) => n.entry.path)).toEqual(["work/subfolder/note.md"]);
    expect(results.folders.map((f) => f.path)).toEqual(["work/subfolder"]);
  });

  it("matches nested folder contents with parent in: filter", () => {
    const nestedEntries: Entry[] = [
      { name: "note.md", path: "work/subfolder/note.md", kind: "file", modifiedMs: 100 },
      { name: "work", path: "work", kind: "directory" },
      { name: "subfolder", path: "work/subfolder", kind: "directory" },
    ];
    const contents = { "work/subfolder/note.md": "content" };
    const results = searchWorkspace(nestedEntries, "in:work", contents);
    expect(results.notes.map((n) => n.entry.path)).toEqual(["work/subfolder/note.md"]);
    expect(results.folders.map((f) => f.path).sort()).toEqual(["work", "work/subfolder"]);
  });

  it("matches folder starting with # via in: filter", () => {
    const hashEntries: Entry[] = [
      { name: "note.md", path: "#work/note.md", kind: "file", modifiedMs: 100 },
      { name: "#work", path: "#work", kind: "directory" },
    ];
    const results = searchWorkspace(hashEntries, "in:#work");
    expect(results.notes.map((n) => n.entry.path)).toEqual(["#work/note.md"]);
    expect(results.folders.map((f) => f.path)).toEqual(["#work"]);
  });

  it("parses in: filter with leading # as literal folder name", () => {
    expect(parseSearchQuery("in:#work")).toEqual({ text: "", tag: "", folder: "#work", type: "" });
  });

  it("parses tag: filter with leading # as tag name without #", () => {
    expect(parseSearchQuery("tag:#work")).toEqual({ text: "", tag: "work", folder: "", type: "" });
  });
});

describe("excerptQueryFor", () => {
  it("returns the text query when one is set, regardless of source", () => {
    expect(excerptQueryFor({ text: "meeting", tag: "", folder: "", type: "" }, "Title")).toBe("meeting");
    expect(excerptQueryFor({ text: "meeting", tag: "", folder: "", type: "" }, "Tag")).toBe("meeting");
    expect(excerptQueryFor({ text: "meeting", tag: "", folder: "", type: "" }, "Folder")).toBe("meeting");
    expect(excerptQueryFor({ text: "meeting", tag: "", folder: "", type: "" }, "Content")).toBe("meeting");
  });

  it("returns the tag when source is Tag and no text query is set", () => {
    expect(excerptQueryFor({ text: "", tag: "work", folder: "", type: "" }, "Tag")).toBe("work");
  });

  it("returns the folder when source is Folder and no text query is set", () => {
    expect(excerptQueryFor({ text: "", tag: "", folder: "work", type: "" }, "Folder")).toBe("work");
  });

  it("returns an empty string when source is Tag but no tag filter is set", () => {
    expect(excerptQueryFor({ text: "", tag: "", folder: "", type: "" }, "Tag")).toBe("");
  });

  it("returns an empty string when source is Folder but no folder filter is set", () => {
    expect(excerptQueryFor({ text: "", tag: "", folder: "", type: "" }, "Folder")).toBe("");
  });

  it("returns an empty string for other sources without a text query", () => {
    expect(excerptQueryFor({ text: "", tag: "", folder: "", type: "" }, "Content")).toBe("");
    expect(excerptQueryFor({ text: "", tag: "", folder: "", type: "" }, undefined)).toBe("");
  });
});
