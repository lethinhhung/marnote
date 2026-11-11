import { describe, expect, it } from "vitest";
import { parseSearchQuery, searchWorkspace } from "./search";
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

  it("matches note content and attributes Content source", () => {
    const contents = { "work/meeting-notes.md": "quarterly planning summary" };
    const results = searchWorkspace(entries, "quarterly", contents);
    expect(results.notes.map((n) => n.entry.name)).toEqual(["meeting-notes.md"]);
    expect(results.notes[0]?.source).toBe("Content");
  });
});
