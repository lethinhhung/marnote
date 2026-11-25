import { describe, expect, it } from "vitest";
import { parseSearchQuery, searchWorkspace } from "./search";
import type { Entry } from "./workspace";

const entry = (overrides: Partial<Entry>): Entry => ({
  name: "Note.md",
  path: "Notes/Note.md",
  kind: "file",
  modifiedMs: 0,
  ...overrides,
});

const notes: Entry[] = [
  entry({ name: "Meeting.md", path: "Work/Meeting.md" }),
  entry({ name: "Plan.md", path: "Work/Plan.md" }),
  entry({ name: "Sub.md", path: "Work/Subfolder/Sub.md" }),
];

describe("trailing slash in in: filter", () => {
  it("parses in:work/ as folder work (without trailing slash)", () => {
    expect(parseSearchQuery("in:work/")).toEqual({ text: "", tag: "", folder: "work", type: "" });
  });

  it("matches folder with in:work/ query", () => {
    const results = searchWorkspace(notes, "in:work/");
    expect(results.notes.map((n) => n.entry.name).sort()).toEqual(["Meeting.md", "Plan.md", "Sub.md"]);
  });

  it("matches folder with in:work query", () => {
    const results = searchWorkspace(notes, "in:work");
    expect(results.notes.map((n) => n.entry.name).sort()).toEqual(["Meeting.md", "Plan.md", "Sub.md"]);
  });

  it("parses in:work/subfolder/ as folder work/subfolder (without trailing slash)", () => {
    expect(parseSearchQuery("in:work/subfolder/")).toEqual({ text: "", tag: "", folder: "work/subfolder", type: "" });
  });

  it("matches nested folder with in:work/subfolder/ query", () => {
    const results = searchWorkspace(notes, "in:work/subfolder/");
    expect(results.notes.map((n) => n.entry.name)).toEqual(["Sub.md"]);
  });

  it("matches nested folder with in:work/subfolder query", () => {
    const results = searchWorkspace(notes, "in:work/subfolder");
    expect(results.notes.map((n) => n.entry.name)).toEqual(["Sub.md"]);
  });

  it("handles multiple trailing slashes", () => {
    expect(parseSearchQuery("in:work///")).toEqual({ text: "", tag: "", folder: "work", type: "" });
    const results = searchWorkspace(notes, "in:work///");
    expect(results.notes.map((n) => n.entry.name).sort()).toEqual(["Meeting.md", "Plan.md", "Sub.md"]);
  });
});
