import { describe, expect, it, vi } from "vitest";
import { buildSearchChoices } from "./buildSearchChoices.js";
import type { Entry, WorkspaceTree } from "./workspace.js";
import type { SearchFilter, SearchResults } from "./search.js";

function fileEntry(name: string, path: string): Entry {
  return { name, path, kind: "file" };
}

function folderEntry(name: string, path: string): Entry {
  return { name, path, kind: "directory" };
}

function noteMatch(entry: Entry, source = "Title", excerpt = ""): { entry: Entry; excerpt: string; score: number; source: string } {
  return { entry, excerpt, score: 100, source };
}

const baseTree: WorkspaceTree = { name: "", path: "", entries: [] };

const defaults = {
  matches: { notes: [], folders: [], tags: [] } as SearchResults,
  trimmed: "",
  createTitle: "",
  parsedQuery: { text: "", tag: "", folder: "", type: "" } as SearchFilter,
  tree: null as WorkspaceTree | null,
  currentPath: "",
  onSelect: vi.fn(),
  onCreate: vi.fn(),
  onCapture: vi.fn(),
  onCopy: vi.fn(),
  onTagSelect: vi.fn(),
};

function runChoices(overrides: Record<string, unknown> = {}): ReturnType<typeof buildSearchChoices> {
  return buildSearchChoices({ ...defaults, ...overrides } as Parameters<typeof buildSearchChoices>[0]);
}

describe("buildSearchChoices", () => {
  it("returns an empty array for empty input", () => {
    expect(runChoices()).toEqual([]);
  });

  it("builds note choices limited to six", () => {
    const notes = Array.from({ length: 8 }, (_, i) => noteMatch(fileEntry(`Note ${i}.md`, `notes/${i}.md`)));
    const choices = runChoices({ matches: { notes, folders: [], tags: [] } });
    const noteChoices = choices.filter((c) => c.type === "note");
    expect(noteChoices).toHaveLength(6);
    expect(noteChoices[0]).toMatchObject({
      id: "notes/0.md",
      label: "Note 0.md",
      subtitle: "notes/0.md",
      type: "note",
      excerpt: "",
      source: "Title",
    });
    expect(typeof noteChoices[0].run).toBe("function");
    noteChoices[0].run?.();
    expect(defaults.onSelect).toHaveBeenCalledWith(fileEntry("Note 0.md", "notes/0.md"));
  });

  it("builds folder choices limited to three", () => {
    const folders = [folderEntry("a", "a"), folderEntry("b", "b"), folderEntry("c", "c"), folderEntry("d", "d")];
    const choices = runChoices({ matches: { notes: [], folders, tags: [] } });
    const folderChoices = choices.filter((c) => c.type === "folder");
    expect(folderChoices).toHaveLength(3);
    expect(folderChoices.map((c) => c.label)).toEqual(["a", "b", "c"]);
  });

  it("includes Quick Capture command only when a tree is provided", () => {
    const withoutTree = runChoices({ trimmed: "quick" });
    expect(withoutTree.some((c) => c.label === "Quick Capture new note…")).toBe(false);

    const withTree = runChoices({ trimmed: "quick", tree: baseTree });
    expect(withTree.some((c) => c.label === "Quick Capture new note…")).toBe(true);
    const capture = withTree.find((c) => c.label === "Quick Capture new note…");
    capture?.run?.();
    expect(defaults.onCapture).toHaveBeenCalled();
  });

  it("includes copy commands only when a current path is provided", () => {
    const withoutPath = runChoices({ trimmed: "copy" });
    expect(withoutPath.some((c) => c.label === "Copy internal link to note")).toBe(false);

    const withPath = runChoices({ trimmed: "copy", currentPath: "notes/start.md" });
    const link = withPath.find((c) => c.label === "Copy internal link to note");
    link?.run?.();
    expect(defaults.onCopy).toHaveBeenCalledWith("link");

    const relative = withPath.find((c) => c.label === "Copy relative path");
    relative?.run?.();
    expect(defaults.onCopy).toHaveBeenCalledWith("relative-path");

    const full = withPath.find((c) => c.label === "Copy full path");
    full?.run?.();
    expect(defaults.onCopy).toHaveBeenCalledWith("full-path");
  });

  it("filters commands by the trimmed query case-insensitively", () => {
    const all = runChoices({ currentPath: "x", tree: baseTree });
    const filtered = runChoices({ currentPath: "x", tree: baseTree, trimmed: "relative" });
    expect(filtered.some((c) => c.label === "Copy relative path")).toBe(true);
    expect(filtered.some((c) => c.label === "Copy full path")).toBe(false);
    expect(filtered.length).toBeLessThan(all.length);
  });

  it("builds tag choices limited to six with counts and runs onTagSelect", () => {
    const tags = Array.from({ length: 8 }, (_, i) => ({ name: `tag ${i}`, count: i + 1 }));
    const choices = runChoices({ matches: { notes: [], folders: [], tags } });
    const tagChoices = choices.filter((c) => c.type === "tag");
    expect(tagChoices).toHaveLength(6);
    expect(tagChoices[0]).toMatchObject({ id: "tag:tag 0", label: "#tag 0", count: 1, type: "tag" });
    tagChoices[0].run?.();
    expect(defaults.onTagSelect).toHaveBeenCalledWith("tag 0");
  });

  it("adds a create new note choice when all conditions are met", () => {
    const choices = runChoices({ tree: baseTree, createTitle: "My Note" });
    const create = choices.find((c) => c.type === "create");
    expect(create).toBeDefined();
    expect(create?.label).toBe('Create new note “My Note”');
    create?.run?.();
    expect(defaults.onCreate).toHaveBeenCalledWith("My Note");
  });

  it("does not add a create choice when a tag filter is active", () => {
    const choices = runChoices({ tree: baseTree, createTitle: "My Note", parsedQuery: { text: "", tag: "work", folder: "", type: "" } });
    expect(choices.some((c) => c.type === "create")).toBe(false);
  });

  it("does not add a create choice when the title contains a path separator", () => {
    const choices = runChoices({ tree: baseTree, createTitle: "folder/note" });
    expect(choices.some((c) => c.type === "create")).toBe(false);
  });

  it("does not add a create choice when the title is too long", () => {
    const choices = runChoices({ tree: baseTree, createTitle: "a".repeat(100) });
    expect(choices.some((c) => c.type === "create")).toBe(false);
  });

  it("does not add a create choice when a note with the same name already exists", () => {
    const choices = runChoices({
      tree: baseTree,
      createTitle: "existing",
      matches: { notes: [noteMatch(fileEntry("existing.md", "existing.md"))], folders: [], tags: [] },
    });
    expect(choices.some((c) => c.type === "create")).toBe(false);
  });

  it("does not add a create choice when the title looks like an incomplete filter", () => {
    const choices = runChoices({ tree: baseTree, createTitle: "tag:work" });
    expect(choices.some((c) => c.type === "create")).toBe(false);
  });

  it("does not add a create choice when a folder filter is active", () => {
    const choices = runChoices({ tree: baseTree, createTitle: "My Note", parsedQuery: { text: "", tag: "", folder: "work", type: "" } });
    expect(choices.some((c) => c.type === "create")).toBe(false);
  });

  it("does not add a create choice when a type filter is active", () => {
    const choices = runChoices({ tree: baseTree, createTitle: "My Note", parsedQuery: { text: "", tag: "", folder: "", type: "note" } });
    expect(choices.some((c) => c.type === "create")).toBe(false);
  });

  it("does not add a create choice when no workspace tree is provided", () => {
    const choices = runChoices({ createTitle: "My Note" });
    expect(choices.some((c) => c.type === "create")).toBe(false);
  });

  it("does not add a create choice when the title is empty", () => {
    const choices = runChoices({ tree: baseTree, createTitle: "" });
    expect(choices.some((c) => c.type === "create")).toBe(false);
  });
});
