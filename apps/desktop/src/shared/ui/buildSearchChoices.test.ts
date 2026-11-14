import { describe, expect, it, vi } from "vitest";
import { buildSearchChoices, type Choice } from "./buildSearchChoices";
import type { Entry, WorkspaceTree } from "../domain/workspace";
import type { SearchResults } from "./searchNotes";

const note: Entry = { name: "Meeting.md", path: "Notes/Meeting.md", kind: "file", modifiedMs: 1 };
const folder: Entry = { name: "Notes", path: "Notes", kind: "directory" };
const tree: WorkspaceTree = { name: "Workspace", path: "/workspace", entries: [folder] };

const matches: SearchResults = {
  notes: [{ entry: note, excerpt: "Meeting", score: 100, source: "Title" }],
  folders: [folder],
  tags: [{ name: "work", count: 2 }],
};

const base = {
  matches,
  trimmed: "",
  createTitle: "",
  parsedQuery: { text: "", tag: "", folder: "", type: "" },
  tree,
  currentPath: "Notes/Current.md",
  onSelect: vi.fn(),
  onCreate: vi.fn(),
  onCapture: vi.fn(),
  onCopy: vi.fn(),
  onTagSelect: vi.fn(),
};

describe("buildSearchChoices", () => {
  it("builds note choices that run onSelect", () => {
    const choices = buildSearchChoices(base) as Choice[];
    const noteChoice = choices.find((c) => c.type === "note");
    expect(noteChoice?.label).toBe("Meeting.md");
    expect(noteChoice?.subtitle).toBe("Notes/Meeting.md");
    expect(noteChoice?.source).toBe("Title");
    expect(noteChoice?.entry).toBe(note);
    noteChoice?.run();
    expect(base.onSelect).toHaveBeenCalledWith(note);
  });

  it("builds folder choices that run onSelect", () => {
    const choices = buildSearchChoices(base) as Choice[];
    const folderChoice = choices.find((c) => c.type === "folder");
    expect(folderChoice?.label).toBe("Notes");
    expect(folderChoice?.entry).toBe(folder);
    folderChoice?.run();
    expect(base.onSelect).toHaveBeenCalledWith(folder);
  });

  it("limits notes to six and folders to three", () => {
    const manyNotes: SearchResults = {
      notes: Array.from({ length: 10 }, (_, i) => ({ entry: { ...note, path: `Notes/N${i}.md`, name: `N${i}.md` }, excerpt: "", score: 1, source: "Title" })),
      folders: Array.from({ length: 5 }, (_, i) => ({ ...folder, path: `D${i}`, name: `D${i}` })),
      tags: [],
    };
    const choices = buildSearchChoices({ ...base, matches: manyNotes });
    expect(choices.filter((c) => c.type === "note")).toHaveLength(6);
    expect(choices.filter((c) => c.type === "folder")).toHaveLength(3);
  });

  it("includes capture command only when a tree is present", () => {
    const withTree = buildSearchChoices({ ...base, tree }) as Choice[];
    expect(withTree.some((c) => c.type === "command" && c.label.startsWith("Quick"))).toBe(true);
    const noTree = buildSearchChoices({ ...base, tree: null }) as Choice[];
    expect(noTree.some((c) => c.type === "command" && c.label.startsWith("Quick"))).toBe(false);
  });

  it("includes copy commands only when a current path is present", () => {
    const withPath = buildSearchChoices({ ...base, currentPath: "Notes/Current.md" }) as Choice[];
    expect(withPath.some((c) => c.type === "command" && c.label === "Copy internal link to note")).toBe(true);
    const noPath = buildSearchChoices({ ...base, currentPath: "" }) as Choice[];
    expect(noPath.some((c) => c.type === "command" && c.label === "Copy internal link to note")).toBe(false);
  });

  it("filters commands by the trimmed query", () => {
    const choices = buildSearchChoices({ ...base, trimmed: "relative" }) as Choice[];
    expect(choices.filter((c) => c.type === "command").map((c) => c.label)).toEqual(["Copy relative path"]);
  });

  it("builds tag choices that call onTagSelect", () => {
    const choices = buildSearchChoices(base) as Choice[];
    const tagChoice = choices.find((c) => c.type === "tag");
    expect(tagChoice?.label).toBe("#work");
    expect(tagChoice?.count).toBe(2);
    tagChoice?.run();
    expect(base.onTagSelect).toHaveBeenCalledWith("work");
  });

  it("adds a create choice for a valid new title", () => {
    const choices = buildSearchChoices({ ...base, createTitle: "New Note" }) as Choice[];
    const createChoice = choices.find((c) => c.type === "create");
    expect(createChoice?.label).toBe(`Create new note “New Note”`);
    createChoice?.run();
    expect(base.onCreate).toHaveBeenCalledWith("New Note");
  });

  it("omits the create choice when a note with the same title exists", () => {
    const choices = buildSearchChoices({ ...base, createTitle: "Meeting" }) as Choice[];
    expect(choices.find((c) => c.type === "create")).toBeUndefined();
  });

  it("omits the create choice when a filter or invalid title is set", () => {
    expect(buildSearchChoices({ ...base, createTitle: "New Note", parsedQuery: { ...base.parsedQuery, tag: "work" } }).find((c) => c.type === "create")).toBeUndefined();
    expect(buildSearchChoices({ ...base, createTitle: "a/b" }).find((c) => c.type === "create")).toBeUndefined();
    expect(buildSearchChoices({ ...base, createTitle: "x".repeat(101) }).find((c) => c.type === "create")).toBeUndefined();
    expect(buildSearchChoices({ ...base, createTitle: "" }).find((c) => c.type === "create")).toBeUndefined();
  });

  it("omits the create choice when createTitle looks like an incomplete filter", () => {
    expect(buildSearchChoices({ ...base, createTitle: "tag:" }).find((c) => c.type === "create")).toBeUndefined();
    expect(buildSearchChoices({ ...base, createTitle: "in:" }).find((c) => c.type === "create")).toBeUndefined();
    expect(buildSearchChoices({ ...base, createTitle: "type:" }).find((c) => c.type === "create")).toBeUndefined();
    expect(buildSearchChoices({ ...base, createTitle: "tag:something" }).find((c) => c.type === "create")).toBeUndefined();
  });
});
